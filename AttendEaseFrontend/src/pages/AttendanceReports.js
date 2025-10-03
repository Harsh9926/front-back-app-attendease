import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

const apiUrl = `${API_BASE_URL}/api`;

function AttendanceReports() {
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInIST());
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await axios.post(
          `${apiUrl}/attendance?date=${selectedDate}`
        );
        setRecords(response.data);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      }
    };

    fetchRecords();
  }, [selectedDate]);

  // Function to fetch image data
  const fetchImage = async (attendanceId, punchType) => {
    try {
      const response = await axios.get(
        `${apiUrl}/app/attendance/employee/image?attendance_id=${attendanceId}&punch_type=${punchType}`,
        {
          responseType: "blob", // Fetch image as a Blob
        }
      );

      // Convert Blob to a URL
      const imageUrl = URL.createObjectURL(response.data);
      return imageUrl;
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  };

  // Function to handle image click
  const handleImageClick = async (attendanceId, punchType) => {
    setIsLoading(true);
    const imageUrl = await fetchImage(attendanceId, punchType);
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setIsModalOpen(true);
    }
    setIsLoading(false);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null); // Clear the image URL
  };

  // function for time zone
  function getTodayInIST() {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  }

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">📅 Attendance Reports</h1>

      {/* Date Picker */}
      <div className="mb-4">
        <label className="font-medium">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          max={getTodayInIST()} // Prevents future dates
          onChange={(e) => setSelectedDate(e.target.value)}
          className="ml-2 p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-scroll max-w-full">
        <table className="bg-white shadow-md rounded-lg border border-gray-300 w-full min-w-max">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="p-3 border">Sr No.</th>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">EmpCode</th>
              <th className="p-3 border">Contact No.</th>
              <th className="p-3 border">In Time</th>
              <th className="p-3 border">In Image</th>
              <th className="p-3 border">PunchedIn By</th>
              <th className="p-3 border">Out Time</th>
              <th className="p-3 border">Out Image</th>
              <th className="p-3 border">PunchedOut By</th>
              <th className="p-3 border">In Address</th>
              <th className="p-3 border">Out Address</th>
              <th className="p-3 border">Duration</th>
              <th className="p-3 border">Ward</th>
              <th className="p-3 border">Zone</th>
              <th className="p-3 border">City</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => (
                <tr
                  key={record.sr_no}
                  className="border-b hover:bg-gray-100 text-gray-800"
                >
                  <td className="p-3 border">{record.sr_no}</td>
                  <td className="p-3 border">{record.name}</td>
                  <td className="p-3 border">{record.emp_code}</td>
                  <td className="p-3 border">{record.contact_no}</td>
                  <td className="p-3 border">{record.punch_in || "-"}</td>
                  <td className="p-3 border text-center">
                    {record.punch_in_image ? (
                      <img
                        src={`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=IN`}
                        alt="Punch In"
                        className="w-16 h-16 object-cover cursor-pointer"
                        onClick={() =>
                          handleImageClick(record.attendance_id, "IN")
                        }
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 border">{record.punched_in_by}</td>
                  <td className="p-3 border">{record.punch_out || "-"}</td>
                  <td className="p-3 border text-center">
                    {record.punch_out_image ? (
                      <img
                        src={`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=OUT`}
                        alt="Punch Out"
                        className="w-16 h-16 object-cover cursor-pointer"
                        onClick={() =>
                          handleImageClick(record.attendance_id, "OUT")
                        }
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 border">{record.punched_out_by}</td>
                  <td className="p-3 border">{record.in_address || "-"}</td>
                  <td className="p-3 border">{record.out_address || "-"}</td>
                  <td className="p-3 border">{record.duration}</td>
                  <td className="p-3 border">{record.ward}</td>
                  <td className="p-3 border">{record.zone}</td>
                  <td className="p-3 border">{record.city}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="15" className="p-3 text-center text-gray-500">
                  No records found for the selected date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Image Display */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Image Preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="flex justify-center">
              {isLoading ? (
                <p className="text-gray-500">Loading image...</p>
              ) : selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-full max-h-96"
                />
              ) : (
                <p className="text-gray-500">No image available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceReports;
