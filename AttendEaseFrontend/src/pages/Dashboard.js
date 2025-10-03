import DashboardStats from "../components/DashboardStats";
import AttendanceChart from "../components/AttendanceChart";
import QuickActions from "../components/QuickActions";
// import DynamicReportForm from "../components/DynamicReportForm";

function Dashboard() {
  return (
    <div className="p-5">
      {/* <DynamicReportForm /> */}
      <h1 className="text-2xl font-bold mb-5">📊 Admin Dashboard</h1>
      <DashboardStats />
      <AttendanceChart />
      <QuickActions />
    </div>
  );
}

export default Dashboard;
