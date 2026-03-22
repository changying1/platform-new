from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.fence_schema import (
    FenceCreate, FenceOut, FenceUpdate,
    ProjectRegionCreate, ProjectRegionOut, ProjectRegionUpdate
)
from app.services.fence_service import FenceService

router = APIRouter(prefix="/fence", tags=["Electronic Fence"])
service = FenceService()

# --- Project Region Endpoints ---

@router.get("/regions", response_model=List[ProjectRegionOut])
def read_regions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.get_project_regions(db, skip=skip, limit=limit)

@router.post("/regions", response_model=ProjectRegionOut)
def create_region(region: ProjectRegionCreate, db: Session = Depends(get_db)):
    return service.create_project_region(db, region)

@router.put("/regions/{region_id}", response_model=ProjectRegionOut)
def update_region(region_id: int, region: ProjectRegionUpdate, db: Session = Depends(get_db)):
    updated = service.update_project_region(db, region_id, region)
    if not updated:
        raise HTTPException(status_code=404, detail="Region not found")
    return updated

@router.delete("/regions/{region_id}")
def delete_region(region_id: int, db: Session = Depends(get_db)):
    success = service.delete_project_region(db, region_id)
    if not success:
        raise HTTPException(status_code=404, detail="Region not found")
    return {"status": "success"}

# --- Electronic Fence Endpoints ---

@router.get("/", response_model=List[FenceOut])
def read_fences(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.get_fences(db, skip=skip, limit=limit)

@router.post("/", response_model=FenceOut)
def create_fence(fence: FenceCreate, db: Session = Depends(get_db)):
    try:
        return service.create_fence(db, fence)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{fence_id}", response_model=FenceOut)
def update_fence(fence_id: int, fence: FenceUpdate, db: Session = Depends(get_db)):
    updated_fence = service.update_fence(db, fence_id, fence)
    if not updated_fence:
        raise HTTPException(status_code=404, detail="Fence not found")
    return updated_fence

@router.delete("/{fence_id}")
def delete_fence(fence_id: int, db: Session = Depends(get_db)):
    success = service.delete_fence(db, fence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fence not found")
    return {"status": "success"}

@router.post("/check-status")
def check_fence_violation(device_id: str, lat: float, lng: float, db: Session = Depends(get_db)):
    # This endpoint receives GPS updates from the helmet
    service.check_fence_status(db, device_id, lat, lng)
    return {"status": "checked"}
