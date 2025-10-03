const express = require("express");
const router = express.Router();
const pool = require("../../config/db");

router.get("/", async (req, res) => {
  try {
    const { empId, month } = req.query;

    if (!month) {
      return res.status(400).json({ error: "Month and year are required." });
    }

    const query = `
            SELECT e.emp_id AS "empId",
       e.emp_code as "empCode", 
       e.name AS "name", 
       e.phone AS "phone", 
       w.ward_name AS "ward", 
       z.zone_name AS "zone", 
       c.city_name AS "city", 
       c.state AS "state", 
	     e.face_id as "faceId",
       COUNT(CASE WHEN a.punch_in_time IS NOT NULL THEN a.attendance_id END) AS "totalAttendance"
FROM employee e
JOIN wards w ON e.ward_id = w.ward_id
JOIN zones z ON w.zone_id = z.zone_id
JOIN cities c ON z.city_id = c.city_id
LEFT JOIN attendance a ON e.emp_id = a.emp_id 
    AND TO_CHAR(a.date, 'yyyy-MM') = $1
WHERE e.emp_id = $2
GROUP BY e.emp_id, w.ward_name, z.zone_name, c.city_name, c.state;
        `;

    const { rows } = await pool.query(query, [month, empId]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Employee not found or no attendance records." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
