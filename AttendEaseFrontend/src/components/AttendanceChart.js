import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "Mon", present: 100 },
  { date: "Tue", present: 120 },
  { date: "Wed", present: 130 },
  { date: "Thu", present: 110 },
  { date: "Fri", present: 140 },
];

function AttendanceChart() {
  return (
    <div className="p-5 bg-white shadow-md rounded-lg mt-5">
      <h3 className="text-lg font-bold mb-4">Attendance Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="present"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AttendanceChart;
