from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_user  # ✅ 新增：按你项目实际路径调整

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    顶部统计：改为返回分公司的项目列表信息
    """
    from app.models.project import Project
    
    # 过滤器逻辑: 只要有 department_id 且不为0 (总部)，就强制过滤
    dept_id = user.get("department_id")

    query = db.query(Project)
    
    # Strict filtering: If user belongs to a department (and not HQ=0), filter by it.
    if dept_id and dept_id != 0:
        query = query.filter(Project.branch_id == dept_id)
        
    projects = query.all()
    
    # 构建返回数据
    data = []
    for p in projects:
        # 计算该项目的报警数 (简单处理：暂时返回0，或者需要跨表查询)
        # 这里为了性能先只返回基本信息 + 设备数
        data.append({
            "id": p.id,
            "name": p.name,
            "branch_id": p.branch_id,
            "manager": p.manager,
            "status": p.status,
            "deviceCount": len(p.devices),
            "userCount": len(p.users),
            "fenceCount": len(p.regions)  # 假设 regions 对应围栏/区域
        })
        
    return data


@router.get("/branches")
def list_branches(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),  # ✅ 新增：仅用于判断 HQ / BRANCH
):
    """
    分公司列表：给前端地图展示使用
    前端需要 coord: [lng, lat]（经度在前）
    """
    # ✅ 仅增加：总部/分部可见性控制
    # 只要有 department_id 且不为0 (总部)，就强制过滤
    where_sql = ""
    params = {}
    dept_id = user.get("department_id")
    
    if dept_id and dept_id != 0:
        where_sql = "WHERE id = :bid"
        params["bid"] = dept_id

    rows = db.execute(text(f"""
        SELECT
          id, province, name, lng, lat, address, project, manager, phone,
          device_count, status, updated_at, remark
        FROM branches
        {where_sql}
        ORDER BY id ASC
    """), params).mappings().all()

    data = []
    for r in rows:
        coord = None
        if r["lng"] is not None and r["lat"] is not None:
            coord = [float(r["lng"]), float(r["lat"])]

        data.append({
            "id": int(r["id"]),
            "province": r.get("province") or "",
            "name": r.get("name") or "",
            "coord": coord,  # [lng, lat]
            "address": r.get("address"),
            "project": r.get("project"),
            "manager": r.get("manager"),
            "phone": r.get("phone"),
            "deviceCount": int(r.get("device_count") or 0),
            "status": r.get("status") or "正常",
            "updatedAt": str(r.get("updated_at")) if r.get("updated_at") else None,
            "remark": r.get("remark"),
        })

    return data


@router.get("/alarms")
def list_dashboard_alarms(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    limit: int = 10
):
    """
    Get recent alarm records for the dashboard
    """
    from app.models.alarm_records import AlarmRecord
    from app.models.project import Project
    from app.models.branches import Branch
    
    dept_id = user.get("department_id")
    
    # 直接通过 project_id 关联，不再需要 device→project_devices 的间接 JOIN
    query = db.query(AlarmRecord, Branch.name.label("branch_name"))\
        .outerjoin(Project, AlarmRecord.project_id == Project.id)\
        .outerjoin(Branch, Project.branch_id == Branch.id)
        
    if dept_id and dept_id != 0:
        query = query.filter(Project.branch_id == dept_id)
        
    # Get latest alarms
    alarms = query.order_by(AlarmRecord.timestamp.desc()).limit(limit).all()
    
    result = []
    for alarm, branch_name in alarms:
        result.append({
            "id": alarm.id,
            "alarm_type": alarm.alarm_type,
            "severity": alarm.severity,
            "description": alarm.description,
            "timestamp": alarm.timestamp.strftime("%Y-%m-%d %H:%M:%S") if alarm.timestamp else None,
            "status": alarm.status,
            "project_id": alarm.project_id,
            "branch_name": branch_name or "未知"
        })
        
    return result
