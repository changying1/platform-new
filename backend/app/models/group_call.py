from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base
from datetime import datetime

class GroupCallSession(Base):
    __tablename__ = "group_calls"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), unique=True, index=True) # Logic for WebRTC/SIP room
    initiator_id = Column(Integer)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20)) # ACTIVE, ENDED
