from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.device import Device
from app.schemas.device_schema import DeviceOut, DeviceCreate, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=list[DeviceOut])
def get_devices(db: Session = Depends(get_db)):
    return db.query(Device).all()

@router.post("/", response_model=DeviceOut)
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    db_device = Device(**device_in.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/{device_id}", response_model=DeviceOut)
def update_device(device_id: str, device_in: DeviceUpdate, db: Session = Depends(get_db)):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device

@router.delete("/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(db_device)
    db.commit()
    return {"status": "success"}
