import React from "react";
import { Search } from "lucide-react";

interface PersonnelSearchProps {
  value: string;
  onChange: (val: string) => void;
}

export const PersonnelSearch: React.FC<PersonnelSearchProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="搜索姓名、部门或电话..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 border border-gray-300 rounded p-2 pl-9 text-sm text-gray-800 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-400"
      />
      <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
    </div>
  );
};
