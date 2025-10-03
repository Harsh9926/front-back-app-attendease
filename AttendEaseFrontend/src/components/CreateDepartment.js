import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/departments`;

function CreateDepartment() {
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(apiUrl);
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      if (editingDepartment) {
        await axios.put(`${apiUrl}/${editingDepartment.department_id}`, {
          department_name: departmentName,
        });

        setDepartments((prev) =>
          prev.map((dept) =>
            dept.department_id === editingDepartment.department_id
              ? { ...dept, department_name: departmentName }
              : dept
          )
        );
      } else {
        const response = await axios.post(apiUrl, {
          department_name: departmentName,
        });
        setDepartments([...departments, response.data]);
      }

      resetForm();
      fetchDepartments();
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        setErrorMessage(
          errCode === "23505"
            ? "⚠️ Department already exists."
            : "⚠️ Error saving department. Please try again."
        );
      } else {
        setErrorMessage("⚠️ Network error. Please check your connection.");
      }
      console.error("Error saving department:", error);
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
      setDepartments(departments.filter((dept) => dept.department_id !== id));
      Swal.fire("Deleted!", "The Department has been removed.", "success");
    } catch (error) {
      console.error("Error deleting department:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (dept) => {
    setEditingDepartment(dept);
    setDepartmentName(dept.department_name);
  };

  const resetForm = () => {
    setDepartmentName("");
    setEditingDepartment(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🏢 Manage Departments</h2>

      {errorMessage && <div className="text-red-600 mb-3">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
        <input
          type="text"
          value={departmentName}
          onChange={(e) => setDepartmentName(e.target.value)}
          placeholder="Enter Department Name"
          className="p-2 border rounded w-full"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              departmentName
                ? "bg-blue-500 text-white"
                : "bg-gray-400 text-gray-700 cursor-not-allowed"
            }`}
            disabled={!departmentName}
          >
            {editingDepartment ? "Update Department" : "Add Department"}
          </button>
          {editingDepartment && (
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
            <th className="p-3">Department Name</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.department_id} className="border-b text-center">
              <td className="p-3">{dept.department_name}</td>
              <td className="p-3">
                <button
                  onClick={() => handleEdit(dept)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(dept.department_id)}
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

export default CreateDepartment;
