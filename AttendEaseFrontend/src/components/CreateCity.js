import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/cities`;

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function CreateCity() {
  const [cities, setCities] = useState([]);
  const [state, setState] = useState("");
  const [cityName, setCityName] = useState("");
  const [editingCity, setEditingCity] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await axios.get(apiUrl);
      setCities(response.data);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors
    try {
      if (editingCity) {
        // Update existing city
        await axios.put(`${apiUrl}/${editingCity.city_id}`, {
          city_name: cityName,
          state,
        });
      } else {
        // Add new city
        await axios.post(apiUrl, {
          city_name: cityName,
          state,
        });
      }
      resetForm();
      fetchCities(); // Refresh city list
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        if (errCode === "23505") {
          setErrorMessage("⚠️ This city already exists in the database.");
        } else {
          setErrorMessage("⚠️ Error saving city. Please try again.");
        }
      } else {
        setErrorMessage("⚠️ Network error. Please check your connection.");
      }
      console.error("Error saving city:", error);
    }
  };

  const editCity = (city) => {
    setEditingCity(city);
    setCityName(city.city_name);
    setState(city.state);
  };

  const deleteCity = async (id) => {
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
      fetchCities();
      Swal.fire("Deleted!", "The city has been removed.", "success");
    } catch (error) {
      console.error("Error deleting city:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetForm = () => {
    setCityName("");
    setState("");
    setEditingCity(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🏙️ Manage Cities</h2>

      {/* Error Alert */}
      {errorMessage && <div className="text-red-600 mb-3">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="p-2 border rounded w-full"
          required
        >
          <option value="" disabled>
            Select State
          </option>
          {indianStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={cityName}
          onChange={(e) => setCityName(e.target.value)}
          placeholder="Enter City Name"
          className="p-2 border rounded w-full"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              state && cityName
                ? "bg-blue-500 text-white"
                : "bg-gray-400 text-gray-700 cursor-not-allowed"
            }`}
            disabled={!state || !cityName} // Corrected check
          >
            {editingCity ? "Update City" : "Add City"}
          </button>

          {/* Reset Button */}
          {editingCity && (
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

      {/* City Table */}
      <table className="w-full bg-white shadow-md rounded-lg">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-3">City</th>
            <th className="p-3">State</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(cities) && cities.length > 0 ? (
            cities.map((city) => (
              <tr key={city.city_id} className="border-b text-center">
                <td className="p-3">{city.city_name}</td>
                <td className="p-3">{city.state}</td>
                <td className="p-3">
                  <button
                    onClick={() => editCity(city)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteCity(city.city_id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    ❌ Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center py-4">
                No cities available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CreateCity;
