from .registry import ai_rule

@ai_rule("helmet", "安全帽类")

def detect_safety_helmet(service, frame):
    """基于 YOLO26 双模型检测人员是否佩戴安全帽（支持多目标）"""
    if frame is None:
        return False, None

    if service.is_debug_force("helmet"):
        return service._check_cooldown_and_alarm(
            "未佩戴安全帽",
            "DEBUG: 强制触发未佩戴安全帽报警（链路测试）",
            1.0,
            service._debug_box(frame),
        )

    try:
        result = service._dual_detect(frame, conf=0.1)
        if result is None:
            return False, None

        detected_types = result["detected_types"]
        all_boxes = result["all_boxes"]

        # 需要有人员相关信号才进行判定
        has_person_signal = any(
            t in ['person', 'helmet', 'head', 'Smoking'] for t in detected_types
        )
        if not has_person_signal:
            return False, None

        # 检测到 helmet → 合规，不报警
        if 'helmet' in detected_types:
            return False, None

        # 未检测到 helmet，收集所有 person/head 框作为违规目标
        if any(t in ['person', 'head', 'Smoking'] for t in detected_types):
            violation_boxes = []
            for b in all_boxes:
                if b["label"] in ['person', 'head']:
                    violation_boxes.append({
                        "type": "未佩戴安全帽",
                        "msg": f"检测到人员未佩戴安全帽 ({b['conf']:.0%})",
                        "score": b["conf"],
                        "coords": b["coords"],
                    })

            # 如果没有 person/head 框但有 Smoking 框，用 Smoking 框代替
            if not violation_boxes:
                for b in all_boxes:
                    if b["label"] == 'Smoking':
                        violation_boxes.append({
                            "type": "未佩戴安全帽",
                            "msg": f"检测到人员未佩戴安全帽",
                            "score": b["conf"],
                            "coords": b["coords"],
                        })

            if violation_boxes:
                return service._check_cooldown_and_multi_alarm("未佩戴安全帽", violation_boxes)

        return False, None
    except Exception as e:
        print(f"⚠️ 安全帽检测出错: {e}")
        return False, None
