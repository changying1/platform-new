import threading
import time
import cv2
import os
import uuid
from datetime import datetime
from app.services.ai_service import AIService
from app.models.alarm_records import AlarmRecord
from app.core.database import SessionLocal
from app.services import ai_features
import threading
from app.services.video_service import VideoService
from urllib.parse import urlsplit, urlunsplit, unquote, quote


class AIManager:
    def __init__(self):
        self.active_monitors = {}
        # 全局共享冷却时间映射，解决重启监控或多路干扰导致的冷却失效
        self.global_last_alarm_time = {}
        
        self.ai_service = AIService(shared_cooldown_map=self.global_last_alarm_time)
        self.video_service = VideoService()
        self.base_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        self.static_dir = os.path.join(self.base_dir, "static", "alarms")
        os.makedirs(self.static_dir, exist_ok=True)

        # 算法分发表
        self.algo_handlers = ai_features.get_algo_handlers(self.ai_service)
        print(f"✅ 已加载AI规则: {list(self.algo_handlers.keys())}")

    # =========================
    # 启动监控
    # =========================
    def start_monitoring(self, device_id, rtsp_url, algo_type="helmet"):
        device_id = str(device_id)

        if device_id in self.active_monitors:
            print(f"⚠️ 设备 {device_id} 已经在监控中")
            return False

        print(f"--- 启动 AI 监控: {device_id} | 功能: {algo_type} ---")

        # 启动 AI 监控时，确保对应摄像头分段录像已经开始，
        # 避免后续“回放保存/报警前后视频”找不到可用录像分段。
        try:
            video_id = int(device_id)
            if rtsp_url:
                self.video_service.start_ffmpeg_recording(video_id, rtsp_url)
        except Exception as e:
            print(f"⚠️ 启动分段录像失败(不影响AI检测): {e}")

        stop_event = threading.Event()
        thread = threading.Thread(
            target=self._monitor_loop,
            args=(device_id, rtsp_url, algo_type, stop_event),
            daemon=True,
        )

        self.active_monitors[device_id] = {
            "stop_event": stop_event,
            "thread": thread,
        }

        thread.start()
        return True

    # =========================
    # 停止监控
    # =========================
    def stop_monitoring(self, device_id):
        device_id = str(device_id)

        if device_id not in self.active_monitors:
            print(f"⚠️ 设备 {device_id} 不在监控中")
            return False

        print(f"--- 停止 AI 监控: {device_id} ---")
        self.active_monitors[device_id]["stop_event"].set()
        del self.active_monitors[device_id]
        return True

    # =========================
    # 主监控循环
    # =========================
    def _build_rtsp_candidates(self, rtsp_url):
        if rtsp_url == 0 or rtsp_url == "0":
            return [0]

        raw = str(rtsp_url or "").strip()
        if not raw:
            return []

        candidates = []

        def _push(url):
            if url and url not in candidates:
                candidates.append(url)

        _push(raw)

        # 仅修正路径的重复斜杠，保留原始鉴权串
        if raw.startswith("rtsp://"):
            scheme, _, rest = raw.partition("://")
            if "/" in rest:
                host_part, path_part = rest.split("/", 1)
                fixed_path_url = f"{scheme}://{host_part}/" + path_part.lstrip("/")
                _push(fixed_path_url)

            # 对用户名密码做一次 decode/encode 归一化，兼容 %40 等字符
            try:
                parts = urlsplit(raw)
                host = parts.hostname or ""
                if host:
                    port = f":{parts.port}" if parts.port else ""
                    path = "/" + (parts.path or "").lstrip("/")

                    username = parts.username
                    password = parts.password

                    if username is not None:
                        u_dec = unquote(username)
                        p_dec = unquote(password or "")

                        netloc_encoded = f"{quote(u_dec, safe='')}:{quote(p_dec, safe='')}@{host}{port}"
                        _push(urlunsplit((parts.scheme or "rtsp", netloc_encoded, path, parts.query, parts.fragment)))

                        # 某些设备对原始字符更宽松，增加一条未编码候选
                        netloc_raw = f"{u_dec}:{p_dec}@{host}{port}"
                        _push(urlunsplit((parts.scheme or "rtsp", netloc_raw, path, parts.query, parts.fragment)))
                    else:
                        _push(urlunsplit((parts.scheme or "rtsp", f"{host}{port}", path, parts.query, parts.fragment)))
            except Exception:
                pass

        return candidates

    def _open_video_capture(self, rtsp_url):
        candidates = self._build_rtsp_candidates(rtsp_url)
        if not candidates:
            return None, None

        for candidate in candidates:
            # 优先 FFmpeg 后端，避免落到 CAP_IMAGES 导致误判
            for backend in (cv2.CAP_FFMPEG, cv2.CAP_ANY):
                try:
                    if candidate == 0:
                        cap = cv2.VideoCapture(0)
                    else:
                        cap = cv2.VideoCapture(candidate, backend)

                    if cap.isOpened():
                        return cap, candidate
                    cap.release()
                except Exception:
                    continue

        return None, None

    def _monitor_loop(self, device_id, rtsp_url, algo_type_str, stop_event):
        print(f"📷 正在连接视频流: {rtsp_url}")

        # ========= DEBUG 模式 =========
        DEBUG_MODE = os.getenv("AI_DEBUG", "0") == "1"

        if DEBUG_MODE:
            print("🔥 DEBUG模式：四功能并行测试")

            test_algos = list(self.algo_handlers.keys())

            while not stop_event.is_set():
                for algo in test_algos:
                    details = {
                        "type": f"DEBUG-{algo}",
                        "msg": f"{algo} 功能链路测试报警",
                    }
                    self._save_alarm_to_db(device_id, details, "")
                time.sleep(5)

            print(f"--- DEBUG线程已退出: {device_id} ---")
            return

        # ========= 正常视频逻辑 =========
        try:
            cap, used_url = self._open_video_capture(rtsp_url)

            if cap is None:
                print("❌ 视频流打开失败")
                return
            print(f"✅ 视频流连接成功: {used_url}")

        except Exception as e:
            print(f"❌ 视频流异常: {e}")
            return

        active_algos = [x.strip() for x in algo_type_str.split(",") if x.strip()]
        frame_interval = 5
        frame_count = 0

        while not stop_event.is_set():
            ret, frame = cap.read()

            if not ret:
                time.sleep(2)
                continue

            frame_count += 1
            if frame_count % frame_interval != 0:
                continue

            try:
                for algo_key in active_algos:

                    if algo_key not in self.algo_handlers:
                        print(f"⚠️ 未识别算法类型: {algo_key}")
                        continue

                    is_alarm, details = self.algo_handlers[algo_key](frame)

                    if is_alarm:
                        img_path = self._save_alarm_image(frame, device_id, details)
                        alarm_id = self._save_alarm_to_db(device_id, details, img_path)

                        if alarm_id:
                            threading.Thread(
                                target=self.video_service.build_alarm_clip_delayed,
                                args=(alarm_id, 30, 30),
                                daemon=True,
                            ).start()

            except Exception as logic_error:
                print(f"⚠️ 逻辑异常: {logic_error}")

            time.sleep(0.02)

        cap.release()
        print(f"--- 监控线程已退出: {device_id} ---")

    # =========================
    # 保存报警图片
    # =========================
    def _save_alarm_image(self, frame, device_id, details=None):
        try:
            filename = f"{device_id}_{int(time.time())}_{uuid.uuid4().hex[:6]}.jpg"
            filepath = os.path.join(self.static_dir, filename)

            cv2.imwrite(filepath, frame)
            return f"/static/alarms/{filename}"

        except Exception as e:
            print(f"❌ 图片保存失败: {e}")
            return ""

    # =========================
    # 写数据库
    # =========================
    def _save_alarm_to_db(self, device_id, details, image_path):
        if not details:
            return None

        # 兼容两种返回格式:
        # 1) {"type": "...", "msg": "..."}
        # 2) {"alarm": true, "boxes": [{"type": "...", "msg": "..."}]}
        alarm_type = details.get("type") if isinstance(details, dict) else None
        alarm_msg = details.get("msg") if isinstance(details, dict) else None

        if isinstance(details, dict) and isinstance(details.get("boxes"), list) and details["boxes"]:
            first_box = details["boxes"][0] or {}
            alarm_type = alarm_type or first_box.get("type")
            alarm_msg = alarm_msg or first_box.get("msg")

        if not alarm_type:
            alarm_type = "unknown"
        if not alarm_msg:
            alarm_msg = "检测到异常"

        db = SessionLocal()

        try:
            record = AlarmRecord(
                device_id=str(device_id),
                alarm_type=alarm_type,
                severity="HIGH",
                description=alarm_msg,
                status="pending",
                timestamp=datetime.now(),
                recording_status="pending",
            )

            db.add(record)
            db.commit()
            db.refresh(record)

            print(f"✅ 报警已保存 (ID: {record.id})")
            return record.id

        except Exception as e:
            print(f"❌ 数据库写入失败: {e}")
            db.rollback()
            return None
        finally:
            db.close()


ai_manager = AIManager()