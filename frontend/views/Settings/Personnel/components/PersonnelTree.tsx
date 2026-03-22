import React from "react";
import { TreeNode } from "./TreeNode";
import { AdminUser } from "../types";

interface PersonnelTreeProps {
  allUsers: AdminUser[];
  filteredUsers: AdminUser[];
  expandedNodes: Record<string, boolean>;
  searchTerm: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PersonnelTree: React.FC<PersonnelTreeProps> = ({
  allUsers,
  filteredUsers,
  expandedNodes,
  searchTerm,
  onToggle,
  onDelete,
}) => {
  // Find root nodes among filtered users
  // A node is a root if it has no parentId OR its parent is not in the filtered set
  const filteredRootUsers = filteredUsers.filter(
    (user) =>
      user.parentId === null ||
      !filteredUsers.some((u) => u.id === user.parentId)
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {filteredRootUsers.length > 0 ? (
        filteredRootUsers.map((root) => (
          <TreeNode
            key={root.id}
            user={root}
            depth={0}
            allUsers={allUsers}
            filteredUsers={filteredUsers}
            expandedNodes={expandedNodes}
            searchTerm={searchTerm}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20 grayscale opacity-60">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-sm font-medium">未找到匹配的人员</p>
          <p className="text-[11px] mt-1">请尝试更换搜索关键词</p>
        </div>
      )}
    </div>
  );
};
