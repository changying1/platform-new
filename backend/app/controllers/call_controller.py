from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.call_schema import CallCreate
from app.services.call_service import GroupCallService

router = APIRouter(prefix="/call", tags=["Group Call"])
service = GroupCallService()

@router.post("/initiate")
def start_group_call(call_data: CallCreate, db: Session = Depends(get_db)):
    service.initiate_call(db, call_data.initiator_id, call_data.member_ids)
    return {"message": "Call initiated", "room_id": "123-456"}
