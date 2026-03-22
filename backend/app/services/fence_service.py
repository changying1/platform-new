import json
import math
from datetime import datetime, time
from sqlalchemy.orm import Session
from app.models.fence import ElectronicFence, ProjectRegion
from app.models.device import Device
from app.schemas.fence_schema import FenceCreate, FenceUpdate, ProjectRegionCreate, ProjectRegionUpdate
from app.schemas.alarm_schema import AlarmCreate
from app.services.alarm_service import AlarmService
from app.utils.logger import get_logger
from app.models.alarm_records import AlarmRecord

logger = get_logger("FenceService")


class FenceService:
    # --- Project Region CRUD ---
    def create_project_region(self, db: Session, region_data: ProjectRegionCreate):
        logger.info(f"Creating new project region: {region_data.name}")
        new_region = ProjectRegion(
            name=region_data.name,
            coordinates_json=region_data.coordinates_json,
            remark=region_data.remark
        )
        db.add(new_region)
        db.commit()
        db.refresh(new_region)
        return new_region

    def get_project_regions(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(ProjectRegion).offset(skip).limit(limit).all()

    def update_project_region(self, db: Session, region_id: int, region_data: ProjectRegionUpdate):
        db_region = db.query(ProjectRegion).filter(ProjectRegion.id == region_id).first()
        if not db_region:
            return None
        
        update_data = region_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_region, key, value)
        
        db.commit()
        db.refresh(db_region)
        return db_region

    def delete_project_region(self, db: Session, region_id: int):
        db_region = db.query(ProjectRegion).filter(ProjectRegion.id == region_id).first()
        if db_region:
            # Set project_region_id to NULL for associated fences
            db.query(ElectronicFence).filter(ElectronicFence.project_region_id == region_id).update({"project_region_id": None})
            db.delete(db_region)
            db.commit()
            return True
        return False

    def is_device_inside_project_region(self, region: ProjectRegion, device: Device) -> bool:
        if not device.last_latitude or not device.last_longitude:
            return False
        try:
            poly_points = json.loads(region.coordinates_json)
            poly = []
            for p in poly_points:
                if isinstance(p, list) and len(p) >= 2:
                    poly.append((float(p[1]), float(p[0])))
                elif isinstance(p, dict):
                    poly.append((float(p.get("lng")), float(p.get("lat"))))
            return self._is_inside_polygon((device.last_longitude, device.last_latitude), poly)
        except Exception:
            return False

    def create_fence(self, db: Session, fence_data: FenceCreate):
        logger.info(f"Creating new fence: {fence_data.name} ({fence_data.shape})")

        # Basic validation logic could go here
        if fence_data.shape == "circle" and not fence_data.radius:
            raise ValueError("Radius is required for circular fences")

        new_fence = ElectronicFence(
            name=fence_data.name,
            project_region_id=fence_data.project_region_id,
            shape=fence_data.shape,
            behavior=fence_data.behavior,
            coordinates_json=fence_data.coordinates_json,
            radius=fence_data.radius,
            effective_time=fence_data.effective_time,
            remark=fence_data.remark,
            alarm_type=fence_data.alarm_type,
        )
        db.add(new_fence)
        db.commit()
        db.refresh(new_fence)

        # Immediate check for existing devices
        self._check_existing_devices(db, new_fence)

        return new_fence

    def _check_existing_devices(self, db: Session, fence: ElectronicFence):
        """Check all devices against the newly created fence."""
        logger.info(f"Checking existing devices for fence {fence.name}")
        devices = (
            db.query(Device)
            .filter(Device.last_latitude.isnot(None), Device.last_longitude.isnot(None))
            .all()
        )

        count = 0
        for device in devices:
            if self.check_device_against_fence(db, fence, device):
                count += 1
        
        self._update_fence_count(db, fence)
        logger.info(f"Fence creation check: Triggered {count} alarms.")

    def update_fence(self, db: Session, fence_id: int, fence_data: FenceUpdate):
        logger.info(f"Updating fence ID: {fence_id}")
        db_fence = (
            db.query(ElectronicFence).filter(ElectronicFence.id == fence_id).first()
        )
        if not db_fence:
            return None

        # Update fields if they are provided (not None)
        update_data = fence_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_fence, key, value)

        db.commit()
        self._update_fence_count(db, db_fence)
        db.refresh(db_fence)
        return db_fence

    def get_fences(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(ElectronicFence).offset(skip).limit(limit).all()

    def delete_fence(self, db: Session, fence_id: int):
        db_fence = (
            db.query(ElectronicFence).filter(ElectronicFence.id == fence_id).first()
        )
        if db_fence:
            # Set fence_id to NULL for associated alarms instead of deleting them
            db.query(AlarmRecord).filter(AlarmRecord.fence_id == fence_id).update({"fence_id": None})
            db.delete(db_fence)
            db.commit()
            return True
        return False

    def check_fence_status(self, db: Session, device_id: str, lat: float, lng: float):
        """
        Check if a specific device (with new coordinates) violates any active fence.
        This is typically called by a location update stream.
        """
        # Update device location first
        device = db.query(Device).filter(Device.id == device_id).first()
        if device:
            device.last_latitude = lat
            device.last_longitude = lng
            db.commit()  # Save the new location
        else:
            logger.warning(f"Device {device_id} not found during fence check.")
            return

        active_fences = (
            db.query(ElectronicFence).filter(ElectronicFence.is_active == 1).all()
        )
        for fence in active_fences:
            if self.is_fence_active_now(fence):
                self.check_device_against_fence(db, fence, device)
            self._update_fence_count(db, fence)

    def is_fence_active_now(self, fence: ElectronicFence) -> bool:
        """Check if the fence is within its effective time range."""
        if not fence.is_active:
            return False
        if not fence.effective_time or '-' not in fence.effective_time:
            return True
            
        try:
            now = datetime.now().time()
            start_str, end_str = fence.effective_time.split('-')
            
            start_t = self._parse_time_str(start_str)
            end_t = self._parse_time_str(end_str)
            
            if start_t <= end_t:
                return start_t <= now <= end_t
            else: # Overnight range
                return now >= start_t or now <= end_t
        except Exception as e:
            logger.error(f"Error checking fence time: {e}")
            return True

    def _parse_time_str(self, time_str: str) -> time:
        """Parse 'HH:mm' or 'HH.mm' style strings."""
        ts = time_str.strip().replace('.', ':')
        parts = ts.split(':')
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return time(h, m)

    def is_device_inside_fence(self, fence: ElectronicFence, device: Device) -> bool:
        """Helper to determine if a device is currently inside a fence boundary."""
        if not device.last_latitude or not device.last_longitude:
            return False

        gcj_lat, gcj_lng = device.last_latitude, device.last_longitude

        if fence.shape == "circle":
            try:
                center = json.loads(fence.coordinates_json)
                center_lat, center_lng = 0.0, 0.0
                if isinstance(center, list) and len(center) >= 2:
                    center_lat, center_lng = float(center[0]), float(center[1])
                elif isinstance(center, dict):
                    center_lat = float(center.get("lat", 0))
                    center_lng = float(center.get("lng", 0))
                
                dist = self._get_distance(gcj_lat, gcj_lng, center_lat, center_lng)
                return dist <= (fence.radius or 0)
            except Exception:
                return False

        elif fence.shape == "polygon":
            try:
                polygon_points = json.loads(fence.coordinates_json)
                poly = []
                for p in polygon_points:
                    if isinstance(p, list) and len(p) >= 2:
                        poly.append((float(p[1]), float(p[0])))
                    elif isinstance(p, dict):
                        poly.append((float(p.get("lng")), float(p.get("lat"))))
                return self._is_inside_polygon((gcj_lng, gcj_lat), poly)
            except Exception:
                return False
        return False

    def _update_fence_count(self, db: Session, fence: ElectronicFence):
        """Recalculate and update the worker_count (violator count) for a fence."""
        # If fence is not active or out of time range, count is 0
        if not self.is_fence_active_now(fence):
            fence.worker_count = 0
            db.commit()
            return

        devices = db.query(Device).filter(Device.last_latitude.isnot(None)).all()
        count = 0
        for device in devices:
            if self.check_device_violation(db, fence, device):
                count += 1
        
        fence.worker_count = count
        db.commit()

    def check_device_violation(self, db: Session, fence: ElectronicFence, device: Device) -> bool:
        """Determine if a device is violating a fence's rules."""
        is_inside = self.is_device_inside_fence(fence, device)
        
        if fence.behavior == "No Entry":
            return is_inside
        elif fence.behavior == "No Exit":
            # If targeted to a project region, only violate if inside region but outside fence
            if fence.project_region_id:
                region = fence.project_region
                if not region: # Backup fetch if relationship is lazy or not loaded
                    region = db.query(ProjectRegion).filter(ProjectRegion.id == fence.project_region_id).first()
                if region:
                    is_in_region = self.is_device_inside_project_region(region, device)
                    return is_in_region and not is_inside
                return False # Avoid global alarms if region ID is set but region doesn't exist
            else:
                return not is_inside
        return is_inside

    def check_device_against_fence(
        self, db: Session, fence: ElectronicFence, device: Device
    ) -> bool:
        """
        Core logic to check one device against one fence.
        Returns True if an alarm was triggered, False otherwise.
        """
        violation = self.check_device_violation(db, fence, device)
        gcj_lat, gcj_lng = device.last_latitude, device.last_longitude

        if violation:
            description = ""
            if fence.behavior == "No Entry":
                description = f"Device {device.device_name} entered restricted area: {fence.name}"
            else:
                description = f"Device {device.device_name} left designated area: {fence.name}"

            # Check for duplicate ACTIVE alarms for this device and fence
            existing_alarm = (
                db.query(AlarmRecord)
                .filter(
                    AlarmRecord.device_id == device.id,
                    AlarmRecord.fence_id == fence.id,
                    AlarmRecord.status == "pending",
                )
                .first()
            )

            if existing_alarm:
                return False  # Already alarmed

            logger.warning(f"  VIOLATION DETECTED: {description}")
            alarm_service = AlarmService()
            loc_str = f"{gcj_lat:.6f}, {gcj_lng:.6f}"

            # Determine distinct alarm type based on behavior
            current_alarm_type = "电子围栏越界"  # Default / No Exit
            if fence.behavior == "No Entry":
                current_alarm_type = "电子围栏闯入"

            alarm_data = AlarmCreate(
                device_id=device.id,
                fence_id=fence.id,
                alarm_type=current_alarm_type,
                severity=(
                    fence.alarm_type.value
                    if hasattr(fence.alarm_type, "value")
                    else "high"
                ),
                description=description,
                location=loc_str,
                status="pending",
            )
            try:
                alarm_service.create_alarm(db, alarm_data)
                return True
            except Exception as e:
                logger.error(f"Failed to create alarm: {e}")

        return False

    def _get_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate Haversine distance between two points in meters.
        """
        R = 6371000  # Radius of Earth in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _is_inside_polygon(self, point, polygon):
        """
        Ray casting algorithm to check if point is inside polygon.
        point: (lng, lat) -> (x, y)
        polygon: list of (lng, lat)
        """
        if not polygon:
            return False
        x, y = point
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside
