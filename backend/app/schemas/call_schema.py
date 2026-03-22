from pydantic import BaseModel
from typing import List

class CallCreate(BaseModel):
    initiator_id: int
    member_ids: List[int]
