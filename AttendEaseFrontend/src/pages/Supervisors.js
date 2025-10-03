import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api`;

function Supervisors() {
  const [supervisors, setSupervisors] = useState([]);
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    emp_code: "",
    email: "",
    phone: "",
    role: "supervisor",
    password: "",
    confirmPassword: "",
  });
  const [isEditing, setIsEditing] = useState(null);
  const [changePassword, setChangePassword] = useState(null);

  useEffect(() => {
    fetchSupervisor();
  }, []);

  const fetchSupervisor = async () => {
    try {
      const response = await axios.get(`${apiUrl}/supervisor`);
      setSupervisors(response.data);
    } catch (error) {
      console.error("Error fetching user's data", error);
      alert("Failed to fetch supervisors. Please try again.");
    }
  };
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      if (isEditing && !changePassword) {
        // Update supervisor
        await axios.put(
          `${apiUrl}/auth/update`,
          {
            passChange: false,
            user_id: formData.user_id,
            name: formData.name,
            emp_code: formData.emp_code,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } else if (isEditing && changePassword) {
        // Update supervisor with password
        await axios.put(`${apiUrl}/auth/update`, {
          passChange: true,
          user_id: formData.user_id,
          name: formData.name,
          emp_code: formData.emp_code,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
        });
      } else {
        // Add new supervisor (Only Admins should add)
        await axios.post(
          `${apiUrl}/auth/register`,
          {
            name: formData.name,
            emp_code: formData.emp_code,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            password: formData.password,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      }
      fetchSupervisor(); // Refresh list
      resetLabel(); // Resets the labels
    } catch (error) {
      console.error("Error updating supervisor", error);
    }
  };

  const handleEdit = (sup) => {
    setFormData({
      user_id: sup.user_id || "",
      name: sup.name || "",
      emp_code: sup.emp_code || "",
      email: sup.email || "",
      phone: sup.phone || "",
      role: sup.role || "supervisor",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(true);
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
      await axios.delete(`${apiUrl}/supervisor/${id}`);
      setSupervisors(supervisors.filter((sup) => sup.user_id !== id));
      fetchSupervisor();
      Swal.fire("Deleted!", "The Supervisor has been removed.", "success");
    } catch (error) {
      console.error("Error deleting supervisor", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetLabel = () => {
    setFormData({
      user_id: "",
      name: "",
      emp_code: "",
      email: "",
      phone: "",
      role: "supervisor",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(false);
    setChangePassword(false);
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">🧑‍🏫 Supervisor Management</h1>
      <form
        onSubmit={handleSubmit}
        className="border bg-gray-100 p-4 shadow-md rounded-lg mb-4"
      >
        {isEditing && (
          <div className="mb-2">
            <label className="block font-medium">User ID</label>
            <input
              type="text"
              name="id"
              value={formData.user_id}
              disabled
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block font-medium">EmpCode</label>
            <input
              type="text"
              name="emp_code"
              value={formData.emp_code}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-medium">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {(!isEditing || changePassword) && (
            <div>
              <label className="block font-medium">Create Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          )}
          {(!isEditing || changePassword) && (
            <div className="w-full">
              <label className="block font-medium">Re-enter Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          )}
          <div className="flex items-end justify-center ">
            <div>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded shadow-md"
              >
                {isEditing ? "Update Supervisor" : "➕ Add Supervisor"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetLabel}
                  className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                >
                  Reset
                </button>
              )}
              {/* {isEditing && (
                <button
                  type="button"
                  // onClick={resetLabel}
                  className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
                >
                  Change Password
                </button>
              )} */}
            </div>
          </div>
        </div>
      </form>

      <table className="w-full bg-white shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-3">Name</th>
            <th className="p-3">EmpCode</th>
            <th className="p-3">Email</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Role</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {supervisors.map((sup) => (
            <tr key={sup.user_id} className="border-b">
              <td className="p-3">{sup.name}</td>
              <td className="p-3">{sup.emp_code}</td>
              <td className="p-3">{sup.email}</td>
              <td className="p-3">{sup.phone}</td>
              <td className="p-3">{sup.role}</td>
              <td className="p-3">
                <button
                  onClick={() => handleEdit(sup)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(sup.user_id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  🗑️ Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Supervisors;
