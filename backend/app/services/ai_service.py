import cv2
import os
import time
from ultralytics import YOLO
import numpy as np

import app.services.ai_features
from app.core.ws_manager import push_alarm, push_alarm_threadsafe
import asyncio


class AIService:
    def __init__(self, model_path="app/models/best.pt",
                 model_a_path="app/models/yolo26_person.pt",
                 model_b_path="app/models/yolo26_helmet.pt",
                 cooldown_seconds=5, shared_cooldown_map=None):
        self.model_path = model_path
        self.model = None

        # YOLO26 双模型（安全帽 + 抽烟检测）
        self.model_a_path = model_a_path   # Person模型: Smoking, helmet, person
        self.model_b_path = model_b_path   # Helmet模型: Smoking, head, helmet
        self.model_a = None
        self.model_b = None
        # 帧级缓存，同一帧多个算法调用时避免重复推理
        self._last_frame_id = None
        self._last_dual_results = None

        self.cooldown_seconds = cooldown_seconds
        # 如果传入共享映射则用共享的，否则用实例私有的（兼容旧调用）
        self.last_alarm_time_map = shared_cooldown_map if shared_cooldown_map is not None else {}

        self.sign_missing_counter = 0
        self.MISSING_THRESHOLD = int(os.getenv("AI_SIGN_MISSING_THRESHOLD", "3"))

        self.boom_sign_missing_counter = 0
        self.BOOM_MISSING_THRESHOLD = int(os.getenv("AI_BOOM_MISSING_THRESHOLD", "3"))

        self.debug_force_alarms = set(
            [x.strip() for x in os.getenv("AI_DEBUG_FORCE_ALARMS", "").split(",") if x.strip()]
        )

        self.class_names = {
            0: "helmet",
            1: "no_helmet",
            2: "person",
            3: "hole_danger",
            4: "safety_sign",
            5: "ladder_no_sign",
            6: "scaffold_no_sign",
            7: "platform_no_sign",
            8: "mobile_platform_no_sign",
            9: "harness_violation",
            10: "phone_use",
            11: "smoking",
            12: "boom_lift",
            13: "boom_lift_no_sign",
        }

    def is_debug_force(self, algo_key: str) -> bool:
        return ("all" in self.debug_force_alarms) or (algo_key in self.debug_force_alarms)

    def _debug_box(self, frame):
        try:
            h, w = frame.shape[:2]
            return [int(w * 0.12), int(h * 0.12), int(w * 0.45), int(h * 0.45)]
        except Exception:
            return [0, 0, 120, 120]

    def _label_of(self, results, cls_id: int) -> str:
        try:
            if hasattr(results, "names") and results.names and cls_id in results.names:
                return str(results.names[cls_id])
        except Exception:
            pass
        return self.class_names.get(cls_id, "unknown")

    def _load_model_safe(self):
        if self.model is not None:
            return True
        try:
            print("⏳ [AI服务] 正在初始化模型 (CPU模式)...")
            base_dir = os.getcwd()
            full_path = os.path.join(base_dir, self.model_path)
            if not os.path.exists(full_path):
                print(f"❌ [错误] 找不到模型文件: {full_path}")
                return False
            loaded_model = YOLO(full_path)
            loaded_model.to("cpu")
            self.model = loaded_model
            print("✅ [AI服务] 模型加载完成")
            return True
        except Exception as e:
            print(f"❌ [严重错误] 模型加载失败: {e}")
            return False

    # ===== YOLO26 双模型加载与推理 =====

    def _load_dual_models_safe(self):
        """加载 YOLO26 双模型（Person + Helmet）"""
        if self.model_a is not None and self.model_b is not None:
            return True
        try:
            base_dir = os.getcwd()
            if self.model_a is None:
                path_a = os.path.join(base_dir, self.model_a_path)
                if not os.path.exists(path_a):
                    print(f"❌ [错误] 找不到Person模型: {path_a}")
                    return False
                print("⏳ [AI服务] 正在加载Person模型(A) (CPU模式)...")
                self.model_a = YOLO(path_a)
                self.model_a.to("cpu")
                print("✅ [AI服务] Person模型(A)加载完成")

            if self.model_b is None:
                path_b = os.path.join(base_dir, self.model_b_path)
                if not os.path.exists(path_b):
                    print(f"❌ [错误] 找不到Helmet模型: {path_b}")
                    return False
                print("⏳ [AI服务] 正在加载Helmet模型(B) (CPU模式)...")
                self.model_b = YOLO(path_b)
                self.model_b.to("cpu")
                print("✅ [AI服务] Helmet模型(B)加载完成")

            return True
        except Exception as e:
            print(f"❌ [严重错误] 双模型加载失败: {e}")
            return False

    def _dual_detect(self, frame, conf=0.1):
        """
        YOLO26 双模型推理，返回合并后的检测结果。
        同一帧多次调用时使用缓存，避免重复推理。
        返回: dict {"all_boxes": [...], "detected_types": set} 或 None
        """
        frame_id = id(frame)
        if frame_id == self._last_frame_id and self._last_dual_results is not None:
            return self._last_dual_results

        if not self._load_dual_models_safe():
            return None

        res_a = self.model_a(frame, conf=conf, verbose=False)[0]
        res_b = self.model_b(frame, conf=conf, verbose=False)[0]

        all_boxes = []
        detected_types = set()

        for res in [res_a, res_b]:
            for box in res.boxes:
                cls_name = res.names[int(box.cls[0])]
                conf_val = float(box.conf[0])
                coords = box.xyxy[0].tolist()
                all_boxes.append({
                    "label": cls_name,
                    "conf": conf_val,
                    "coords": coords,
                })
                detected_types.add(cls_name)

        result = {
            "all_boxes": all_boxes,
            "detected_types": detected_types,
        }

        self._last_frame_id = frame_id
        self._last_dual_results = result
        return result

    def _check_cooldown_and_alarm(self, alarm_type, msg, score, coords):

        now = time.time()
        
        # 统一规范化 key，防止因为带了动态后缀导致的冷却失效
        # 例如将 "现场人数统计违规"、"现场人数统计异常" 统一映射为同一个冷却 KEY
        cooldown_key = alarm_type
        if "安全标识" in alarm_type or "缺失标识" in alarm_type:
            cooldown_key = "SAFETY_SIGN_COOLDOWN"
        elif "人数统计" in alarm_type or "监护人" in alarm_type:
            cooldown_key = "SUPERVISOR_COOLDOWN"
        elif "梯子" in alarm_type:
            cooldown_key = "LADDER_COOLDOWN"

        last = self.last_alarm_time_map.get(cooldown_key, 0.0)

        # 默认按钮：5秒，特殊名单：300秒
        current_cooldown = self.cooldown_seconds
        
        is_long_cooldown = cooldown_key in ["SAFETY_SIGN_COOLDOWN", "SUPERVISOR_COOLDOWN", "LADDER_COOLDOWN"]
        if is_long_cooldown:
            current_cooldown = 300

        if now - last > current_cooldown:
            if is_long_cooldown:
                print(f"✅ [冷却锁定] 类型:{alarm_type} 已进入5分钟锁定期 (KEY:{cooldown_key})")

            # 写入统一的共享 KEY
            self.last_alarm_time_map[cooldown_key] = now

            print(f"🚨 [AI监测] 报警已发出! ({alarm_type})")

            data = {
                "alarm": True,
                "boxes": [
                    {
                        "type": alarm_type,
                        "msg": msg,
                        "score": score,
                        "coords": coords
                    }
                ]
            }

            # 在 AI 线程中安全触发异步推送，避免 no running event loop
            self._push_alarm_safe(data)

            return True, data

        return False, None

    def _check_cooldown_and_multi_alarm(self, alarm_type, boxes):
        """多目标版本：一次推送多个标框，共享冷却控制"""
        now = time.time()
        cooldown_key = alarm_type
        last = self.last_alarm_time_map.get(cooldown_key, 0.0)

        if now - last > self.cooldown_seconds:
            self.last_alarm_time_map[cooldown_key] = now
            data = {"alarm": True, "boxes": boxes}
            self._push_alarm_safe(data)
            print(f"🚨 [AI监测] 报警已发出! ({alarm_type}) [{len(boxes)}个目标]")
            return True, data

        return False, None

    def _push_alarm_safe(self, data):
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(push_alarm(data))
        except RuntimeError:
            # 当前线程没有事件循环（AI 检测线程常见），投递到主事件循环。
            try:
                push_alarm_threadsafe(data)
            except Exception as e:
                print(f"⚠️ WebSocket 推送失败: {e}")
        except Exception as e:
            print(f"⚠️ WebSocket 推送失败: {e}")

    # ===== 以下全部委托给 ai_features 模块 =====

    def detect_safety_helmet(self, frame):
        return app.services.ai_features.detect_safety_helmet(self, frame)

    def detect_hole_curb(self, frame):
        return app.services.ai_features.detect_hole_curb(self, frame)

    def detect_site_signage(self, frame):
        return app.services.ai_features.detect_site_signage(self, frame)

    def detect_equipment_signage(self, frame):
        return app.services.ai_features.detect_equipment_signage(self, frame)

    def detect_safety_harness(self, frame):
        return app.services.ai_features.detect_safety_harness(self, frame)

    def detect_work_behavior(self, frame):
        return app.services.ai_features.detect_work_behavior(self, frame)

    def detect_boom_lift_site_signage(self, frame):
        return app.services.ai_features.detect_boom_lift_site_signage(self, frame)

    def count_supervisors(self, frame):
        return app.services.ai_features.count_supervisors(self, frame)

    # ===== 保留 helmet 颜色识别 =====

    def _get_helmet_color(self, img_crop):
        if img_crop is None or img_crop.size == 0:
            return "unknown"
        try:
            hsv = cv2.cvtColor(img_crop, cv2.COLOR_BGR2HSV)
            lower_red1 = np.array([0, 100, 100])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 100, 100])
            upper_red2 = np.array([180, 255, 255])
            mask_red = cv2.bitwise_or(
                cv2.inRange(hsv, lower_red1, upper_red1),
                cv2.inRange(hsv, lower_red2, upper_red2),
            )
            red_pixels = cv2.countNonZero(mask_red)

            lower_yellow = np.array([20, 100, 100])
            upper_yellow = np.array([30, 255, 255])
            mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)
            yellow_pixels = cv2.countNonZero(mask_yellow)

            total_pixels = img_crop.shape[0] * img_crop.shape[1]

            if red_pixels > yellow_pixels and red_pixels > (total_pixels * 0.1):
                return "red"

            if yellow_pixels > red_pixels and yellow_pixels > (total_pixels * 0.1):
                return "yellow"

            return "other"

        except Exception:
            return "unknown"
        
    def detect_ladder_operation(self, frame):
        return app.services.ai_features.detect_ladder_operation(self, frame)

    def detect_ladder_angle(self, frame):
        return app.services.ai_features.detect_ladder_angle(self, frame)
    
    def detect_ladder_detail(self, frame):
        return app.services.ai_features.detect_ladder_detail(self, frame)
