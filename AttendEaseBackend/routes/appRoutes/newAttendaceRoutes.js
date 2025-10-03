const express = require("express");
const axios = require("axios");
const router = express.Router();
const pool = require("../../config/db");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { uploadImageToB2 } = require("../../utils/b2Storage");

const { rekognition } = require("../../config/awsConfig");
const { SearchFacesByImageCommand } = require("@aws-sdk/client-rekognition");

// Constants
const PUNCH_TYPES = {
  IN: "IN",
  OUT: "OUT",
};

// Set up Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Utility functions
function formatDate(date = new Date()) {
  const istOffset = 5.5 * 60; // IST is UTC + 5.5 hours in minutes
  const localDate = new Date(date.getTime() + istOffset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

async function getOrCreateAttendanceRecord(emp_id, date) {
  if (!emp_id) throw new Error("Employee ID is required");

  // Check if attendance record exists
  const result = await pool.query(
    `SELECT a.attendance_id, CAST(a.date AS VARCHAR) AS date, 
            TO_CHAR(a.punch_in_time, 'HH12:MI AM') AS punch_in_time, 
            TO_CHAR(a.punch_out_time, 'HH12:MI AM') AS punch_out_time, 
            a.duration, a.punch_in_image, a.punch_out_image, 
            a.latitude_in, a.longitude_in, a.in_address, 
            a.latitude_out, a.longitude_out, a.out_address,
            e.emp_id, e.emp_code, e.name AS employee_name, 
            d.designation_name, w.ward_id, w.ward_name
     FROM attendance a
     JOIN employee e ON a.emp_id = e.emp_id
     JOIN designation d ON e.designation_id = d.designation_id
     JOIN wards w ON e.ward_id = w.ward_id
     WHERE a.emp_id = $1 AND a.date = $2`,
    [emp_id, date]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const wardDetail = await pool.query(
    `SELECT ward_id from employee e where e.emp_id = $1`,
    [emp_id]
  );
  let ward_id;
  if (wardDetail.rows.length > 0) {
    ward_id = wardDetail.rows[0].ward_id;
  }

  // Create new record if not exists
  const insertResult = await pool.query(
    `INSERT INTO attendance (emp_id, date, ward_id) 
     VALUES ($1, CURRENT_DATE, $2) 
     RETURNING attendance_id, date, ward_id`,
    [emp_id, ward_id]
  );

  const attendance = {
    attendance_id: insertResult.rows[0].attendance_id,
    date: date,
    punch_in_time: null,
    punch_out_time: null,
    duration: null,
    punch_in_image: null,
    punch_out_image: null,
    latitude_in: null,
    longitude_in: null,
    in_address: null,
    latitude_out: null,
    longitude_out: null,
    out_address: null,
    emp_id,
    emp_code: null,
    employee_name: null,
    designation_name: null,
    ward_id: insertResult.rows[0].ward_id,
    ward_name: null,
  };

  // Fetch employee details
  const empDetails = await pool.query(
    `SELECT emp_code, name AS employee_name, d.designation_name, w.ward_name
     FROM employee e
     JOIN designation d ON e.designation_id = d.designation_id
     JOIN wards w ON e.ward_id = w.ward_id
     WHERE e.emp_id = $1`,
    [emp_id]
  );

  if (empDetails.rows.length > 0) {
    Object.assign(attendance, empDetails.rows[0]);
  }

  return attendance;
}

async function processPunch(
  attendanceId,
  punchType,
  imageFile,
  userId,
  locationData
) {
  let imageUrl = null;

  if (imageFile) {
    imageUrl = await uploadImageToB2(
      imageFile.buffer,
      `attendance_${attendanceId}_${punchType}.jpg`
    );
  }

  const isPunchIn = punchType === PUNCH_TYPES.IN;
  const updateQuery = `
    UPDATE attendance SET 
      ${isPunchIn ? "punch_in_time" : "punch_out_time"} = NOW(),
      ${isPunchIn ? "latitude_in" : "latitude_out"} = $1,
      ${isPunchIn ? "longitude_in" : "longitude_out"} = $2,
      ${isPunchIn ? "in_address" : "out_address"} = $3,
      ${isPunchIn ? "punch_in_image" : "punch_out_image"} = $4,
      ${isPunchIn ? "punched_in_by" : "punched_out_by"} = $5
    WHERE attendance_id = $6
    RETURNING *
  `;

  const result = await pool.query(updateQuery, [
    locationData.latitude,
    locationData.longitude,
    locationData.address,
    imageUrl,
    userId,
    attendanceId,
  ]);

  if (result.rowCount === 0) {
    throw new Error("Attendance update failed");
  }

  return result.rows[0];
}

// Routes
router.post("/", async (req, res) => {
  const { emp_id } = req.body;
  const attendanceDate = formatDate();

  try {
    const attendance = await getOrCreateAttendanceRecord(
      emp_id,
      attendanceDate
    );
    res.json(attendance);
  } catch (error) {
    console.error("Error in attendance route: ", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/", upload.single("image"), async (req, res) => {
  const { attendance_id, punch_type, latitude, longitude, address, userId } =
    req.body;

  if (!attendance_id || !punch_type || !latitude || !longitude || !address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Validate punch conditions
    const attendance = await pool.query(
      `SELECT punch_in_time, punch_out_time FROM attendance WHERE attendance_id = $1`,
      [attendance_id]
    );

    if (attendance.rows.length === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    const { punch_in_time, punch_out_time } = attendance.rows[0];

    if (punch_type === PUNCH_TYPES.IN && punch_in_time) {
      return res.status(400).json({ error: "Already punched in today" });
    }
    if (punch_type === PUNCH_TYPES.OUT && punch_out_time) {
      return res.status(400).json({ error: "Already punched out today" });
    }
    if (punch_type === PUNCH_TYPES.OUT && !punch_in_time) {
      return res.status(400).json({ error: "Must punch in first" });
    }

    const updated = await processPunch(
      attendance_id,
      punch_type,
      req.file,
      userId,
      {
        latitude,
        longitude,
        address,
      }
    );

    res.json({
      message: `Punch ${punch_type} updated successfully`,
      attendance: updated,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/image", async (req, res) => {
  const { attendance_id, punch_type } = req.query;

  if (!attendance_id || !punch_type) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const imageColumn =
      punch_type.toUpperCase() === PUNCH_TYPES.IN
        ? "punch_in_image"
        : "punch_out_image";

    const result = await pool.query(
      `SELECT ${imageColumn} AS image_url FROM attendance WHERE attendance_id = $1`,
      [attendance_id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_url) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imageUrl = result.rows[0].image_url;

    if (imageUrl.startsWith("/uploads/")) {
      const relativePath = imageUrl.replace(/^\//, "");
      const filePath = path.join(__dirname, "../../", relativePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Image not found" });
      }

      res.set({
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="attendance_${attendance_id}_${punch_type}.jpg"`,
      });

      return fs.createReadStream(filePath).pipe(res);
    }

    const isB2Image = imageUrl.includes("backblazeb2.com");

    if (isB2Image) {
      const authResponse = await axios.post(
        "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
        {},
        {
          auth: {
            username: process.env.B2_APPLICATION_KEY_ID,
            password: process.env.B2_APPLICATION_KEY,
          },
        }
      );

      const imageResponse = await axios.get(imageUrl, {
        headers: { Authorization: authResponse.data.authorizationToken },
        responseType: "stream",
      });

      res.set({
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="attendance_${attendance_id}_${punch_type}.jpg"`,
      });

      imageResponse.data.pipe(res);
    }

    const imageResponse = await axios.get(imageUrl, {
      responseType: "stream",
    });

    res.set({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="attendance_${attendance_id}_${punch_type}.jpg"`,
    });

    imageResponse.data.pipe(res);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/face-attendance", upload.single("image"), async (req, res) => {
  try {
    const { punch_type, latitude, longitude, userId, address } = req.body;

    // Face detection logic
    const searchParams = {
      CollectionId: process.env.REKOGNITION_COLLECTION,
      Image: { Bytes: req.file.buffer },
      MaxFaces: 1,
      FaceMatchThreshold: 90,
    };

    const command = new SearchFacesByImageCommand(searchParams);
    const result = await rekognition.send(command);

    if (!result.FaceMatches?.length) {
      return res.status(401).json({
        error: "No matching employee found",
        suggestion: "Use manual attendance if face recognition fails",
      });
    }

    const faceId = result.FaceMatches[0].Face.FaceId;
    const { rows } = await pool.query(
      "SELECT emp_id, name FROM employee WHERE face_id = $1",
      [faceId]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Employee not registered in system",
        solution: "Register face first via /store-face",
      });
    }

    const emp_id = rows[0].emp_id;
    const today = formatDate();
    const attendance = await getOrCreateAttendanceRecord(emp_id, today);

    // Validate punch conditions
    if (punch_type === PUNCH_TYPES.IN && attendance.punch_in_time) {
      return res.status(400).json({ error: "Already punched in today" });
    }
    if (punch_type === PUNCH_TYPES.OUT && attendance.punch_out_time) {
      return res.status(400).json({ error: "Already punched out today" });
    }
    if (punch_type === PUNCH_TYPES.OUT && !attendance.punch_in_time) {
      return res.status(400).json({ error: "Must punch in first" });
    }

    const updated = await processPunch(
      attendance.attendance_id,
      punch_type,
      req.file,
      userId,
      { latitude: latitude, longitude: longitude, address: address }
    );

    res.json({
      success: true,
      employee: rows[0].name,
      punch_type,
      time:
        punch_type === PUNCH_TYPES.IN
          ? updated.punch_in_time
          : updated.punch_out_time,
    });
  } catch (error) {
    res.status(500).json({
      error: "There are no faces in the image",
      fallback_route: "POST /attendance",
    });
  }
});

module.exports = router;
