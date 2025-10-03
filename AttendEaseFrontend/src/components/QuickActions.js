function QuickActions() {
  return (
    <div className="mt-5 flex gap-4">
      <button className="bg-blue-500 text-white px-4 py-2 rounded shadow-md">
        ➕ Add Employee
      </button>
      <button className="bg-green-500 text-white px-4 py-2 rounded shadow-md">
        📄 Generate Report
      </button>
      <button className="bg-yellow-500 text-white px-4 py-2 rounded shadow-md">
        🛠 Manage Attendance
      </button>
    </div>
  );
}

export default QuickActions;
