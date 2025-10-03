import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function Sidebar({ isOpen }) {
  return (
    <div
      className={`w-64 h-screen bg-gray-800 text-white p-5 fixed top-0 transition-transform duration-300 ${
        isOpen ? "left-0" : "-left-64"
      }`}
    >
      <div className="flex justify-center mb-4">
        <img src={logo} alt="Company Logo" className="w-32 h-auto" />
      </div>
      <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
      <ul>
        <li className="mb-3">
          <Link to="/" className="hover:text-gray-300">
            📊 Dashboard
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/master" className="hover:text-gray-300">
            📊 Master
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/supervisors" className="hover:text-gray-300">
            🧑‍🏫 Supervisors
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/assignSupervisorWard" className="hover:text-gray-300">
            🧑‍🏫 Assign Supervisor Ward
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/employees" className="hover:text-gray-300">
            👨‍💼 Employees
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/attendance" className="hover:text-gray-300">
            📅 Attendance Reports
          </Link>
        </li>
        <li className="mb-3">
          <Link to="/settings" className="hover:text-gray-300">
            ⚙️ Settings
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
