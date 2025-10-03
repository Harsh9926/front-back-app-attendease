import { useState } from "react";
import CreateCity from "../components/CreateCity";
import CreateZone from "../components/CreateZone";
import CreateWard from "../components/CreateWard";
import CreateDepartment from "../components/CreateDepartment";
import CreateDesignation from "../components/CreateDesignation";

const tabs = [
  { id: 1, label: "Cities", component: <CreateCity /> },
  { id: 2, label: "Zones", component: <CreateZone /> },
  { id: 3, label: "Wards", component: <CreateWard /> },
  { id: 4, label: "Departments", component: <CreateDepartment /> },
  { id: 5, label: "Designations", component: <CreateDesignation /> },
];

function Master() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <div className="p-5">
      <h1 className="text-3xl font-bold mb-4 text-center">
        🏢 Master Management
      </h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-5 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-t-lg ${
              activeTab === tab.id ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render Selected Tab Component */}
      <div className="p-4 border rounded">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default Master;
