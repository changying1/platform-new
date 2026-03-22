import { useState, useMemo, useCallback } from 'react';
import { AdminUser, AdminRole, PersonnelFormState } from '../types';

const initialAdmins: AdminUser[] = [
  { id: '1', username: '总负责人', dept: '总部', phone: '13800000000', role: 'HQ Manager', addedDate: '2024-01-01', parentId: null },
  { id: '2', username: '项目负责人1', dept: '项目一部', phone: '13912345678', role: 'Project Manager', addedDate: '2024-03-15', parentId: '1' },
  { id: '3', username: '项目负责人2', dept: '项目二部', phone: '13987654321', role: 'Project Manager', addedDate: '2024-03-16', parentId: '1' },
  { id: '4', username: '安全员1', dept: '项目一部', phone: '13788889999', role: 'Safety Officer', addedDate: '2024-06-20', parentId: '2' },
  { id: '5', username: '安全员2', dept: '项目一部', phone: '13766665555', role: 'Safety Officer', addedDate: '2024-06-21', parentId: '2' },
  { id: '6', username: '安全员3', dept: '项目二部', phone: '13744443333', role: 'Safety Officer', addedDate: '2024-06-22', parentId: '3' },
  { id: '7', username: '作业人员1', dept: '施工队A', phone: '13500001111', role: 'Worker', addedDate: '2024-07-01', parentId: '4' },
  { id: '8', username: '作业人员2', dept: '施工队A', phone: '13500002222', role: 'Worker', addedDate: '2024-07-02', parentId: '4' },
  { id: '9', username: '作业人员3', dept: '施工队B', phone: '13500003333', role: 'Worker', addedDate: '2024-07-03', parentId: '5' },
  { id: '10', username: '作业人员4', dept: '施工队C', phone: '13500004444', role: 'Worker', addedDate: '2024-07-04', parentId: '6' },
  { id: '11', username: '作业人员5', dept: '施工队C', phone: '13500005555', role: 'Worker', addedDate: '2024-07-05', parentId: '6' },
];

export function usePersonnelStore() {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
  });

  const toggleNode = useCallback((userId: string) => {
    setExpandedNodes(prev => ({ ...prev, [userId]: !prev[userId] }));
  }, []);

  const deleteAdmin = useCallback((id: string) => {
    if (confirm("确定要删除该人员吗？其下属人员将失去关联。")) {
      setAdmins(prev => prev.filter(a => a.id !== id));
    }
  }, []);

  const addAdmin = useCallback((user: AdminUser) => {
    setAdmins(prev => [...prev, user]);
    if (user.parentId) {
      setExpandedNodes(prev => ({ ...prev, [user.parentId!]: true }));
    }
  }, []);

  // Filter logic: a node is visible if it matches OR any of its descendants match
  const filteredAdmins = useMemo(() => {
    if (!searchTerm) return admins;

    const lowerSearch = searchTerm.toLowerCase();
    const visibleIds = new Set<string>();

    // Step 1: Find all direct matches
    const directMatches = admins.filter(user => 
      user.username.toLowerCase().includes(lowerSearch) || 
      user.dept.toLowerCase().includes(lowerSearch) ||
      user.phone.includes(searchTerm)
    );

    // Step 2: For each direct match, mark it and all its ancestors as visible
    directMatches.forEach(match => {
      let current: AdminUser | undefined = match;
      while (current) {
        visibleIds.add(current.id);
        const parentId = current.parentId;
        current = admins.find(a => a.id === parentId);
      }
    });

    return admins.filter(a => visibleIds.has(a.id));
  }, [admins, searchTerm]);

  // Handle automatic expansion when searching
  useMemo(() => {
    if (!searchTerm) return;
    const lowerSearch = searchTerm.toLowerCase();
    const newExpanded = { ...expandedNodes };
    let changed = false;

    admins.forEach(user => {
      // If any child matches, expand this node
      const children = admins.filter(a => a.parentId === user.id);
      const hasMatchingChild = children.some(child => 
        child.username.toLowerCase().includes(lowerSearch) || 
        child.dept.toLowerCase().includes(lowerSearch) ||
        child.phone.includes(searchTerm)
      );

      if (hasMatchingChild && !newExpanded[user.id]) {
        newExpanded[user.id] = true;
        changed = true;
      }
    });

    if (changed) {
      setTimeout(() => setExpandedNodes(newExpanded), 0);
    }
  }, [searchTerm, admins]);

  return {
    admins,
    filteredAdmins,
    searchTerm,
    setSearchTerm,
    expandedNodes,
    toggleNode,
    deleteAdmin,
    addAdmin
  };
}
