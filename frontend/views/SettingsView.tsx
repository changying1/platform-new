import React, { useMemo, useState } from "react";
import {
  Save,
  UserPlus,
  Image as ImageIcon,
  Trash2,
  Shield,
  Search,
  User,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
} from "lucide-react";

type AdminRole = "HQ Manager" | "Project Manager" | "Safety Officer" | "Worker";

interface AdminUser {
  id: string;
  username: string;
  dept: string;
  phone: string;
  role: AdminRole;
  addedDate: string;
  parentId: string | null; // ID of the supervisor
}

// Initial data representing a specific hierarchy
const initialAdmins: AdminUser[] = [
  // Level 1: HQ
  {
    id: "1",
    username: "总负责人",
    dept: "总部",
    phone: "13800000000",
    role: "HQ Manager",
    addedDate: "2024-01-01",
    parentId: null,
  },

  // Level 2: Project Managers (Children of HQ)
  {
    id: "2",
    username: "项目负责人1",
    dept: "项目一部",
    phone: "13912345678",
    role: "Project Manager",
    addedDate: "2024-03-15",
    parentId: "1",
  },
  {
    id: "3",
    username: "项目负责人2",
    dept: "项目二部",
    phone: "13987654321",
    role: "Project Manager",
    addedDate: "2024-03-16",
    parentId: "1",
  },

  // Level 3: Safety Officers (Children of PMs)
  {
    id: "4",
    username: "安全员1",
    dept: "项目一部",
    phone: "13788889999",
    role: "Safety Officer",
    addedDate: "2024-06-20",
    parentId: "2",
  },
  {
    id: "5",
    username: "安全员2",
    dept: "项目一部",
    phone: "13766665555",
    role: "Safety Officer",
    addedDate: "2024-06-21",
    parentId: "2",
  },
  {
    id: "6",
    username: "安全员3",
    dept: "项目二部",
    phone: "13744443333",
    role: "Safety Officer",
    addedDate: "2024-06-22",
    parentId: "3",
  },

  // Level 4: Workers (Children of Safety Officers)
  {
    id: "7",
    username: "作业人员1",
    dept: "施工队A",
    phone: "13500001111",
    role: "Worker",
    addedDate: "2024-07-01",
    parentId: "4",
  },
  {
    id: "8",
    username: "作业人员2",
    dept: "施工队A",
    phone: "13500002222",
    role: "Worker",
    addedDate: "2024-07-02",
    parentId: "4",
  },
  {
    id: "9",
    username: "作业人员3",
    dept: "施工队B",
    phone: "13500003333",
    role: "Worker",
    addedDate: "2024-07-03",
    parentId: "5",
  },
  {
    id: "10",
    username: "作业人员4",
    dept: "施工队C",
    phone: "13500004444",
    role: "Worker",
    addedDate: "2024-07-04",
    parentId: "6",
  },
  {
    id: "11",
    username: "作业人员5",
    dept: "施工队C",
    phone: "13500005555",
    role: "Worker",
    addedDate: "2024-07-05",
    parentId: "6",
  },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 720px at 12% -6%, rgba(147,197,253,0.28), transparent 62%)," +
      "radial-gradient(1000px 620px at 96% 6%, rgba(59,130,246,0.22), transparent 60%)," +
      "radial-gradient(900px 560px at 62% 96%, rgba(56,189,248,0.16), transparent 64%)," +
      "linear-gradient(180deg, #0b4db3 0%, #0a3f99 42%, #0a2f73 100%)",
    padding: 12,
    boxSizing: "border-box",
  },

  glassCard: {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(14,78,191,0.82), rgba(12,66,168,0.74))",
    border: "1px solid rgba(191,219,254,0.38)",
    boxShadow:
      "0 28px 80px rgba(7,20,63,0.42), 0 1px 0 rgba(191,219,254,0.16) inset",
    backdropFilter: "blur(12px)",
    overflow: "hidden",
  },

  cardHeader: {
    padding: 16,
    borderBottom: "1px solid rgba(191,219,254,0.22)",
    background:
      "linear-gradient(180deg, rgba(15,78,190,0.55), rgba(12,63,156,0.20))",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e8f1ff",
    fontWeight: 950 as any,
    fontSize: 18,
  },

  subText: {
    marginTop: 6,
    color: "rgba(199,219,255,0.85)",
    fontSize: 12,
    lineHeight: 1.4,
  },

  input: {
    width: "100%",
    background:
      "linear-gradient(180deg, rgba(239,246,255,0.95), rgba(219,234,254,0.90))",
    border: "1px solid rgba(147,197,253,0.62)",
    borderRadius: 14,
    padding: "10px 12px",
    paddingLeft: 36,
    fontSize: 13,
    color: "#0b3a82",
    outline: "none",
    boxShadow: "0 12px 30px rgba(7,20,63,0.20)",
  },

  inputPlain: {
    width: "100%",
    background:
      "linear-gradient(180deg, rgba(239,246,255,0.95), rgba(219,234,254,0.90))",
    border: "1px solid rgba(147,197,253,0.62)",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    color: "#0b3a82",
    outline: "none",
    boxShadow: "0 12px 30px rgba(7,20,63,0.16)",
  },

  softPanel: {
    borderRadius: 16,
    border: "1px solid rgba(191,219,254,0.28)",
    background:
      "radial-gradient(900px 360px at 18% 0%, rgba(147,197,253,0.18), transparent 64%)," +
      "linear-gradient(180deg, rgba(12,64,166,0.26), rgba(10,47,115,0.36))",
    boxShadow: "0 1px 0 rgba(191,219,254,0.12) inset",
  },
};

export default function SettingsView() {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [searchTerm, setSearchTerm] = useState("");

  // Expanded states for tree nodes (key = userId)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "1": true, // Auto expand HQ
    "2": true, // Auto expand PM1
    "3": true, // Auto expand PM2
  });

  // Form State
  const [form, setForm] = useState({
    username: "",
    dept: "",
    phone: "",
    password: "",
    role: "Worker" as AdminRole,
    parentId: "",
  });

  const toggleNode = (userId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleDeleteAdmin = (id: string) => {
    if (confirm("确定要删除该人员吗？其下属人员将失去关联。")) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      // Optional: Handle orphaned children logic here (e.g., set their parentId to null)
    }
  };

  // Get potential supervisors based on selected role
  const getPotentialSupervisors = (currentRole: AdminRole) => {
    switch (currentRole) {
      case "HQ Manager":
        return []; // Top level has no supervisor
      case "Project Manager":
        return admins.filter((a) => a.role === "HQ Manager");
      case "Safety Officer":
        return admins.filter((a) => a.role === "Project Manager");
      case "Worker":
        return admins.filter((a) => a.role === "Safety Officer");
      default:
        return [];
    }
  };

  const handleAddAdmin = () => {
    if (!form.username || !form.password || !form.dept) {
      alert("请填写完整的必要信息");
      return;
    }

    if (form.role !== "HQ Manager" && !form.parentId) {
      alert("请选择直属上级负责人");
      return;
    }

    const newAdmin: AdminUser = {
      id: Date.now().toString(),
      username: form.username,
      dept: form.dept,
      phone: form.phone,
      role: form.role,
      addedDate: new Date().toLocaleDateString(),
      parentId: form.role === "HQ Manager" ? null : form.parentId,
    };

    setAdmins([...admins, newAdmin]);

    // Reset form
    setForm({
      username: "",
      dept: "",
      phone: "",
      password: "",
      role: "Worker",
      parentId: "",
    });

    // Auto expand the parent to show new child
    if (newAdmin.parentId) {
      setExpandedNodes((prev) => ({ ...prev, [newAdmin.parentId!]: true }));
    }

    alert("人员添加成功！");
  };

  const getRoleChip = (r: AdminRole) => {
    if (r === "HQ Manager")
      return {
        label: "总部负责人",
        fg: "#fecaca",
        bg: "rgba(220,38,38,0.14)",
        bd: "rgba(248,113,113,0.45)",
      };
    if (r === "Project Manager")
      return {
        label: "项目经理",
        fg: "#fde68a",
        bg: "rgba(245,158,11,0.14)",
        bd: "rgba(253,224,71,0.40)",
      };
    if (r === "Safety Officer")
      return {
        label: "安全员",
        fg: "#bfdbfe",
        bg: "rgba(59,130,246,0.16)",
        bd: "rgba(147,197,253,0.45)",
      };
    return {
      label: "作业人员",
      fg: "#bbf7d0",
      bg: "rgba(34,197,94,0.14)",
      bd: "rgba(134,239,172,0.40)",
    };
  };

  const getRoleName = (r: AdminRole) => getRoleChip(r).label;

  // Recursive Tree Node Component
  const TreeNode: React.FC<{ user: AdminUser; depth: number }> = ({
    user,
    depth,
  }) => {
    // Find children
    const children = admins.filter((a) => a.parentId === user.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes[user.id];

    const match = user.username.includes(searchTerm) || user.dept.includes(searchTerm);
    if (searchTerm && !match && !hasChildren) return null;

    const chip = getRoleChip(user.role);

    return (
      <div className="select-none">
        <div
          className={`group relative flex items-center gap-2 rounded-xl p-2 transition-all`}
          style={{
            marginLeft: depth > 0 ? 24 : 0,
            background:
              "linear-gradient(180deg, rgba(239,246,255,0.10), rgba(219,234,254,0.06))",
            border: "1px solid rgba(191,219,254,0.10)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.border =
              "1px solid rgba(191,219,254,0.28)";
            (e.currentTarget as HTMLDivElement).style.background =
              "linear-gradient(180deg, rgba(239,246,255,0.14), rgba(219,234,254,0.08))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.border =
              "1px solid rgba(191,219,254,0.10)";
            (e.currentTarget as HTMLDivElement).style.background =
              "linear-gradient(180deg, rgba(239,246,255,0.10), rgba(219,234,254,0.06))";
          }}
        >
          {/* Visual connectors for tree */}
          {depth > 0 && (
            <>
              <div
                className="absolute -left-4 top-1/2 h-px w-4"
                style={{ background: "rgba(191,219,254,0.38)" }}
              />
              <div
                className="absolute -left-4 -top-3 bottom-1/2 w-px"
                style={{ background: "rgba(191,219,254,0.32)" }}
              />
            </>
          )}

          <div className="flex flex-1 items-center gap-3">
            {/* Expand/Collapse Toggle */}
            <button
              onClick={() => toggleNode(user.id)}
              className={`rounded-md p-1 transition ${
                hasChildren ? "opacity-100" : "pointer-events-none opacity-30"
              }`}
              style={{
                background: "rgba(239,246,255,0.10)",
                border: "1px solid rgba(191,219,254,0.18)",
                color: "#e8f1ff",
              }}
              title={hasChildren ? "展开/收起" : "无下属"}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Avatar/Icon */}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(180deg, rgba(239,246,255,0.90), rgba(219,234,254,0.78))",
                border: "1px solid rgba(147,197,253,0.62)",
                boxShadow: "0 14px 30px rgba(7,20,63,0.18)",
              }}
            >
              <User size={14} color="#0b3a82" />
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#e8f1ff" }}>
                  {user.username}
                </span>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    color: chip.fg,
                    background: chip.bg,
                    border: `1px solid ${chip.bd}`,
                  }}
                >
                  {chip.label}
                </span>
              </div>

              <div className="text-[11px]" style={{ color: "rgba(199,219,255,0.82)" }}>
                {user.dept} | {user.phone}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDeleteAdmin(user.id)}
            className="rounded-lg p-2 opacity-0 transition-opacity group-hover:opacity-100"
            title="删除"
            style={{
              background:
                "linear-gradient(180deg, rgba(239,246,255,0.14), rgba(219,234,254,0.08))",
              border: "1px solid rgba(191,219,254,0.18)",
              color: "rgba(199,219,255,0.92)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.border =
                "1px solid rgba(248,113,113,0.45)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fecaca";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.border =
                "1px solid rgba(191,219,254,0.18)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgba(199,219,255,0.92)";
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Render Children Recursively */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {children.map((child) => (
              <TreeNode key={child.id} user={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Find root nodes (HQ Managers)
  const rootUsers = useMemo(() => admins.filter((a) => a.parentId === null), [admins]);

  return (
    <div style={styles.page}>
      <div className="flex h-[calc(100vh-24px)] gap-4">
        {/* Left Column: Admin Tree List */}
        <div className="flex w-1/3 flex-col" style={styles.glassCard}>
          <div style={styles.cardHeader}>
            <div style={styles.titleRow}>
              <Shield size={20} color="#93c5fd" />
              人员架构管理
            </div>
            <div style={styles.subText}>搜索人员 · 展开层级 · 快速维护</div>

            <div className="relative mt-4">
              <input
                type="text"
                placeholder="搜索人员..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
              <Search
                className="absolute left-3 top-2.5"
                size={16}
                color="rgba(11,58,130,0.55)"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rootUsers.length > 0 ? (
              rootUsers.map((root) => <TreeNode key={root.id} user={root} depth={0} />)
            ) : (
              <div className="py-10 text-center" style={{ color: "rgba(199,219,255,0.85)" }}>
                暂无架构数据
              </div>
            )}
          </div>

          <div
            className="px-3 py-2 text-center text-xs"
            style={{
              borderTop: "1px solid rgba(191,219,254,0.18)",
              color: "rgba(199,219,255,0.78)",
              background:
                "linear-gradient(180deg, rgba(15,78,190,0.20), rgba(12,63,156,0.10))",
            }}
          >
            总计 {admins.length} 人员
          </div>
        </div>

        {/* Right Column: Add Form */}
        <div className="flex flex-1 flex-col overflow-y-auto p-8" style={styles.glassCard}>
          <div
            className="mb-6 flex items-center gap-2 pb-4"
            style={{ borderBottom: "1px solid rgba(191,219,254,0.22)" }}
          >
            <UserPlus color="#93c5fd" />
            <div className="text-2xl font-black" style={{ color: "#e8f1ff" }}>
              添加新人员
            </div>
          </div>

          <div className="flex gap-8">
            {/* Form Fields */}
            <div className="w-1/2 space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className="group flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(239,246,255,0.95), rgba(219,234,254,0.90))",
                    border: "2px dashed rgba(147,197,253,0.72)",
                    boxShadow: "0 12px 30px rgba(7,20,63,0.18)",
                  }}
                >
                  <ImageIcon size={24} color="rgba(11,58,130,0.55)" />
                  <span className="mt-1 text-[10px]" style={{ color: "rgba(11,58,130,0.65)" }}>
                    上传头像
                  </span>
                </div>

                <div className="text-sm" style={{ color: "rgba(199,219,255,0.85)" }}>
                  支持 JPG, PNG 格式<br />
                  建议尺寸 200x200
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: "#dbeafe" }}>
                    * 人员级别
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        role: e.target.value as AdminRole,
                        parentId: "", // Reset parent when role changes
                      });
                    }}
                    style={styles.inputPlain}
                  >
                    <option value="HQ Manager">总部负责人 (最高权限)</option>
                    <option value="Project Manager">项目部负责人 (管理权限)</option>
                    <option value="Safety Officer">安全员 (监督权限)</option>
                    <option value="Worker">作业人员 (基础权限)</option>
                  </select>
                </div>

                {/* Dynamic Parent Selector */}
                {form.role !== "HQ Manager" && (
                  <div>
                    <label
                      className="mb-1 flex items-center gap-1 text-sm font-black"
                      style={{ color: "#93c5fd" }}
                    >
                      <CornerDownRight size={14} /> 直属上级 <span style={{ color: "#fecaca" }}>*</span>
                    </label>
                    <select
                      value={form.parentId}
                      onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      style={{
                        ...styles.inputPlain,
                        border: "1px solid rgba(147,197,253,0.82)",
                        boxShadow: "0 0 0 6px rgba(59,130,246,0.10), 0 12px 30px rgba(7,20,63,0.16)",
                      }}
                    >
                      <option value="">-- 请选择上级负责人 --</option>
                      {getPotentialSupervisors(form.role).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.dept})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px]" style={{ color: "rgba(199,219,255,0.78)" }}>
                      {form.role === "Project Manager" && "项目负责人需归属于总部负责人"}
                      {form.role === "Safety Officer" && "安全员需归属于项目负责人"}
                      {form.role === "Worker" && "作业人员需归属于安全员"}
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: "#dbeafe" }}>
                    * 姓名/账号
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    style={styles.inputPlain}
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: "#dbeafe" }}>
                    * 归属部门
                  </label>
                  <input
                    type="text"
                    value={form.dept}
                    onChange={(e) => setForm({ ...form, dept: e.target.value })}
                    style={styles.inputPlain}
                    placeholder="例如：安保部"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: "#dbeafe" }}>
                    手机号码
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={styles.inputPlain}
                    placeholder="请输入联系方式"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold" style={{ color: "#dbeafe" }}>
                    * 初始密码
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={styles.inputPlain}
                    placeholder="设置初始密码"
                  />
                </div>
              </div>
            </div>

            {/* Info / Permissions Preview */}
            <div className="flex-1">
              <div className="mb-4 text-lg font-black" style={{ color: "#93c5fd" }}>
                架构预览
              </div>

              <div className="space-y-4 p-6" style={styles.softPanel}>
                <div className="flex items-start gap-3">
                  <div
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ background: "#93c5fd", boxShadow: "0 0 0 7px rgba(191,219,254,0.20)" }}
                  />
                  <div>
                    <div className="text-sm font-black" style={{ color: "#e8f1ff" }}>
                      当前级别: {getRoleName(form.role)}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "rgba(199,219,255,0.85)" }}>
                      {form.role === "HQ Manager" &&
                        "拥有系统所有模块的完全控制权限，可管理所有项目部。"}
                      {form.role === "Project Manager" &&
                        "拥有本项目部下辖区域的管理权限，可管理安全员和作业人员。"}
                      {form.role === "Safety Officer" &&
                        "负责现场安全监督，处理报警信息，查看监控和轨迹。"}
                      {form.role === "Worker" &&
                        "仅可查看个人信息及相关通知，佩戴智能设备。"}
                    </div>
                  </div>
                </div>

                <div
                  className="pt-4"
                  style={{ borderTop: "1px solid rgba(191,219,254,0.22)" }}
                >
                  <div
                    className="mb-2 text-xs font-black uppercase"
                    style={{ color: "rgba(199,219,255,0.78)" }}
                  >
                    层级关系图谱
                  </div>

                  <div className="relative flex flex-col gap-2 pl-2 text-xs">
                    <div
                      className="absolute left-[1.1rem] top-3 bottom-8 w-px"
                      style={{ background: "rgba(191,219,254,0.28)" }}
                    />

                    {[
                      { key: "HQ Manager", label: "1. 总部负责人", dot: "#f87171" },
                      { key: "Project Manager", label: "2. 项目部负责人", dot: "#fbbf24" },
                      { key: "Safety Officer", label: "3. 安全员", dot: "#60a5fa" },
                      { key: "Worker", label: "4. 作业人员", dot: "#4ade80" },
                    ].map((x, idx) => {
                      const active = form.role === (x.key as AdminRole);
                      const ml = idx * 16;
                      return (
                        <div
                          key={x.key}
                          className="relative flex items-center gap-2 rounded-xl p-2"
                          style={{
                            marginLeft: ml,
                            border: `1px solid ${
                              active ? "rgba(147,197,253,0.82)" : "rgba(191,219,254,0.20)"
                            }`,
                            background: active
                              ? "linear-gradient(180deg, rgba(239,246,255,0.18), rgba(219,234,254,0.10))"
                              : "linear-gradient(180deg, rgba(239,246,255,0.10), rgba(219,234,254,0.06))",
                            color: active ? "#e8f1ff" : "rgba(199,219,255,0.55)",
                            fontWeight: active ? (900 as any) : (600 as any),
                            boxShadow: active ? "0 14px 30px rgba(7,20,63,0.18)" : "none",
                          }}
                        >
                          {idx > 0 && (
                            <div
                              className="absolute -left-4 top-1/2 h-px w-4"
                              style={{ background: "rgba(191,219,254,0.28)" }}
                            />
                          )}
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: x.dot }}
                          />
                          {x.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleAddAdmin}
                  className="flex items-center gap-2 rounded-xl px-8 py-3 font-semibold text-white transition active:scale-95"
                  style={{
                    background: "linear-gradient(180deg, #60a5fa, #2563eb)",
                    border: "1px solid rgba(191,219,254,0.38)",
                    boxShadow: "0 18px 40px rgba(37,99,235,0.28)",
                  }}
                >
                  <Save size={18} /> 保存人员
                </button>

                <button
                  onClick={() =>
                    setForm({
                      username: "",
                      dept: "",
                      phone: "",
                      password: "",
                      role: "Worker",
                      parentId: "",
                    })
                  }
                  className="rounded-xl px-8 py-3 font-semibold transition active:scale-95"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(239,246,255,0.92), rgba(219,234,254,0.86))",
                    border: "1px solid rgba(147,197,253,0.62)",
                    color: "#0b3a82",
                    boxShadow: "0 14px 30px rgba(7,20,63,0.18)",
                  }}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
