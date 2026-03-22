from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
# 统一使用 video_schema 以匹配模块结构
from app.schemas.video_schema import VideoCreate, VideoOut, VideoUpdate, CameraCreateRequest, PTZControlRequest
from app.services.video_service import VideoService
import cv2
import time
import threading
# --- 在现有的 import 语句下面添加 ---
from app.services.ai_manager import ai_manager
from pydantic import BaseModel
from app.services.ai_features.registry import list_rules

router = APIRouter(prefix="/video", tags=["Video Surveillance"])
service = VideoService()


# --- 放在 router 定义之前或之后都可以，只要在下面的接口用到它之前 ---
class AIMonitorRequest(BaseModel):
    device_id: str
    rtsp_url: str
    algo_type: str = "helmet"

@router.post("/ai/start")
async def start_ai(req: AIMonitorRequest):
    """开启 AI 监控"""
    # --- 2. 传参给 manager ---
    success = ai_manager.start_monitoring(req.device_id, req.rtsp_url, req.algo_type)
    if success:
        return {"code": 200, "message": f"AI监控已启动: {req.algo_type}"}
    else:
        return {"code": 400, "message": "启动失败或已在运行"}

@router.get("/ai/rules")
def get_ai_rules():
    """获取限定的 AI 规则列表，只保留客户要求的 6 类"""
    rules = list_rules()
    
    # 客户要求的 6 类算法 Key (对应 backend 注册的真实 Key)
    # 1. 安全帽 -> helmet
    # 2. 现场标识 -> signage (从 site_signage.py 确认)
    # 3. 监管人数 -> supervisor_count
    # 4. 梯子角度 -> ladder_angle
    # 5. 孔口挡坎 -> hole_curb
    # 6. 入侵管理 -> unauthorized_person (对应围栏入侵)
    
    allowed_keys = [
        "helmet",
        "signage",
        "supervisor_count",
        "ladder_angle",
        "hole_curb",
        "unauthorized_person"
    ]
    
    # 统一转换显示名称（覆盖后端定义，匹配前端要求）
    display_names = {
        "helmet": "安全帽类",
        "signage": "现场标识类",
        "supervisor_count": "现场监督人数统计",
        "ladder_angle": "梯子角度类",
        "hole_curb": "孔口挡坎违规类",
        "unauthorized_person": "围栏入侵管理类"
    }
    
    result = []
    for key in allowed_keys:
        if key in rules:
            result.append({
                "key": key,
                "desc": display_names.get(key, rules[key].desc)
            })
            
    return {
        "code": 0,
        "data": result
    }

@router.post("/add_camera", response_model=VideoOut)
def add_camera_dynamically(camera: CameraCreateRequest, db: Session = Depends(get_db)):
    """
    Dynamically adds a new camera by commanding the media server
    and then creating a record in the database.
    """
    try:
        return service.add_camera_to_media_server(db, camera)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[VideoOut])
def read_videos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """获取所有视频设备列表"""
    return service.get_videos(db, skip=skip, limit=limit)

@router.post("/", response_model=VideoOut)
def create_video(video: VideoCreate, db: Session = Depends(get_db)):
    """手动创建/添加视频设备"""
    try:
        return service.create_video(db, video)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 添加通用异常捕获，防止任何未预料的错误（如数据库连接失败、模型字段不匹配等）导致服务器崩溃并返回HTML
        # 在生产环境中，应该使用更精细的日志记录
        print(f"An unexpected error occurred: {e}") # 临时用于调试
        raise HTTPException(status_code=500, detail="An internal server error occurred while creating the video.")

@router.put("/{video_id}", response_model=VideoOut)
def update_video(video_id: int, video: VideoUpdate, db: Session = Depends(get_db)):
    """更新视频设备信息"""
    updated_video = service.update_video(db, video_id, video)
    if not updated_video:
        raise HTTPException(status_code=404, detail="Video device not found")
    return updated_video

@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """删除视频设备"""
    success = service.delete_video(db, video_id)
    if not success:
        raise HTTPException(status_code=404, detail="Video device not found")
    return {"status": "success"}

@router.post("/sync")
def sync_devices(db: Session = Depends(get_db)):
    """从海康威视等平台同步设备列表"""
    service.sync_hikvision_devices(db)
    return {"message": "Sync started"}

@router.get("/stream/{video_id}")
def get_video_stream(video_id: int, db: Session = Depends(get_db)):
    """获取指定设备的流媒体地址"""
    url = service.get_stream_url(db, video_id)
    if not url:
        raise HTTPException(status_code=404, detail="Stream URL not found or device offline")
    return {"url": url}


def _mjpeg_frame_generator(rtsp_url: str):
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        # 延时重试几次，避免瞬时失败
        for _ in range(5):
            time.sleep(0.3)
            cap.open(rtsp_url)
            if cap.isOpened():
                break
    if not cap.isOpened():
        # 生成一个空白帧作为错误提示
        img = (255 * (1 - 0)).astype('uint8') if False else None
        # 无法打开时直接结束生成器
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            # 可按需缩放，减少带宽/CPU
            # frame = cv2.resize(frame, (960, 540))
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not ret:
                continue
            jpg_bytes = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n")
            time.sleep(0.03)  # ~30fps 限速，防止过载
    finally:
        cap.release()


@router.get("/mjpeg/{video_id}")
def get_video_mjpeg(video_id: int, db: Session = Depends(get_db)):
    """
    提供简易 MJPEG 实时预览流（multipart/x-mixed-replace）。
    适合快速演示，但占用 CPU，生产建议接入 MediaMTX/ZLMediaKit 或 HLS/WebRTC。
    """
    url = service.get_stream_url(db, video_id)
    if not url:
        raise HTTPException(status_code=404, detail="Stream URL not found or device offline")
    return StreamingResponse(_mjpeg_frame_generator(url), media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/ptz/{video_id}")
def ptz_control(video_id: int, body: PTZControlRequest, db: Session = Depends(get_db)):
    """云台控制接口，前端发送方向和速度，然后通过 ONVIF 控制摄像头"""
    try:
        # 添加日志
        import logging
        logger_temp = logging.getLogger("ptz_control")
        logger_temp.info(f"收到PTZ请求 - video_id: {video_id}, direction: {body.direction}, direction.value: {body.direction.value}, speed: {body.speed}, duration: {body.duration}")
        
        service.ptz_move(db, video_id, body.direction.value, body.speed or 0.5, body.duration or 0.5)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PTZ 控制失败: {e}")

@router.post("/ptz/{video_id}/start")
def ptz_start(video_id: int, body: PTZControlRequest, db: Session = Depends(get_db)):
    """云台持续移动（按下开始），前端按键按下时调用"""
    try:
        service.ptz_start_move(db, video_id, body.direction.value, body.speed or 0.5)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PTZ 启动失败: {e}")


@router.post("/ptz/{video_id}/stop")
def ptz_stop(video_id: int, db: Session = Depends(get_db)):
    """云台停止移动（松开停止），前端按键松开时调用"""
    try:
        service.ptz_stop_move(db, video_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PTZ 停止失败: {e}")

# --- 文件末尾保留 stop 接口即可 ---

@router.post("/ai/stop")
async def stop_ai(device_id: str):
    """停止 AI 监控"""
    success = ai_manager.stop_monitoring(device_id)
    if success:
        return {"code": 200, "message": "AI监控已停止"}
    else:
        return {"code": 400, "message": "停止失败或未运行"}