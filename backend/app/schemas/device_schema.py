from pydantic import BaseModel
from typing import Optional

class DeviceBase(BaseModel):
    id: str
    device_name: str
    device_type: Optional[str] = "HELMET_CAM"
    ip_address: Optional[str] = "0.0.0.0"
    port: Optional[int] = 8000
    stream_url: Optional[str] = None
    owner_id: Optional[int] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    stream_url: Optional[str] = None
    is_online: Optional[bool] = None
    owner_id: Optional[int] = None
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None

class DeviceOut(DeviceBase):
    is_online: bool
    last_latitude: Optional[float] = None
    last_longitude: Optional[float] = None
    
    class Config:
        from_attributes=True
