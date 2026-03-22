import React from "react";
import { Shield } from "lucide-react";
import { usePersonnelStore } from "./hooks/usePersonnelStore";
import { PersonnelSearch } from "./components/PersonnelSearch";
import { PersonnelTree } from "./components/PersonnelTree";
import { PersonnelForm } from "./components/PersonnelForm";

export default function PersonnelManagement() {
  const {
    admins,
    filteredAdmins,
    searchTerm,
    setSearchTerm,
    expandedNodes,
    toggleNode,
    deleteAdmin,
    addAdmin,
  } = usePersonnelStore();

  return (
    <div className="h-full flex gap-6 p-1">
      {/* Left Column: Admin Tree List */}
      <div className="w-1/3 min-w-[340px] bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Shield size={20} />
            </div>
            人员架构管理
          </h2>
          <PersonnelSearch value={searchTerm} onChange={setSearchTerm} />
        </div>

        <PersonnelTree
          allUsers={admins}
          filteredUsers={filteredAdmins}
          expandedNodes={expandedNodes}
          searchTerm={searchTerm}
          onToggle={toggleNode}
          onDelete={deleteAdmin}
        />

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest px-6">
          <span>Member Stats</span>
          <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
            {admins.length} Total
          </span>
        </div>
      </div>

      {/* Right Column: Add Form */}
      <PersonnelForm admins={admins} onAdd={addAdmin} />
    </div>
  );
}
