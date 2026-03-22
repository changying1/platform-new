from .registry import ai_rule


@ai_rule("unauthorized_person", "孔口无关人员")
def unauthorized_person(service, frame):

    if frame is None:
        return False, {}

    results = service.model(frame)[0]

    holes = []
    persons = []

    for box in results.boxes:

        cls = int(box.cls[0])
        name = service.labels[cls]

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        if name in ["hole", "opening"]:
            holes.append((x1, y1, x2, y2))

        if name == "person":
            persons.append((x1, y1, x2, y2))

    for hx1, hy1, hx2, hy2 in holes:

        hx = (hx1 + hx2) / 2
        hy = (hy1 + hy2) / 2

        for px1, py1, px2, py2 in persons:

            px = (px1 + px2) / 2
            py = (py1 + py2) / 2

            dx = abs(px - hx)
            dy = abs(py - hy)

            if dx < 300 and dy < 300:

                return True, {
                    "type": "unauthorized_person",
                    "msg": "孔口附近5m范围出现无关人员"
                }

    return False, {}