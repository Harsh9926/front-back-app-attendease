import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api`;

function AssignSupervisorWard() {
  const [supervisors, setSupervisors] = useState([]);
  const [wards, setWards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [formData, setFormData] = useState({
    assigned_id: "",
    user_id: "",
    cityId: "",
    zoneId: "",
    wardId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSupervisors();
    fetchWards();
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${apiUrl}/assignedWardRoutes`);
      setAssignments(response.data);
    } catch (error) {
      console.error("Error fetching Assigned Ward data", error);
      setError("Failed to fetch assignments. Please try again.");
    }
  };

  const fetchSupervisors = async () => {
    try {
      const response = await axios.get(`${apiUrl}/supervisor`);
      setSupervisors(response.data);
    } catch (error) {
      console.error("Error fetching supervisor data", error);
      setError("Failed to fetch supervisors. Please try again.");
    }
  };

  const fetchWards = async () => {
    try {
      const response = await axios.get(`${apiUrl}/wards`);
      setWards(response.data);
    } catch (error) {
      console.error("Error fetching ward data", error);
      setError("Failed to fetch wards. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEditing) {
        await axios.put(
          `${apiUrl}/assignedWardRoutes/${formData.assigned_id}`,
          {
            user_id: formData.user_id,
            ward_id: formData.wardId,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        await axios.post(
          `${apiUrl}/assignedWardRoutes`,
          {
            user_id: formData.user_id,
            ward_id: formData.wardId,
          },
          { headers: { "Content-Type": "application/json" } }
        );
      }
      fetchAssignments(); // Refresh list
      resetForm(); // Reset form
    } catch (error) {
      console.error("Error updating supervisor", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (assign) => {
    setFormData({
      assigned_id: assign.assigned_id,
      user_id: assign.user_id,
      cityId: assign.city_id,
      zoneId: assign.zone_id,
      wardId: assign.ward_id,
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
      await axios.delete(`${apiUrl}/assignedWardRoutes/${id}`);
      setAssignments(assignments.filter((assign) => assign.assigned_id !== id));
      Swal.fire("Deleted!", "The Assignment has been removed.", "success");
    } catch (error) {
      console.error("Error deleting assignment", error);
      setError("Failed to delete assignment. Please try again.");
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      assigned_id: "",
      user_id: "",
      cityId: "",
      zoneId: "",
      wardId: "",
    });
    setIsEditing(false);
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">🏥 Assign Supervisor to Wards</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 shadow-md rounded-lg mb-4"
      >
        {isEditing && (
          <div>
            <label className="block mb-2">Assigned ID (Auto-generated)</label>
            <input
              type="text"
              value={formData.assigned_id}
              disabled
              className="border p-2 w-full rounded bg-gray-200"
            />
          </div>
        )}
        <div className="mb-2">
          <label className="block font-medium">Select Supervisor</label>
          <select
            name="supervisorId"
            value={formData.user_id}
            onChange={(e) => {
              // const selectedSup = supervisors.find(
              //   (supervisor) => supervisor.user_id === Number(e.target.value)
              // );
              setFormData({
                ...formData,
                user_id: e.target.value,
              });
            }}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">-- Select Supervisor --</option>
            {supervisors.map((sup) => (
              <option key={sup.user_id} value={sup.user_id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block font-medium">Select City</label>
          <select
            name="cityId"
            value={formData.cityId}
            onChange={(e) => {
              // const selectedCity = wards.find(
              //   (city) => city.cityId === Number(e.target.value)
              // );
              setFormData({
                ...formData,
                cityId: e.target.value,
                zoneId: "",
                wardId: "",
              });
            }}
            className="w-full p-2 border rounded"
            required
            disabled={!formData.user_id}
          >
            <option value="">-- Select City --</option>
            {wards.map((city) => (
              <option key={city.cityId} value={city.cityId}>
                {city.city}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block font-medium">Select Zone</label>
          <select
            name="zoneId"
            value={formData.zoneId}
            onChange={(e) => {
              // const selectedCity = wards.find(
              //   (city) => city.cityId === Number(formData.cityId)
              // );
              // const selectedZone = selectedCity?.zones.find(
              //   (zone) => zone.zoneId === Number(e.target.value)
              // );
              setFormData({
                ...formData,
                zoneId: e.target.value,
                wardId: "",
              });
            }}
            className="w-full p-2 border rounded"
            required
            disabled={!formData.cityId}
          >
            <option value="">-- Select Zone --</option>
            {wards
              .find((city) => city.cityId === Number(formData.cityId))
              ?.zones.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.zone}
                </option>
              ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block font-medium">Select Ward</label>
          <select
            name="wardId"
            value={formData.wardId}
            onChange={(e) => {
              setFormData({
                ...formData,
                wardId: e.target.value,
              });
            }}
            className="w-full p-2 border rounded"
            required
            disabled={!formData.zoneId}
          >
            <option value="">-- Select Ward --</option>
            {wards
              .find((city) => city.cityId === Number(formData.cityId))
              ?.zones.find((zone) => zone.zoneId === Number(formData.zoneId))
              ?.wards.map((ward) => (
                <option key={ward.wardId} value={ward.wardId}>
                  {ward.wardName}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-end justify-start">
          <div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded shadow-md"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isEditing
                ? "Update Supervisor"
                : "➕ Add Supervisor"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </form>

      <table className="w-full bg-white shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th>EmpCode</th>
            <th className="p-3">Name</th>
            <th className="p-3">City</th>
            <th className="p-3">Zone</th>
            <th className="p-3">Ward</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assigned) => (
            <tr key={assigned.assigned_id} className="border-b text-center">
              <td className="p-3">{assigned.emp_code}</td>
              <td className="p-3">{assigned.name}</td>
              <td className="p-3">{assigned.city_name}</td>
              <td className="p-3">{assigned.zone_name}</td>
              <td className="p-3">{assigned.ward_name}</td>
              <td className="p-3">
                <button
                  onClick={() => handleEdit(assigned)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(assigned.assigned_id)}
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

export default AssignSupervisorWard;
