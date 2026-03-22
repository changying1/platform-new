from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admin_schema import UserCreate, UserUpdate, UserOut
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])
service = AdminService()

from app.core.security import get_current_user
from app.models.admin_user import User

@router.get("/users", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db)):
    # Using get_users_by_hierarchy with 0 or None to get all
    return service.get_users_by_hierarchy(db, 0)

@router.post("/users", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Logic for Department ID inheritance
    # 1. If assigned a parent (Supervisor), inherit their department
    if user.parent_id:
        parent_user = db.query(User).filter(User.id == user.parent_id).first()
        if parent_user and parent_user.department_id:
            user.department_id = parent_user.department_id

    # 2. If the creator plays a role in a department, the new user must be in the same department
    # Note: department_id=0 usually means HQ/Super Admin, so we shouldn't restrict if it's 0.
    cid = current_user["department_id"]
    if cid is not None and cid != 0:
        user.department_id = cid
    
    return service.create_user(db, user)

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # 1. Check permissions (Optional: Can only update subordinates?)
    # For now, allow department admin to update anyone they can see (logic in frontend/service usually restricts visibility)
    
    # 2. Logic for Department ID inheritance/restriction during update
    # If the updater is restricted to a department, they can't change the user's department to something else
    # Or, if they change the parent, the department might need to change automatically
    
    if current_user["department_id"] is not None and current_user["department_id"] != 0:
         # Enforce that the user remains in the updater's department
         user_data.department_id = current_user["department_id"]
    
    # Logic: If parent_id is changed, re-evaluate department_id
    if user_data.parent_id:
        parent_user = db.query(User).filter(User.id == user_data.parent_id).first()
        if parent_user and parent_user.department_id:
            user_data.department_id = parent_user.department_id

    updated_user = service.update_user(db, user_id, user_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return updated_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    success = service.delete_user(db, user_id)
    return {"success": success}

@router.get("/users/hierarchy/{user_id}")
def get_subordinates(user_id: int, db: Session = Depends(get_db)):
    return service.get_users_by_hierarchy(db, user_id)
