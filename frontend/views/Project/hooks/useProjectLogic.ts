import { useState, useEffect } from "react";
import { ProjectListItem, ProjectDetail, Fence } from "../types";
import { getApiUrl } from "@/src/api/config";

export function useProjectLogic() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(
    null,
  );
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(
    null,
  );
  const [projectFences, setProjectFences] = useState<Fence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // 获取项目列表
  const fetchProjects = async (search?: string) => {
    try {
      setLoading(true);
      const url = search
        ? getApiUrl(`/projects/?search=${encodeURIComponent(search)}`)
        : getApiUrl("/projects/");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取项目详情
  const fetchProjectDetail = async (projectId: number) => {
    try {
      const res = await fetch(getApiUrl(`/projects/${projectId}`));
      if (!res.ok) throw new Error("Failed to fetch project detail");
      const data = await res.json();
      setProjectDetail(data);
    } catch (error) {
      console.error("Error fetching project detail:", error);
    }
  };

  // 获取项目围栏
  const fetchProjectFences = async (projectId: number) => {
    try {
      const res = await fetch(getApiUrl(`/projects/${projectId}/fences`));
      if (!res.ok) throw new Error("Failed to fetch project fences");
      const data = await res.json();
      setProjectFences(data);
    } catch (error) {
      console.error("Error fetching project fences:", error);
    }
  };

  // 删除项目
  const deleteProject = async (projectId: number) => {
    if (!confirm("确定要删除此项目吗？")) return;

    try {
      const res = await fetch(getApiUrl(`/projects/${projectId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      fetchProjects(searchQuery);
      if (expandedProjectId === projectId) {
        setExpandedProjectId(null);
        setProjectDetail(null);
        setProjectFences([]);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("删除失败");
    }
  };

  // 展开/收起项目
  const toggleProject = async (projectId: number) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      setProjectDetail(null);
      setProjectFences([]);
    } else {
      setExpandedProjectId(projectId);
      await fetchProjectDetail(projectId);
      await fetchProjectFences(projectId);
    }
  };

  // 初始化
  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    expandedProjectId,
    projectDetail,
    projectFences,
    searchQuery,
    loading,
    setSearchQuery,
    fetchProjects,
    deleteProject,
    toggleProject,
    fetchProjectDetail,
    fetchProjectFences,
  };
}
