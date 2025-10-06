const express = require("express");
const router = express.Router();
const {
  rekognition,
  s3,
  IndexFacesCommand,
  CreateCollectionCommand,
  DeleteObjectCommand,
} = require("../../config/awsConfig");
const pool = require("../../config/db");
const upload = require("../../middleware/upload");

const bucketName = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;

const normalizeId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveCollectionId = () => {
  const id =
    (process.env.REKOGNITION_COLLECTION || "").trim() ||
    (process.env.REKOGNITION_COLLECTION_ID || "").trim();
  return id || null;
};

let collectionReady = false;

const ensureCollectionExists = async (collectionId) => {
  if (collectionReady) {
    return;
  }

  try {
    await rekognition.send(
      new CreateCollectionCommand({
        CollectionId: collectionId,
      })
    );
    console.log(`Created Rekognition collection "${collectionId}".`);
  } catch (error) {
    if (error.name === "ResourceAlreadyExistsException") {
      // Collection already present; carry on.
      console.log(`Rekognition collection "${collectionId}" already exists.`);
    } else {
      throw error;
    }
  }

  collectionReady = true;
};

router.post("/store-face", upload.single("image"), async (req, res) => {
  try {
    const { userId: rawUserId, emp_id: rawEmpId, employeeId: rawEmployeeId } = req.body;

    const normalizedUserId = normalizeId(rawUserId);
    const normalizedEmpId = normalizeId(rawEmpId ?? rawEmployeeId);

    if (normalizedUserId === null && normalizedEmpId === null) {
      return res.status(400).json({
        error: "User or employee identifier is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const candidateEmpIds = [normalizedEmpId, normalizedUserId].filter(
      (value, index, array) => value !== null && array.indexOf(value) === index
    );

    let targetEmployeeId = null;

    for (const candidate of candidateEmpIds) {
      try {
        const result = await pool.query(
          "SELECT emp_id FROM employee WHERE emp_id = $1",
          [candidate]
        );

        if (result.rows.length > 0) {
          targetEmployeeId = result.rows[0].emp_id;
          break;
        }
      } catch (lookupError) {
        console.error("Employee lookup error:", lookupError);
      }
    }

    if (!targetEmployeeId) {
      return res.status(404).json({
        error: "Employee not found",
        details: "Provide a valid employee identifier when storing face data.",
      });
    }

    const collectionId = resolveCollectionId();
    if (!collectionId) {
      console.error("Face processing error: Rekognition collection ID is not configured");
      return res.status(500).json({
        error: "Error processing face data",
        details:
          "AWS Rekognition collection is not configured. Set REKOGNITION_COLLECTION in the backend .env file.",
      });
    }

    await ensureCollectionExists(collectionId);

    const rekognitionParams = {
      CollectionId: collectionId,
      Image: {
        S3Object: {
          Bucket: bucketName,
          Name: req.file.key,
        },
      },
      ExternalImageId: targetEmployeeId.toString(),
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 1,
      QualityFilter: "HIGH",
    };

    const command = new IndexFacesCommand(rekognitionParams);
    const rekognitionResponse = await rekognition.send(command);

    if (
      !rekognitionResponse.FaceRecords ||
      rekognitionResponse.FaceRecords.length === 0
    ) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: req.file.key,
      });
      await s3.send(deleteCommand);

      return res.status(400).json({
        error: "No face detected",
        details:
          rekognitionResponse.UnindexedFaces?.[0]?.Reasons?.join(", ") ||
          "Unknown reason",
      });
    }

    const faceRecord = rekognitionResponse.FaceRecords[0];
    const faceId = faceRecord.Face.FaceId;
    const confidence = faceRecord.Face.Confidence;

    const updateResult = await pool.query(
      `UPDATE employee SET
         face_embedding = $2,
         face_confidence = $3,
         face_id = $4
       WHERE emp_id = $1
       RETURNING emp_id`,
      [targetEmployeeId, req.file.key, confidence, faceId]
    );

    if (updateResult.rowCount === 0) {
      throw new Error("Unable to update employee face metadata");
    }

    res.json({
      success: true,
      faceId,
      imageUrl: req.file.location,
      confidence,
      empId: updateResult.rows[0].emp_id,
    });
  } catch (error) {
    console.error("Face processing error:", error);

    if (req.file?.key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: req.file.key,
        });
        await s3.send(deleteCommand);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }

    res.status(500).json({
      error: "Error processing face data",
      details: error.message,
    });
  }
});

module.exports = router;
