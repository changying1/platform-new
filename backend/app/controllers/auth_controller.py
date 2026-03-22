from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginReq(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    # 1) 用用户名查用户表
    row = db.execute(
        text("""
            SELECT id, username, hashed_password, role, department_id, full_name
            FROM users
            WHERE username = :u
            LIMIT 1
        """),
        {"u": req.username},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=401, detail="账号或密码错误")

    # 2) 校验密码（你当前是明文跑通版，后续可换 bcrypt）
    if (row["hashed_password"] or "") != req.password:
        raise HTTPException(status_code=401, detail="账号或密码错误")

    # 3) 提取角色与分公司/部门ID
    role = (row["role"] or "BRANCH").upper()
    department_id = row["department_id"]

    # 4) 如果是分部账号：用 department_id 去 branches 表拿分公司信息，并做一致性校验
    branch = None
    if role == "BRANCH":
        # department_id 必须存在
        if department_id is None:
            raise HTTPException(status_code=400, detail="分部账号未绑定分公司（users.department_id 为空）")

        b = db.execute(
            text("""
                SELECT
                  id, province, name, lng, lat, address, project, manager, phone,
                  device_count, status, updated_at, remark
                FROM branches
                WHERE id = :bid
                LIMIT 1
            """),
            {"bid": department_id},
        ).mappings().first()

        if not b:
            raise HTTPException(
                status_code=400,
                detail="账号分公司信息未配置正确（users.department_id 未匹配 branches.id）"
            )

        # 返回给前端的分公司对象，格式尽量和 /api/dashboard/branches 一致（含 coord）
        coord = None
        if b["lng"] is not None and b["lat"] is not None:
            coord = [float(b["lng"]), float(b["lat"])]

        branch = {
            "id": int(b["id"]),
            "province": b.get("province") or "",
            "name": b.get("name") or "",
            "coord": coord,
            "address": b.get("address"),
            "project": b.get("project"),
            "manager": b.get("manager"),
            "phone": b.get("phone"),
            "deviceCount": int(b.get("device_count") or 0),
            "status": b.get("status") or "正常",
            "updatedAt": str(b.get("updated_at")) if b.get("updated_at") else None,
            "remark": b.get("remark"),
        }

    # 5) 返回“身份信息 +（可选）分公司信息”
    #    HQ：branch 为 None
    #    BRANCH：branch 为该分公司详情
    return {
        "userId": int(row["id"]),
        "username": row["username"],
        "full_name": row.get("full_name"),
        "role": role,
        "department_id": department_id,
        "branch": branch,
    }
