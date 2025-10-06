const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const authenticate = require("../../middleware/authenticate");

const resolveDateRange = (rawStart, rawEnd) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (value, fallback) => {
    if (!value) {
      return new Date(fallback.getTime());
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(fallback.getTime());
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };

  let startDate = parseDate(rawStart, today);
  let endDate = parseDate(rawEnd, today);

  if (startDate > endDate) {
    const swap = startDate;
    startDate = endDate;
    endDate = swap;
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

const mapRowsToWards = (rows) => {
  const wardMap = {};

  rows.forEach((row) => {
    const wardId = row.ward_id;

    if (!wardMap[wardId]) {
      wardMap[wardId] = {
        ward_id: row.ward_id,
        ward_name: row.ward_name,
        city: row.city_name,
        zone: row.zone_name,
        employees: [],
      };
    }

    wardMap[wardId].employees.push({
      emp_id: row.emp_id,
      emp_name: row.employee_name,
      emp_code: row.emp_code,
      phone: row.phone,
      designation: row.designation_name,
      department: row.department_name,
      attendance_status: row.attendance_status,
      days_present: Number(row.days_present ?? 0),
      days_marked: Number(row.days_marked ?? 0),
    });
  });

  return Object.values(wardMap);
};

const fetchSupervisorEmployees = async (userId, startDate, endDate) => {
  const query = `
    SELECT
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
          WHEN summary.days_present IS NULL OR summary.days_present = 0 THEN 'Not Marked'
          WHEN summary.days_present > summary.days_marked THEN 'Present'
          ELSE 'Marked'
      END AS attendance_status,
      COALESCE(summary.days_present, 0) AS days_present,
      COALESCE(summary.days_marked, 0) AS days_marked
    FROM employee e
    JOIN wards w ON e.ward_id = w.ward_id
    JOIN zones z ON w.zone_id = z.zone_id
    JOIN cities c ON z.city_id = c.city_id
    JOIN supervisor_ward sw ON w.ward_id = sw.ward_id
    JOIN users u ON sw.supervisor_id = u.user_id
    JOIN designation d ON e.designation_id = d.designation_id
    JOIN department dept ON d.department_id = dept.department_id
    LEFT JOIN (
      SELECT
        emp_id,
        COUNT(*) FILTER (WHERE punch_in_time IS NOT NULL) AS days_present,
        COUNT(*) FILTER (WHERE punch_out_time IS NOT NULL) AS days_marked
      FROM attendance
      WHERE date BETWEEN $2 AND $3
      GROUP BY emp_id
    ) summary ON summary.emp_id = e.emp_id
    WHERE u.user_id = $1
    ORDER BY w.ward_id, e.name;
  `;

  const result = await pool.query(query, [userId, startDate, endDate]);
  return mapRowsToWards(result.rows);
};

// GET endpoint for mobile app (uses JWT token)
router.get("/", authenticate, async (req, res) => {
  const user_id = req.user.user_id;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const { startDate: startDateRaw, endDate: endDateRaw } = req.query;
    const { startDate, endDate } = resolveDateRange(startDateRaw, endDateRaw);
    const response = await fetchSupervisorEmployees(user_id, startDate, endDate);

    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching employee data: ", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// POST endpoint for web app (backward compatibility)
router.post("/", async (req, res) => {
  const { user_id, startDate: startDateRaw, endDate: endDateRaw } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const { startDate, endDate } = resolveDateRange(startDateRaw, endDateRaw);
    const response = await fetchSupervisorEmployees(user_id, startDate, endDate);

    res.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching employee data: ", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
