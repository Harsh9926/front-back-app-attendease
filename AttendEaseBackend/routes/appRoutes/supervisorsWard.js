const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const authenticate = require("../../middleware/authenticate");

// GET endpoint for mobile app (uses JWT token)
router.get("/", authenticate, async (req, res) => {
  const user_id = req.user.user_id;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const result = await pool.query(
      `SELECT
        e.emp_id,
        e.name AS employee_name,
        e.emp_code,
        e.phone,
        w.ward_id,
        w.ward_name,
        z.zone_id,
        z.zone_name,
        c.city_id,
        c.city_name,
        d.designation_name,
        dept.department_name,
        CASE
            WHEN a.emp_id IS NULL OR a.punch_in_time IS NULL THEN 'Not Marked'
            WHEN a.punch_out_time IS NULL THEN 'Present'
            ELSE 'Marked'
        END AS attendance_status
    FROM employee e
    JOIN wards w ON e.ward_id = w.ward_id
    JOIN zones z ON w.zone_id = z.zone_id
    JOIN cities c ON z.city_id = c.city_id
    JOIN supervisor_ward sw ON w.ward_id = sw.ward_id
    JOIN users u ON sw.supervisor_id = u.user_id
    JOIN designation d ON e.designation_id = d.designation_id
    JOIN department dept ON d.department_id = dept.department_id
    LEFT JOIN attendance a
        ON e.emp_id = a.emp_id
        AND a.date = CURRENT_DATE
    WHERE u.user_id = $1
    ORDER BY w.ward_id, e.name;
`,
      [user_id]
    );

    const rows = result.rows;

    // Transform the data into the required JSON format
    const wardMap = {};

    rows.forEach((row) => {
      const wardId = row.ward_id;

      if (!wardMap[wardId]) {
        // Create a new ward entry
        wardMap[wardId] = {
          ward_id: row.ward_id,
          ward_name: row.ward_name,
          city: row.city_name,
          zone: row.zone_name,
          employees: [],
        };
      }

      // Add employee details to the respective ward
      wardMap[wardId].employees.push({
        emp_id: row.emp_id,
        emp_name: row.employee_name,
        emp_code: row.emp_code,
        phone: row.phone,
        designation: row.designation_name,
        department: row.department_name,
        attendance_status: row.attendance_status,
      });
    });

    // Convert wardMap object to an array of ward objects
    const response = Object.values(wardMap);

    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching employee data: ", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// POST endpoint for web app (backward compatibility)
router.post("/", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const result = await pool.query(
      `SELECT
        e.emp_id,
        e.name AS employee_name,
        e.emp_code,
        e.phone,
        w.ward_id,
        w.ward_name,
        z.zone_id,
        z.zone_name,
        c.city_id,
        c.city_name,
        d.designation_name,
        dept.department_name,
        CASE
            WHEN a.emp_id IS NULL OR a.punch_in_time IS NULL THEN 'Not Marked'
            WHEN a.punch_out_time IS NULL THEN 'Present'
            ELSE 'Marked'
        END AS attendance_status
    FROM employee e
    JOIN wards w ON e.ward_id = w.ward_id
    JOIN zones z ON w.zone_id = z.zone_id
    JOIN cities c ON z.city_id = c.city_id
    JOIN supervisor_ward sw ON w.ward_id = sw.ward_id
    JOIN users u ON sw.supervisor_id = u.user_id
    JOIN designation d ON e.designation_id = d.designation_id
    JOIN department dept ON d.department_id = dept.department_id
    LEFT JOIN attendance a
        ON e.emp_id = a.emp_id
        AND a.date = CURRENT_DATE
    WHERE u.user_id = $1
    ORDER BY w.ward_id, e.name;
`,
      [user_id]
    );

    const rows = result.rows;

    // Transform the data into the required JSON format
    const wardMap = {};

    rows.forEach((row) => {
      const wardId = row.ward_id;

      if (!wardMap[wardId]) {
        // Create a new ward entry
        wardMap[wardId] = {
          ward_id: row.ward_id,
          ward_name: row.ward_name,
          city: row.city_name,
          zone: row.zone_name,
          employees: [],
        };
      }

      // Add employee details to the respective ward
      wardMap[wardId].employees.push({
        emp_id: row.emp_id,
        emp_name: row.employee_name,
        emp_code: row.emp_code,
        phone: row.phone,
        designation: row.designation_name,
        department: row.department_name,
        attendance_status: row.attendance_status,
      });
    });

    // Convert wardMap object to an array of ward objects
    const response = Object.values(wardMap);

    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching employee data: ", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
