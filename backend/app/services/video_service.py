import json
from sqlalchemy.orm import Session
from urllib.parse import urlparse
from app.models.video import VideoDevice
from app.models.device import Device
from app.schemas.video_schema import VideoCreate, VideoUpdate, CameraCreateRequest
from app.utils.logger import get_logger
import requests
import os
import glob
import time
import subprocess
import signal
from datetime import datetime, timedelta, timezone
import logging
import sys
import hashlib
import base64
import uuid
from pathlib import Path
from typing import Optional, List

RECORDING_PROCESSES = {}

# [日志压制]
def suppress_verbose_logging():
    for logger_name in ["zeep", "urllib3", "onvif", "wsdl", "requests"]:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.CRITICAL)
        logger.propagate = False

suppress_verbose_logging()

from app.models.alarm_records import AlarmRecord
from app.core.database import SessionLocal

try:
    import onvif
    from onvif import ONVIFCamera
except Exception:
    onvif = None
    ONVIFCamera = None

logger = get_logger("VideoService")

# --- 配置部分 ---
NMS_HOST = "http://127.0.0.1:8001"
NMS_USER = "admin"
NMS_PASS = "123456" 
NMS_MEDIA_ROOT = os.path.abspath(os.getenv("NMS_MEDIA_ROOT", r"C:\media"))

# --- 全局缓存 ---
ONVIF_CLIENT_CACHE = {}

# [新增] 全局字典：用于存储正在运行的 FFmpeg 进程 {stream_name: process_object}
FFMPEG_PROCESSES = {}

class VideoService:
    # -------------------------------------------------------------------------
    # 核心 1: 获取连接
    # -------------------------------------------------------------------------
    def _get_onvif_service(self, db_video):
        global ONVIF_CLIENT_CACHE
        if not ONVIFCamera: raise ImportError("ONVIF library missing")

        if db_video.id in ONVIF_CLIENT_CACHE:
            try:
                cam = ONVIF_CLIENT_CACHE[db_video.id]
                return cam, cam.create_ptz_service(), cam.create_media_service()
            except Exception:
                if db_video.id in ONVIF_CLIENT_CACHE: del ONVIF_CLIENT_CACHE[db_video.id]

        logger.info(f"Connecting to {db_video.ip_address}...")
        
        try:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            root_dir = os.path.dirname(base_dir)
            possible_paths = [
                os.path.join(root_dir, 'wsdl'),
                os.path.join(base_dir, 'wsdl'),
                os.path.join(os.getcwd(), 'wsdl')
            ]
            
            wsdl_path = None
            for p in possible_paths:
                if os.path.exists(p) and os.path.isdir(p):
                    wsdl_path = p
                    logger.info(f"Loaded local WSDL from: {p}")
                    break
            
            kwargs = {'no_cache': False}
            if wsdl_path:
                kwargs['wsdl_dir'] = wsdl_path

            camera = ONVIFCamera(
                db_video.ip_address, db_video.port or 80, 
                db_video.username, db_video.password, 
                **kwargs
            )
            
            ONVIF_CLIENT_CACHE[db_video.id] = camera
            return camera, camera.create_ptz_service(), camera.create_media_service()
            
        except Exception as e:
            logger.error(f"Connection Failed: {e}")
            raise ValueError(f"连接失败: {e}")

    # -------------------------------------------------------------------------
    # 辅助: 生成 WS-Security Header (模拟 ODM 认证)
    # -------------------------------------------------------------------------
    def _generate_wsse_header(self, username, password):
        nonce_raw = os.urandom(16)
        nonce_b64 = base64.b64encode(nonce_raw).decode('utf-8')
        created = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.000Z')
        
        sha1 = hashlib.sha1()
        sha1.update(nonce_raw)
        sha1.update(created.encode('utf-8'))
        sha1.update(password.encode('utf-8'))
        digest = base64.b64encode(sha1.digest()).decode('utf-8')
        
        return f"""<s:Header>
    <Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <UsernameToken>
            <Username>{username}</Username>
            <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{digest}</Password>
            <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{nonce_b64}</Nonce>
            <Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">{created}</Created>
        </UsernameToken>
    </Security>
</s:Header>"""

    # -------------------------------------------------------------------------
    # 核心 2: 原始 SOAP 停止 (ODMFix)
    # -------------------------------------------------------------------------
    def _send_raw_soap_stop(self, camera, ptz_service, profile_token, username, password):
        ptz_url = None
        if hasattr(ptz_service, 'binding') and hasattr(ptz_service.binding, 'options'):
            ptz_url = ptz_service.binding.options.get('address')
        if not ptz_url:
            ptz_url = camera.xaddrs.get('http://www.onvif.org/ver20/ptz/wsdl')
        
        if not ptz_url:
            logger.error("No PTZ URL found")
            return False

        security_header = self._generate_wsse_header(username, password)

        payloads = [
            # 方案 0: Wireshark 抓包复刻
            f"""<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  {security_header}
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Stop xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>{profile_token}</ProfileToken>
      <PanTilt>true</PanTilt>
      <Zoom>false</Zoom>
    </Stop>
  </s:Body>
</s:Envelope>""",
            # 方案 A: 备用
            f"""<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
  {security_header}
  <s:Body>
    <tptz:Stop>
      <tptz:ProfileToken>{profile_token}</tptz:ProfileToken>
      <tptz:PanTilt>true</tptz:PanTilt>
      <tptz:Zoom>true</tptz:Zoom>
    </tptz:Stop>
  </s:Body>
</s:Envelope>""",
            # 方案 B: 备用
            f"""<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
  {security_header}
  <s:Body>
    <tptz:Stop>
      <tptz:ProfileToken>{profile_token}</tptz:ProfileToken>
      <tptz:PanTilt>1</tptz:PanTilt>
      <tptz:Zoom>1</tptz:Zoom>
    </tptz:Stop>
  </s:Body>
</s:Envelope>"""
        ]

        headers = {
            'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.onvif.org/ver20/ptz/wsdl/Stop"'
        }

        for i, payload in enumerate(payloads):
            try:
                response = requests.post(ptz_url, data=payload, headers=headers, timeout=2)
                if 200 <= response.status_code < 300:
                    logger.info(f"Raw SOAP Variant {i} (Capture Match) SUCCESS")
                    return True
                else:
                    logger.warning(f"Raw SOAP Variant {i} Failed: {response.status_code}")
            except Exception as e:
                logger.error(f"Raw SOAP Variant {i} Error: {e}")
        return False

    def ptz_stop_move(self, db: Session, video_id: int):
        db_video = db.query(VideoDevice).filter(VideoDevice.id == video_id).first()
        if not db_video: raise ValueError("Device not found")

        try:
            camera, ptz, media = self._get_onvif_service(db_video)
            token = self._get_profile_token(media)
            
            logger.info(f"STOPPING {db_video.name} using ODM Raw Mode...")

            if self._send_raw_soap_stop(camera, ptz, token, db_video.username, db_video.password):
                return {"status": "success", "message": "Stopped (ODM Mode)"}
            
            # 兜底
            try:
                space_uri = "http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace"
                stop_req = {
                    'ProfileToken': token, 
                    'Velocity': {'PanTilt': {'x': 0.0, 'y': 0.0, 'space': space_uri}}
                }
                ptz.ContinuousMove(stop_req)
                ptz.ContinuousMove(stop_req)
                logger.info("Stopped via ZeroVel Fallback")
                return {"status": "success", "message": "Stopped (ZeroVel)"}
            except Exception as e:
                logger.warning(f"ZeroVel Failed: {e}")

            if video_id in ONVIF_CLIENT_CACHE: del ONVIF_CLIENT_CACHE[video_id]
            raise ValueError("所有停止方法均失败")

        except Exception as e:
            if video_id in ONVIF_CLIENT_CACHE: del ONVIF_CLIENT_CACHE[video_id]
            logger.error(f"Stop Fatal Error: {e}")
            raise ValueError(f"停止失败: {e}")

    def ptz_start_move(self, db: Session, video_id: int, direction: str, speed: float = 0.5):
        db_video = db.query(VideoDevice).filter(VideoDevice.id == video_id).first()
        if not db_video: raise ValueError("Device not found")

        try:
            camera, ptz, media = self._get_onvif_service(db_video)
            token = self._get_profile_token(media)

            pan = speed if direction == 'right' else (-speed if direction == 'left' else 0.0)
            tilt = speed if direction == 'up' else (-speed if direction == 'down' else 0.0)

            request = {
                'ProfileToken': token,
                'Velocity': {'PanTilt': {'x': pan, 'y': tilt}},
                'Timeout': 'PT5S' 
            }
            ptz.ContinuousMove(request)
            return {"status": "success"}
        except Exception as e:
            if video_id in ONVIF_CLIENT_CACHE: del ONVIF_CLIENT_CACHE[video_id]
            raise ValueError(f"Start failed: {e}")

    def _get_profile_token(self, media_service):
        profiles = media_service.GetProfiles()
        if not profiles: raise Exception("No profiles")
        return profiles[0].token

    def _get_direction_name(self, direction: str) -> str:
        return {'up':'上','down':'下','left':'左','right':'右'}.get(direction, direction)

    # -------------------------------------------------------------------------
    # 核心业务: 添加/删除/更新
    # -------------------------------------------------------------------------
    def add_camera_to_media_server(self, db: Session, camera_data: CameraCreateRequest):
        logger.info(f"Adding stream: {camera_data.name}")
        # 先落库拿到稳定ID，再用 ID 作为 stream_name，避免名称改动导致流路径漂移。
        new_video = VideoDevice(
            name=camera_data.name,
            ip_address=camera_data.ip_address,
            port=camera_data.port,
            username=camera_data.username,
            password=camera_data.password,
            stream_url="",
            rtsp_url=camera_data.rtsp_url,
            latitude=camera_data.latitude,
            longitude=camera_data.longitude,
            status="online",
            remark=camera_data.remark,
        )
        db.add(new_video)
        db.commit()
        db.refresh(new_video)

        stream_name = str(new_video.id)

        # 启动推流并更新播放地址
        self.start_ffmpeg_stream(camera_data.rtsp_url, stream_name)
        flv_url = f"{NMS_HOST}/live/{stream_name}.flv"
        new_video.stream_url = flv_url
        db.commit()
        db.refresh(new_video)
        
        self.start_ffmpeg_recording(new_video.id, camera_data.rtsp_url)
        return new_video

    def create_video(self, db: Session, video_data: VideoCreate):
        new_video = VideoDevice(**video_data.model_dump())
        db.add(new_video)
        db.commit()
        db.refresh(new_video)
        return new_video
    
    def get_videos(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(VideoDevice).offset(skip).limit(limit).all()

    def update_video(self, db: Session, video_id: int, video_data: VideoUpdate):
        db_video = db.query(VideoDevice).filter(VideoDevice.id == video_id).first()
        if not db_video: return None
        for key, value in video_data.model_dump(exclude_unset=True).items():
            setattr(db_video, key, value)

        if db_video.rtsp_url and (not db_video.stream_url or "/live/" not in str(db_video.stream_url)):
            db_video.stream_url = f"{NMS_HOST}/live/{video_id}.flv"

        db.commit()
        db.refresh(db_video)
        if video_id in ONVIF_CLIENT_CACHE: del ONVIF_CLIENT_CACHE[video_id]
        return db_video

    def delete_video(self, db: Session, video_id: int):
        db_video = db.query(VideoDevice).filter(VideoDevice.id == video_id).first()
        if db_video:
            stream_name = str(db_video.id)
            self.stop_ffmpeg_stream(stream_name)
            self.stop_ffmpeg_recording(video_id)

            db.delete(db_video)
            db.commit()
            if video_id in ONVIF_CLIENT_CACHE:
                del ONVIF_CLIENT_CACHE[video_id]
            return True
        return False

    def get_stream_url(self, db: Session, video_id: int):
        v = db.query(VideoDevice).filter(VideoDevice.id == video_id).first()
        if not v:
            return None

        # 懒启动推流：当前端请求播放地址时，如推流进程不存在则自动拉起。
        stream_name = str(v.id)
        entry = FFMPEG_PROCESSES.get(stream_name)
        is_running = False
        if entry is not None:
            try:
                is_running = entry.poll() is None
            except Exception:
                is_running = False

        if not is_running:
            rtsp_url = self._get_rtsp_url_for_device(v)
            if rtsp_url:
                self.start_ffmpeg_stream(rtsp_url, stream_name)

        return v.stream_url
        
    def ptz_move(self, db: Session, video_id: int, direction: str, speed: float = 0.5, duration: float = 0.5):
        try:
            self.ptz_start_move(db, video_id, direction, speed)
            time.sleep(duration)
            self.ptz_stop_move(db, video_id)
            return {"status": "success"}
        except Exception as e:
            raise ValueError(f"Move error: {e}")

    # -------------------------------------------------------------------------
    # [新功能] V4 极速推流 + 进程管理
    # -------------------------------------------------------------------------
    def start_ffmpeg_stream(self, rtsp_url: str, stream_name: str):
        """
        启动 FFmpeg 推流 (隐藏窗口 + 全局管理)
        """
        # 如果已经存在同名推流，先停止旧的
        self.stop_ffmpeg_stream(stream_name)

        ffmpeg_path = self._get_ffmpeg_path()
        rtmp_url = f"rtmp://127.0.0.1:19350/live/{stream_name}"
        
        # V4 完美配置
        command = [
            ffmpeg_path, "-y",
            "-f", "rtsp", "-rtsp_transport", "tcp",
            "-user_agent", "LIVE555 Streaming Media v2013.02.11",
            "-fflags", "nobuffer", "-flags", "low_delay",
            "-strict", "experimental",
            "-analyzeduration", "100000", "-probesize", "100000",
            "-i", rtsp_url,
            "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
            "-b:v", "4000k", "-maxrate", "6000k", "-bufsize", "1000k",
            "-pix_fmt", "yuv420p", "-g", "15",
            "-c:a", "aac", "-b:a", "64k", "-ar", "16000",
            "-flvflags", "no_duration_filesize",
            "-f", "flv", rtmp_url
        ]

        logger.info(f"Starting FFmpeg Stream for {stream_name}...")
        
        try:
            # [修改关键点] 隐藏 CMD 窗口
            startupinfo = None
            creationflags = 0
            
            if os.name == 'nt':
                # Windows 下使用 CREATE_NO_WINDOW (0x08000000) 彻底隐藏
                creationflags = 0x08000000 
            
            process = subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL,
                creationflags=creationflags
            )
            
            # [新增] 存入全局字典
            FFMPEG_PROCESSES[stream_name] = process
            logger.info(f"Stream {stream_name} started (PID: {process.pid})")
            
            return process
        except Exception as e:
            logger.error(f"FFmpeg start failed: {e}")
            return None

    def stop_ffmpeg_stream(self, stream_name: str):
        """
        [新增] 停止并清理 FFmpeg 进程
        """
        global FFMPEG_PROCESSES
        process = FFMPEG_PROCESSES.get(stream_name)
        
        if process:
            try:
                logger.info(f"Stopping FFmpeg for {stream_name} (PID: {process.pid})...")
                process.terminate() # 尝试温和关闭
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()  # 强制关闭
                logger.info(f"Stream {stream_name} stopped.")
            except Exception as e:
                logger.error(f"Error stopping stream {stream_name}: {e}")
            finally:
                # 无论如何从字典中移除
                if stream_name in FFMPEG_PROCESSES:
                    del FFMPEG_PROCESSES[stream_name]

    def _sanitize_stream_name(self, name: str) -> str:
        return name.replace(" ", "_").replace("/", "_").replace("\\", "_").lower()

    def _get_ffmpeg_path(self) -> str:
        return os.getenv(
            "FFMPEG_PATH", 
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "ffmpeg-8.0.1-essentials_build", "bin", "ffmpeg.exe")
            )

    def _get_ffprobe_path(self) -> str:
        ffmpeg_path = self._get_ffmpeg_path()
        ffprobe_path = os.path.join(os.path.dirname(ffmpeg_path), "ffprobe.exe")
        return ffprobe_path

    def _get_record_root(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        record_root = os.path.join(base_dir, "static", "recordings")
        os.makedirs(record_root, exist_ok=True)
        return record_root

    def _get_alarm_video_root(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        alarm_root = os.path.join(base_dir, "static", "alarm_videos")
        os.makedirs(alarm_root, exist_ok=True)
        return alarm_root

    def _get_playback_video_root(self) -> str:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        playback_root = os.path.join(base_dir, "static", "playback_videos")
        os.makedirs(playback_root, exist_ok=True)
        return playback_root

    def _get_rtsp_url_for_device(self, db_video: VideoDevice) -> Optional[str]:
        if getattr(db_video, "rtsp_url", None) and str(db_video.rtsp_url).lower().startswith("rtsp://"):
            return db_video.rtsp_url

        if db_video.stream_url and str(db_video.stream_url).lower().startswith("rtsp://"):
            return db_video.stream_url

        if db_video.ip_address and db_video.username and db_video.password:
            return f"rtsp://{db_video.username}:{db_video.password}@{db_video.ip_address}:554/Streaming/Channels/1"

        return None

    def start_ffmpeg_recording(self, video_id: int, rtsp_url: str):
        if not rtsp_url:
            logger.warning(f"录像启动失败，video_id={video_id} 缺少 RTSP 地址")
            return None

        # 如果同一路录像进程正在运行且源地址未变，不要重启。
        existing = RECORDING_PROCESSES.get(video_id)
        if isinstance(existing, dict):
            existing_process = existing.get("process")
            existing_rtsp = existing.get("rtsp_url")
            if existing_process and existing_process.poll() is None and existing_rtsp == rtsp_url:
                return existing_process
        elif existing is not None:
            try:
                if existing.poll() is None:
                    return existing
            except Exception:
                pass

        self.stop_ffmpeg_recording(video_id)

        ffmpeg_path = self._get_ffmpeg_path()
        record_root = self._get_record_root()
        device_root = os.path.join(record_root, str(video_id))
        os.makedirs(device_root, exist_ok=True)
        log_root = os.path.join(os.path.dirname(record_root), "logs")
        os.makedirs(log_root, exist_ok=True)
        log_path = os.path.join(log_root, f"recording_{video_id}.log")

        # 直接写到设备目录，避免日期子目录不存在导致 ffmpeg 无法落盘。
        segment_pattern = os.path.join(device_root, "%Y%m%d_%H%M%S.mp4")

        command = [
            ffmpeg_path,
            "-y",
            "-rtsp_transport", "tcp",
            "-use_wallclock_as_timestamps", "1",
            "-i", rtsp_url,
            "-map", "0:v:0",
            "-map", "0:a:0?",
            "-c:v", "copy",
            "-c:a", "aac",
            "-f", "segment",
            "-segment_time", "60",
            "-segment_atclocktime", "1",
            "-strftime", "1",
            "-reset_timestamps", "1",
            segment_pattern
        ]

        logger.info(f"Starting recording for video_id={video_id}")
        try:
            creationflags = 0x08000000 if os.name == "nt" else 0
            log_file = open(log_path, "a", encoding="utf-8")
            process = subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=log_file,
                creationflags=creationflags
            )
            RECORDING_PROCESSES[video_id] = {
                "process": process,
                "log_file": log_file,
                "rtsp_url": rtsp_url,
            }
            return process
        except Exception as e:
            logger.error(f"录像启动失败 video_id={video_id}: {e}")
            return None

    def stop_ffmpeg_recording(self, video_id: int):
        entry = RECORDING_PROCESSES.get(video_id)
        if not entry:
            return

        process = entry["process"] if isinstance(entry, dict) else entry
        log_file = entry.get("log_file") if isinstance(entry, dict) else None

        try:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
        except Exception as e:
            logger.error(f"停止录像失败 video_id={video_id}: {e}")
        finally:
            RECORDING_PROCESSES.pop(video_id, None)
            if log_file:
                try:
                    log_file.close()
                except Exception:
                    pass

    def _parse_segment_start(self, file_path: str) -> Optional[datetime]:
        try:
            name = os.path.basename(file_path).replace(".mp4", "")
            return datetime.strptime(name, "%Y%m%d_%H%M%S")
        except Exception:
            return None

    def _is_segment_usable(self, file_path: str, min_age_seconds: int = 6) -> bool:
        """过滤未写完/损坏分段，避免 concat 阶段出现 moov atom not found。"""
        try:
            if not os.path.exists(file_path):
                return False

            stat = os.stat(file_path)
            if stat.st_size < 64 * 1024:
                return False

            age = time.time() - stat.st_mtime
            if age < min_age_seconds:
                return False

            ffprobe_path = self._get_ffprobe_path()
            if not os.path.exists(ffprobe_path):
                # 没有 ffprobe 时至少保证文件不是“正在写入”状态
                return True

            cmd = [
                ffprobe_path,
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if not (result.returncode == 0 and bool((result.stdout or "").strip())):
                return False

            # 二次校验：快速解码 1 秒视频，尽早剔除明显损坏分段
            ffmpeg_path = self._get_ffmpeg_path()
            decode_check_cmd = [
                ffmpeg_path,
                "-v", "error",
                "-t", "1",
                "-i", file_path,
                "-an",
                "-f", "null",
                "-",
            ]
            decode_result = subprocess.run(decode_check_cmd, capture_output=True, text=True)
            return decode_result.returncode == 0
        except Exception:
            return False

    def _run_ffmpeg(self, command: List[str]):
        wrapped = [command[0], "-hide_banner", "-loglevel", "error", *command[1:]]
        result = subprocess.run(wrapped, capture_output=True, text=True)
        ok = result.returncode == 0
        stderr_tail = (result.stderr or "")[-800:]
        return ok, stderr_tail

    def _normalize_error_text(self, message: Optional[str], limit: int = 240) -> str:
        text = (message or "未知错误").replace("\r", " ").replace("\n", " ").strip()
        if len(text) > limit:
            return text[:limit]
        return text

    def _mark_alarm_failed(self, db: Session, alarm_id: int, message: str):
        alarm = db.query(AlarmRecord).filter(AlarmRecord.id == alarm_id).first()
        if not alarm:
            return

        alarm.recording_status = "failed"
        alarm.recording_error = self._normalize_error_text(message)

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"更新报警失败状态失败 alarm_id={alarm_id}: {e}")

    def _export_clip_with_fallback(self, temp_list_file: str, output_path: str, offset_seconds: int, duration_seconds: int):
        ffmpeg_path = self._get_ffmpeg_path()

        # 首选：无损拷贝（最快）
        copy_cmd = [
            ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", temp_list_file,
            "-ss", str(max(0, int(offset_seconds))),
            "-t", str(max(1, int(duration_seconds))),
            "-c", "copy",
            output_path,
        ]

        ok, err = self._run_ffmpeg(copy_cmd)
        if ok and os.path.exists(output_path) and os.path.getsize(output_path) > 64 * 1024:
            return True, None

        # 兜底：容错重编码，忽略坏包，同时丢弃音频规避 AAC 坏帧影响
        reencode_cmd = [
            ffmpeg_path,
            "-y",
            "-fflags", "+discardcorrupt+genpts",
            "-err_detect", "ignore_err",
            "-f", "concat",
            "-safe", "0",
            "-i", temp_list_file,
            "-ss", str(max(0, int(offset_seconds))),
            "-t", str(max(1, int(duration_seconds))),
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "24",
            "-movflags", "+faststart",
            output_path,
        ]

        ok2, err2 = self._run_ffmpeg(reencode_cmd)
        if ok2 and os.path.exists(output_path) and os.path.getsize(output_path) > 64 * 1024:
            return True, None

        return False, f"copy_failed={err or 'unknown'} | reencode_failed={err2 or 'unknown'}"

    def _collect_segments_for_window(self, video_id: int, start_time: datetime, end_time: datetime) -> List[str]:
        record_root = self._get_record_root()
        device_root = os.path.join(record_root, str(video_id))
        if not os.path.exists(device_root):
            return []

        matched = []
        for day_dir, _, files in os.walk(device_root):
            for f in files:
                if not f.lower().endswith(".mp4"):
                    continue
                full_path = os.path.join(day_dir, f)
                seg_start = self._parse_segment_start(full_path)
                if not seg_start:
                    continue
                if not self._is_segment_usable(full_path):
                    continue
                seg_end = seg_start + timedelta(seconds=60)
                if seg_end >= start_time and seg_start <= end_time:
                    matched.append(full_path)

        matched.sort()
        return matched

    def build_alarm_clip(self, alarm_id: int, seconds_before: int = 120, seconds_after: int = 120):
        db = SessionLocal()
        temp_list_file = None

        try:
            alarm = db.query(AlarmRecord).filter(AlarmRecord.id == alarm_id).first()
            if not alarm:
                return False

            if not alarm.device_id:
                self._mark_alarm_failed(db, alarm_id, "报警未关联摄像头")
                return False

            try:
                video_id = int(alarm.device_id)
            except Exception:
                self._mark_alarm_failed(db, alarm_id, f"无效摄像头ID: {alarm.device_id}")
                return False

            alarm_time = alarm.timestamp or datetime.now()
            clip_start = alarm_time - timedelta(seconds=seconds_before)
            clip_end = alarm_time + timedelta(seconds=seconds_after)

            segments = self._collect_segments_for_window(video_id, clip_start, clip_end)
            if not segments:
                self._mark_alarm_failed(db, alarm_id, "未找到可用录像分段")
                return False

            alarm_root = self._get_alarm_video_root()
            device_alarm_root = os.path.join(alarm_root, str(video_id))
            os.makedirs(device_alarm_root, exist_ok=True)

            output_name = f"{alarm_time.strftime('%Y%m%d_%H%M%S')}_alarm_{alarm.id}.mp4"
            output_path = os.path.join(device_alarm_root, output_name)

            temp_list_file = os.path.join(device_alarm_root, f"concat_{alarm.id}.txt")
            with open(temp_list_file, "w", encoding="utf-8") as f:
                for seg in segments:
                    safe_path = seg.replace("\\", "/").replace("'", "'\\''")
                    f.write(f"file '{safe_path}'\n")

            offset_seconds = max(0, (clip_start - self._parse_segment_start(segments[0])).total_seconds())
            duration_seconds = seconds_before + seconds_after

            ok, export_error = self._export_clip_with_fallback(
                temp_list_file=temp_list_file,
                output_path=output_path,
                offset_seconds=int(offset_seconds),
                duration_seconds=int(duration_seconds),
            )
            if not ok:
                raise RuntimeError(f"报警片段导出失败: {export_error}")

            rel_path = f"/static/alarm_videos/{video_id}/{output_name}"
            alarm.recording_path = rel_path
            alarm.recording_status = "ready"
            alarm.recording_error = None
            db.commit()
            return True

        except Exception as e:
            logger.error(f"生成报警片段失败 alarm_id={alarm_id}: {e}")
            self._mark_alarm_failed(db, alarm_id, str(e))
            return False
        finally:
            if temp_list_file and os.path.exists(temp_list_file):
                try:
                    os.remove(temp_list_file)
                except Exception:
                    pass
            db.close()

    def ensure_all_recordings(self, db: Session):
        videos = db.query(VideoDevice).all()
        for v in videos:
            entry = RECORDING_PROCESSES.get(v.id)
            if isinstance(entry, dict):
                proc = entry.get("process")
                if proc and proc.poll() is None:
                    continue
            elif entry is not None:
                try:
                    if entry.poll() is None:
                        continue
                except Exception:
                    pass
            rtsp_url = self._get_rtsp_url_for_device(v)
            if rtsp_url:
                self.start_ffmpeg_recording(v.id, rtsp_url)

    def build_alarm_clip_delayed(self, alarm_id: int, seconds_before: int = 120, seconds_after: int = 120):
        # 给“后置时段”留出时间，同时对仍在写入分段增加重试，降低 concat 失败率。
        time.sleep(seconds_after + 2)

        max_attempts = 3
        for i in range(max_attempts):
            ok = self.build_alarm_clip(alarm_id, seconds_before, seconds_after)
            if ok:
                return True
            if i < max_attempts - 1:
                time.sleep(20)

        return False

    def save_playback_clip(self, video_id: int, start_time: datetime, end_time: datetime):
        temp_list_file = None

        try:
            if end_time <= start_time:
                raise ValueError("结束时间必须大于开始时间")

            # 统一转换为本地无时区时间，避免与分段文件名(本地时间)比较时出现偏差
            if start_time.tzinfo:
                start_time = start_time.astimezone().replace(tzinfo=None)
            if end_time.tzinfo:
                end_time = end_time.astimezone().replace(tzinfo=None)

            duration_seconds = int((end_time - start_time).total_seconds())
            if duration_seconds <= 0:
                raise ValueError("保存时长无效")
            if duration_seconds > 6 * 3600:
                raise ValueError("单次保存时长不能超过6小时")

            segments = self._collect_segments_for_window(video_id, start_time, end_time)
            if not segments:
                raise ValueError("该时间段未找到可用录像分段")

            first_seg_start = self._parse_segment_start(segments[0])
            if not first_seg_start:
                raise ValueError("录像分段时间解析失败")

            playback_root = self._get_playback_video_root()
            device_playback_root = os.path.join(playback_root, str(video_id))
            os.makedirs(device_playback_root, exist_ok=True)

            output_name = (
                f"{start_time.strftime('%Y%m%d_%H%M%S')}"
                f"_{end_time.strftime('%Y%m%d_%H%M%S')}"
                ".mp4"
            )
            output_path = os.path.join(device_playback_root, output_name)

            temp_list_file = os.path.join(
                device_playback_root,
                f"concat_{video_id}_{int(time.time())}.txt"
            )
            with open(temp_list_file, "w", encoding="utf-8") as f:
                for seg in segments:
                    safe_path = seg.replace("\\", "/").replace("'", "'\\''")
                    f.write(f"file '{safe_path}'\n")

            offset_seconds = max(0, int((start_time - first_seg_start).total_seconds()))

            ok, export_error = self._export_clip_with_fallback(
                temp_list_file=temp_list_file,
                output_path=output_path,
                offset_seconds=offset_seconds,
                duration_seconds=duration_seconds,
            )
            if not ok:
                raise ValueError(f"回放导出失败: {export_error}")

            return {
                "video_id": video_id,
                "start_time": start_time.isoformat(sep=" "),
                "end_time": end_time.isoformat(sep=" "),
                "duration_seconds": duration_seconds,
                "recording_path": f"/static/playback_videos/{video_id}/{output_name}",
            }
        finally:
            if temp_list_file and os.path.exists(temp_list_file):
                try:
                    os.remove(temp_list_file)
                except Exception:
                    pass