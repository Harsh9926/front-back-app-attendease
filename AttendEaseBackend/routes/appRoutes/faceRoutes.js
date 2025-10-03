const express = require("express");
const router = express.Router();
const {
  rekognition,
  s3,
  IndexFacesCommand,
  DeleteObjectCommand,
} = require("../../config/awsConfig");
const pool = require("../../config/db");
const upload = require("../../middleware/upload");

router.post("/store-face", upload.single("image"), async (req, res) => {
  try {
    // Validate input
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Configure Rekognition parameters
    const rekognitionParams = {
      CollectionId: process.env.REKOGNITION_COLLECTION,
      Image: {
        S3Object: {
          Bucket: process.env.S3_BUCKET_NAME,
          Name: req.file.key,
        },
      },
      ExternalImageId: userId.toString(),
      DetectionAttributes: ["DEFAULT"],
      MaxFaces: 1,
      QualityFilter: "HIGH",
    };

    // Index face in Rekognition
    const command = new IndexFacesCommand(rekognitionParams);
    const rekognitionResponse = await rekognition.send(command);

    // Handle face detection results
    if (
      !rekognitionResponse.FaceRecords ||
      rekognitionResponse.FaceRecords.length === 0
    ) {
      // Cleanup if no face detected
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
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

    // Process successful face detection
    const faceRecord = rekognitionResponse.FaceRecords[0];
    const faceId = faceRecord.Face.FaceId;
    const confidence = faceRecord.Face.Confidence;

    // Store reference in database
    await pool.query(
      `UPDATE employee SET
       face_embedding = $2,
       face_confidence = $3,
       face_id = $4
       WHERE emp_id = $1`,
      [userId, req.file.key, confidence, faceId]
    );

    res.json({
      success: true,
      faceId: faceId,
      imageUrl: req.file.location,
      confidence: confidence,
    });
  } catch (error) {
    console.error("Face processing error:", error);

    // Attempt to clean up uploaded file if error occurred
    if (req.file?.key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
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
