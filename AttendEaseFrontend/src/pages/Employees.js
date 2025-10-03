import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/employees`;

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [wards, setWards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    emp_id: "",
    name: "",
    emp_code: "",
    phone: "",
    ward_id: "",
    designation_id: "",
    city: "",
    zone: "",
    ward: "",
    department: "",
    designation: "",
  });

  useEffect(() => {
    fetchEmployees();
    fetchDropdownData();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(apiUrl);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [citiesRes, zonesRes, wardsRes, departmentsRes, designationsRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/cities`),
          axios.get(`${API_BASE_URL}/api/zones`),
          axios.get(`${API_BASE_URL}/api/wards`),
          axios.get(`${API_BASE_URL}/api/departments`),
          axios.get(`${API_BASE_URL}/api/designations`),
        ]);

      setCities(citiesRes.data);
      setZones(zonesRes.data);

      // Format wards data to match the new nested structure
      const formattedWards = wardsRes.data.flatMap((city) =>
        city.zones.flatMap((zone) =>
          zone.wards.map((ward) => ({
            ward_id: ward.wardId,
            ward_name: ward.wardName,
            zone_id: zone.zoneId,
            city_id: city.cityId,
          }))
        )
      );
      setWards(formattedWards);

      setDepartments(departmentsRes.data);
      setDesignations(designationsRes.data);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const resetLabel = () => {
    setNewEmployee({
      emp_id: "",
      name: "",
      emp_code: "",
      phone: "",
      ward_id: "",
      designation_id: "",
      city: "",
      zone: "",
      ward: "",
      department: "",
      designation: "",
    });
    setIsEditing(null);
  };

  const addOrUpdateEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.emp_code.trim()) return;

    try {
      if (isEditing) {
        await axios.put(`${apiUrl}/${newEmployee.emp_id}`, newEmployee);
      } else {
        await axios.post(apiUrl, newEmployee);
      }
      fetchEmployees();
      resetLabel();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const deleteEmployee = async (emp_id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${apiUrl}/${emp_id}`);
      fetchEmployees();
      Swal.fire("Deleted!", "The Employee has been removed.", "success");
    } catch (error) {
      console.error("Error deleting employee:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const editEmployee = (emp) => {
    setNewEmployee({
      ...emp,
      city: cities.find((c) => c.city_name === emp.city)?.city_id || "",
      zone: zones.find((z) => z.zone_name === emp.zone)?.zone_id || "",
      ward_id: wards.find((w) => w.ward_name === emp.ward)?.ward_id || "",
      department:
        departments.find((de) => de.department_name === emp.department)
          ?.department_id || "",
      designation_id:
        designations.find((d) => d.designation_name === emp.designation)
          ?.designation_id || "",
    });
    setIsEditing(emp.emp_id);
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">👨‍💼 Employee Management</h1>

      {/* Employee Form */}
      <div className="border p-4 mb-4 bg-gray-100 shadow-md rounded">
        {isEditing && (
          <div>
            <label className="block mb-2">Employee ID (Auto-generated)</label>
            <input
              type="text"
              value={newEmployee.emp_id}
              disabled
              className="border p-2 w-full rounded bg-gray-200"
            />
          </div>
        )}

        {/* Two fields per row */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <label className="block">Name</label>
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block">Emp Code</label>
            <input
              type="text"
              value={newEmployee.emp_code}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, emp_code: e.target.value })
              }
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block">Phone</label>
            <input
              type="text"
              value={newEmployee.phone}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, phone: e.target.value })
              }
              className="border p-2 w-full rounded"
            />
          </div>

          <div>
            <label className="block">City</label>
            <select
              value={newEmployee.city}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  city: e.target.value,
                  zone: "",
                  ward_id: "",
                })
              }
              className="p-2 border rounded w-full"
            >
              <option value="" disabled>
                Select City
              </option>
              {cities.map((city) => (
                <option key={city.city_id} value={city.city_id}>
                  {city.city_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block">Zone</label>
            <select
              value={newEmployee.zone}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  zone: e.target.value,
                  ward_id: "",
                })
              }
              className="p-2 border rounded w-full"
              disabled={!newEmployee.city}
            >
              <option value="" disabled>
                Select Zone
              </option>
              {zones
                .filter((zone) => zone.city_id === parseInt(newEmployee.city))
                .map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.zone_name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block">Ward</label>
            <select
              value={newEmployee.ward_id}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  ward_id: e.target.value,
                })
              }
              className="p-2 border rounded w-full"
              disabled={!newEmployee.zone}
            >
              <option value="" disabled>
                Select Ward
              </option>
              {wards
                .filter((ward) => ward.zone_id === parseInt(newEmployee.zone))
                .map((ward) => (
                  <option key={ward.ward_id} value={ward.ward_id}>
                    {ward.ward_name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block">Department</label>
            <select
              value={newEmployee.department}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  department: e.target.value,
                  designation_id: "",
                })
              }
              className="p-2 border rounded w-full"
            >
              <option value="" disabled>
                Select Department
              </option>
              {departments.map((department) => (
                <option
                  key={department.department_id}
                  value={department.department_id}
                >
                  {department.department_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block">Designation</label>
            <select
              value={newEmployee.designation_id}
              onChange={(e) =>
                setNewEmployee({
                  ...newEmployee,
                  designation_id: e.target.value,
                })
              }
              className="p-2 border rounded w-full"
              disabled={!newEmployee.department}
            >
              <option value="" disabled>
                Select Designation
              </option>
              {designations
                .filter(
                  (designation) =>
                    designation.department_id ===
                    parseInt(newEmployee.department)
                )
                .map((designation) => (
                  <option
                    key={designation.designation_id}
                    value={designation.designation_id}
                  >
                    {designation.designation_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <button
          onClick={addOrUpdateEmployee}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow-md mt-4 mr-4"
        >
          {isEditing ? "Update Employee" : "➕ Add Employee"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={resetLabel}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Reset
          </button>
        )}
      </div>

      {/* Employee Table */}
      <table className="w-full bg-white shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-3">Emp Code</th>
            <th className="p-3">Name</th>
            <th className="p-3">Phone</th>
            <th className="p-3">City</th>
            <th className="p-3">Zone</th>
            <th className="p-3">Ward</th>
            <th className="p-3">Department</th>
            <th className="p-3">Designation</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.emp_id} className="border-b">
              <td className="p-3">{emp.emp_code}</td>
              <td className="p-3">{emp.name}</td>
              <td className="p-3">{emp.phone}</td>
              <td className="p-3">{emp.city || "Unknown"}</td>
              <td className="p-3">{emp.zone || "Unknown"}</td>
              <td className="p-3">{emp.ward || "Unknown"}</td>
              <td className="p-3">{emp.department || "Unknown"}</td>
              <td className="p-3">{emp.designation || "Unknown"}</td>
              <td className="p-3">
                <button
                  onClick={() => editEmployee(emp)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => deleteEmployee(emp.emp_id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  ❌ Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Employees;
