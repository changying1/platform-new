# 项目管理模块

## 目录结构

```
Project/
├── components/          # UI组件
│   ├── SearchBar.tsx   # 搜索栏
│   ├── ProjectCard.tsx # 项目卡片
│   └── ProjectModal.tsx # 创建/编辑模态框
├── hooks/              # 自定义Hooks
│   ├── useProjectLogic.ts  # 业务逻辑
│   └── useProjectForm.ts   # 表单管理
├── types.ts            # 类型定义
└── index.tsx           # 主入口
```

## 功能说明

### 1. 项目列表

- 展示所有项目的概览信息
- 显示统计数据（人员、设备、区域、围栏数量）
- 支持按项目名称搜索

### 2. 项目详情

- 点击项目卡片展开查看详细信息
- 查看关联的人员列表
- 查看关联的设备列表（含在线状态）
- 查看项目区域
- 查看项目下的所有电子围栏

### 3. 项目管理

- 创建新项目
- 编辑现有项目
- 删除项目
- 选择关联的人员、设备、区域

## 数据流

1. **初始化**: `useProjectLogic` Hook 在组件挂载时获取项目列表
2. **搜索**: 用户输入搜索关键词，调用 `fetchProjects` 重新获取数据
3. **展开**: 点击项目卡片，调用 `toggleProject` 获取详细信息和围栏数据
4. **编辑**: 使用 `useProjectForm` 管理表单状态，提交后刷新数据

## API接口

- `GET /api/projects/` - 获取项目列表
- `GET /api/projects/{id}` - 获取项目详情
- `GET /api/projects/{id}/fences` - 获取项目围栏
- `POST /api/projects/` - 创建项目
- `PUT /api/projects/{id}` - 更新项目
- `DELETE /api/projects/{id}` - 删除项目
