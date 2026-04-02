"""
YOLO26 双模型检测测试脚本
测试安全帽佩戴 + 抽烟行为检测

用法：
  1. 将测试图片放到 ai_test 目录下（或填写绝对路径）
  2. 修改下方 TEST_IMAGES 列表
  3. 运行: python ai_test/test_dual_detect.py
"""

import os
import sys
import cv2
from ultralytics import YOLO
from ultralytics.utils.plotting import Annotator

# ============================================================
#  配置区 —— 根据实际情况修改
# ============================================================

# 模型路径（相对于 backend 目录）
MODEL_A_PATH = r"app\models\yolo26_person.pt"   # Person模型: Smoking, helmet, person
MODEL_B_PATH = r"app\models\yolo26_helmet.pt"   # Helmet模型: Smoking, head, helmet

# 测试图片列表（相对于 backend 目录，或使用绝对路径）
TEST_IMAGES = [
    "ai_test/1.png",
    "ai_test/2.jpg",
    "ai_test/3.jpg",
    "ai_test/4.jpg"
]

# 置信度阈值
CONFIDENCE = 0.1

# 结果保存目录
SAVE_DIR = "ai_test/results"

# ============================================================
#  主逻辑
# ============================================================

def main():
    # 切换到 backend 目录，保证相对路径正确
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)
    print(f"📂 工作目录: {os.getcwd()}")

    # 检查模型文件
    for tag, path in [("Person模型(A)", MODEL_A_PATH), ("Helmet模型(B)", MODEL_B_PATH)]:
        if not os.path.exists(path):
            print(f"❌ 找不到{tag}: {os.path.abspath(path)}")
            sys.exit(1)

    os.makedirs(SAVE_DIR, exist_ok=True)

    # 加载模型
    print("⏳ 正在加载双模型...")
    model_a = YOLO(MODEL_A_PATH)
    model_b = YOLO(MODEL_B_PATH)
    print(f"✅ 模型A类别: {model_a.names}")
    print(f"✅ 模型B类别: {model_b.names}")

    print("\n" + "=" * 60)
    print("🚀 开始双模型检测测试")
    print("=" * 60)

    for img_path in TEST_IMAGES:
        if not os.path.exists(img_path):
            print(f"\n⚠️  跳过（文件不存在）: {img_path}")
            continue

        frame = cv2.imread(img_path)
        if frame is None:
            print(f"\n⚠️  跳过（无法读取）: {img_path}")
            continue

        # ---------- 双模型推理 ----------
        res_a = model_a.predict(source=frame, conf=CONFIDENCE, verbose=False)[0]
        res_b = model_b.predict(source=frame, conf=CONFIDENCE, verbose=False)[0]

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

        # ---------- 输出判定结果 ----------
        img_name = os.path.basename(img_path)
        print(f"\n📸 {img_name}  (检测到 {len(all_boxes)} 个目标)")

        # 逐个目标打印
        for b in all_boxes:
            print(f"   ├─ {b['label']:>10s}  conf={b['conf']:.3f}  box={[int(x) for x in b['coords']]}")

        has_person_signal = any(t in ['person', 'helmet', 'head', 'Smoking'] for t in detected_types)

        if not has_person_signal:
            print("   └─ ⚪ 未扫描到有效目标（人/帽/烟均无）")
        else:
            # 抽烟判定
            if 'Smoking' in detected_types:
                print("   ├─ 【抽烟检测】🚨 报警：发现人员正在抽烟！")
            else:
                print("   ├─ 【抽烟检测】✅ 未发现抽烟行为")

            # 安全帽判定
            if 'helmet' in detected_types:
                print("   └─ 【安全帽】  ✅ 已佩戴安全帽")
            elif any(t in ['person', 'head', 'Smoking'] for t in detected_types):
                print("   └─ 【安全帽】  🚨 报警：发现人员未佩戴安全帽！")
            else:
                print("   └─ 【安全帽】  💬 未检测到人员特征")

        # ---------- 绘制标注图 ----------
        canvas = frame.copy()
        annotator = Annotator(canvas, line_width=2)

        color_map = {
            'helmet':  (0, 255, 0),     # 绿色
            'Smoking': (0, 165, 255),    # 橙色
            'head':    (0, 0, 255),      # 红色
            'person':  (200, 200, 200),  # 灰色
        }

        for b in all_boxes:
            label = b["label"]
            display = f"{label} {b['conf']:.2f}"
            if label == 'head':
                display = f"No Helmet! {b['conf']:.2f}"
            color = color_map.get(label, (255, 255, 0))
            annotator.box_label(b["coords"], display, color=color)

        save_path = os.path.join(SAVE_DIR, f"result_{img_name}")
        cv2.imwrite(save_path, annotator.result())
        print(f"   📍 标注图已保存: {save_path}")

    print("\n" + "=" * 60)
    print(f"✨ 测试完成。结果保存在: {os.path.abspath(SAVE_DIR)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
