function DashboardStats() {
  const stats = [
    { title: "Total Employees", value: 150, color: "bg-blue-500" },
    { title: "Present Today", value: 120, color: "bg-green-500" },
    { title: "Absent Today", value: 20, color: "bg-red-500" },
    { title: "On Leave", value: 10, color: "bg-yellow-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-5 text-white rounded-lg shadow-md ${stat.color}`}
        >
          <h3 className="text-lg font-bold">{stat.title}</h3>
          <p className="text-2xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
