from .registry import ai_rule

@ai_rule("helmet", "安全帽类")

def detect_safety_helmet(service, frame):
    if frame is None:
        return False, None

    if service.is_debug_force("helmet"):
        return service._check_cooldown_and_alarm(
            "未佩戴安全帽",
            "DEBUG: 强制触发未佩戴安全帽报警（链路测试）",
            1.0,
            service._debug_box(frame),
        )

    if service.model is None and not service._load_model_safe():
        return False, None

    try:
        results = service.model(frame, conf=0.5, verbose=False)[0]
        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = service._label_of(results, cls_id)
            if label == "no_helmet":
                conf_score = float(box.conf[0])
                coords = box.xyxy[0].tolist()
                return service._check_cooldown_and_alarm(
                    "未佩戴安全帽",
                    "检测到人员未佩戴安全帽",
                    conf_score,
                    coords,
                )
        return False, None
    except Exception as e:
        print(f"⚠️ 安全帽检测出错: {e}")
        return False, None
