from sqlalchemy.orm import Session
from app.models.admin_user import User
from app.schemas.admin_schema import UserCreate, UserUpdate
from app.utils.logger import get_logger

logger = get_logger("AdminService")

class AdminService:
    def create_user(self, db: Session, user_data: UserCreate):
        logger.info(f"Creating new user: {user_data.username} with role {user_data.role}")
        # Note: Using plaintext password to match existing auth_controller logic.
        # In production, use bcrypt/argon2.
        new_user = User(
            username=user_data.username,
            hashed_password=user_data.password, # Storing plaintext as per current system design
            role=user_data.role,
            phone=user_data.phone,
            department=user_data.department,
            department_id=user_data.department_id,
            parent_id=user_data.parent_id,
            full_name=user_data.full_name or user_data.username
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        db.refresh(new_user)
        return new_user

    def update_user(self, db: Session, user_id: int, user_data: UserUpdate):
        logger.info(f"Updating user {user_id}")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Update fields if provided
        if user_data.username is not None:
            user.username = user_data.username
        if user_data.password is not None and user_data.password != "":
            # In production, hash this
            user.hashed_password = user_data.password
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        if user_data.role is not None:
            user.role = user_data.role
        if user_data.phone is not None:
            user.phone = user_data.phone
        if user_data.department is not None:
            user.department = user_data.department
        if user_data.parent_id is not None:
             user.parent_id = user_data.parent_id
        if user_data.department_id is not None:
             user.department_id = user_data.department_id
             
        db.commit()
        db.refresh(user)
        return user

    def get_users_by_hierarchy(self, db: Session, user_id: int):
        """
        Fetch all users. Logic can be extended to filter by hierarchy.
        For now, returning all users for the admin view.
        """
        logger.info(f"Fetching users (hierarchy context for {user_id})")
        return db.query(User).all()

    def delete_user(self, db: Session, user_id: int):
        logger.info(f"Deleting user {user_id}")
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False
