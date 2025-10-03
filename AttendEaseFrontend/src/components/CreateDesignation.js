import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/designations`;
const departmentUrl = `${API_BASE_URL}/api/departments`;

function CreateDesignation() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designationName, setDesignationName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch Departments
  useEffect(() => {
    axios
      .get(departmentUrl)
      .then((response) => setDepartments(response.data))
      .catch((error) => console.error("Error fetching departments:", error));
  }, []);

  // Fetch Designations
  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = () => {
    axios
      .get(apiUrl)
      .then((response) => setDesignations(response.data))
      .catch((error) => console.error("Error fetching designations:", error));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!designationName.trim() || !selectedDepartment) {
      setErrorMessage(
        "⚠️ Please enter a designation name and select a department."
      );
      return;
    }

    try {
      if (editingDesignation) {
        await axios.put(`${apiUrl}/${editingDesignation.designation_id}`, {
          designation_name: designationName,
          department_id: selectedDepartment,
        });

        setDesignations((prev) =>
          prev.map((des) =>
            des.designation_id === editingDesignation.designation_id
              ? {
                  ...des,
                  designation_name: designationName,
                  department_id: selectedDepartment,
                }
              : des
          )
        );
      } else {
        const response = await axios.post(apiUrl, {
          designation_name: designationName,
          department_id: selectedDepartment,
        });
        setDesignations([...designations, response.data]);
      }

      resetForm();
      fetchDesignations();
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        setErrorMessage(
          errCode === "23505"
            ? "⚠️ Designation already exists."
            : "⚠️ Error saving designation. Please try again."
        );
      } else {
        setErrorMessage("⚠️ Network error. Please check your connection.");
      }
      console.error("Error saving designation:", error);
    }
  };

  const handleDelete = async (id) => {
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
      await axios.delete(`${apiUrl}/${id}`);
      setDesignations(
        designations.filter((designation) => designation.designation_id !== id)
      );
      Swal.fire("Deleted!", "The Designation has been removed.", "success");
    } catch (error) {
      console.error("Error deleting designation:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (designation) => {
    setEditingDesignation(designation);
    setDesignationName(designation.designation_name);
    setSelectedDepartment(designation.department_id);
  };

  const resetForm = () => {
    setDesignationName("");
    setSelectedDepartment("");
    setEditingDesignation(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🏢 Manage Designations</h2>

      {errorMessage && <div className="text-red-600 mb-3">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
        {/* Department Selection */}
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="p-2 border rounded w-full"
          required
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept.department_id} value={dept.department_id}>
              {dept.department_name}
            </option>
          ))}
        </select>

        {/* Designation Name Input */}
        <input
          type="text"
          value={designationName}
          onChange={(e) => setDesignationName(e.target.value)}
          placeholder="Enter Designation Name"
          className="p-2 border rounded w-full"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              designationName && selectedDepartment
                ? "bg-blue-500 text-white"
                : "bg-gray-400 text-gray-700 cursor-not-allowed"
            }`}
            disabled={!designationName || !selectedDepartment}
          >
            {editingDesignation ? "Update Designation" : "Add Designation"}
          </button>
          {editingDesignation && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <table className="w-full bg-white shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-3">Department</th>
            <th className="p-3">Designation Name</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {designations.map((designation) => (
            <tr
              key={designation.designation_id}
              className="border-b text-center"
            >
              <td className="p-3">
                {designation.department_name || "Unknown Dept"}
              </td>
              <td className="p-3">{designation.designation_name}</td>
              <td className="p-3">
                <button
                  onClick={() => handleEdit(designation)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(designation.designation_id)}
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

export default CreateDesignation;
