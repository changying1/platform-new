import React from "react";
import { User, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { AdminUser, AdminRole } from "../types";

interface TreeNodeProps {
  user: AdminUser;
  depth: number;
  allUsers: AdminUser[];
  filteredUsers: AdminUser[];
  expandedNodes: Record<string, boolean>;
  searchTerm: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  user,
  depth,
  allUsers,
  filteredUsers,
  expandedNodes,
  searchTerm,
  onToggle,
  onDelete,
}) => {
  const children = filteredUsers.filter((a) => a.parentId === user.id);
  const hasChildren = allUsers.some((a) => a.parentId === user.id);
  const isExpanded = expandedNodes[user.id];

  // Highlight match in text
  const highlight = (text: string) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 text-gray-900">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getRoleInfo = (r: AdminRole) => {
    switch (r) {
      case "HQ Manager":
        return {
          name: "总部负责人",
          style: "text-red-600 border-red-200 bg-red-50",
        };
      case "Project Manager":
        return {
          name: "项目经理",
          style: "text-orange-600 border-orange-200 bg-orange-50",
        };
      case "Safety Officer":
        return {
          name: "安全员",
          style: "text-blue-600 border-blue-200 bg-blue-50",
        };
      default:
        return {
          name: "作业人员",
          style: "text-green-600 border-green-200 bg-green-50",
        };
    }
  };

  const roleInfo = getRoleInfo(user.role);

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2 rounded hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-200 group ${
          depth > 0 ? "ml-6 relative" : ""
        }`}
      >
        {depth > 0 && (
          <>
            <div className="absolute -left-4 top-1/2 w-4 h-[1px] bg-gray-200"></div>
            <div className="absolute -left-4 -top-3 bottom-1/2 w-[1px] bg-gray-200"></div>
          </>
        )}

        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={() => onToggle(user.id)}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )}
          </button>

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${roleInfo.style}`}
          >
            <User size={16} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {highlight(user.username)}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full border leading-none font-medium ${roleInfo.style}`}
              >
                {roleInfo.name}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              <span>{highlight(user.dept)}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              <span className="font-mono">{highlight(user.phone)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onDelete(user.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="relative">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              user={child}
              depth={depth + 1}
              allUsers={allUsers}
              filteredUsers={filteredUsers}
              expandedNodes={expandedNodes}
              searchTerm={searchTerm}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
