function Settings() {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">⚙️ Admin Settings</h1>
      <div className="bg-white shadow-md p-5 rounded-lg">
        <label className="block mb-2">🔑 Change Password</label>
        <input
          type="password"
          className="border p-2 rounded w-full mb-3"
          placeholder="Enter new password"
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default Settings;
