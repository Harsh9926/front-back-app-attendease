import { FaBars, FaSearch, FaBell, FaExpand } from "react-icons/fa";
import { useAuth } from "../AuthContext"; // Import useAuth hook

function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center">
      {/* Left Section: Sidebar Toggle & Search */}
      <div className="flex items-center space-x-4">
        <button onClick={toggleSidebar} className="text-gray-700 text-xl">
          <FaBars />
        </button>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <input
            type="text"
            placeholder="Search for anything..."
            className="p-2 text-gray-600 outline-none w-60"
          />
          <button className="bg-purple-500 text-white p-2">
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Right Section: Fullscreen, Notifications, User Avatar, Logout */}
      <div className="flex items-center space-x-4">
        <h1>Welcome back {user?.name},</h1>
        <h1>Role: {user?.role}</h1>
        <button className="text-gray-700 text-xl">
          <FaExpand />
        </button>
        <div className="relative">
          <FaBell className="text-gray-700 text-xl" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            4
          </span>
        </div>
        <button
          onClick={logout} // Call logout function
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
