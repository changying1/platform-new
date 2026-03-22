import cv2
import sys
import os
from app.services.ai_service import AIService

def test_ai():
    # 1. 初始化 AI 服务
    # 确保模型文件在 backend/app/models/best.pt
    model_path = os.path.join("app", "models", "best.pt")
    
    if not os.path.exists(model_path):
        print(f"❌ 错误: 找不到模型文件 {model_path}")
        return

    print("--- 正在初始化 AI 服务 ---")
    ai = AIService(model_path=model_path)
    
    # 2. 准备测试图片
    # 请确保你在 backend 目录下放了一张名为 test_site.jpg 的图片
    # 或者修改下面的路径指向你现有的图片
    img_path = "test_site.jpg" 
    
    if not os.path.exists(img_path):
        print(f"⚠️ 提示: 找不到测试图片 '{img_path}'，请在该目录下放置一张图片进行测试。")
        return

    frame = cv2.imread(img_path)
    if frame is None:
        print("❌ 错误: 无法读取图片内容")
        return

    # 3. 执行检测
    print(f"--- 正在对图片 {img_path} 进行安全帽检测 ---")
    detections, alerts = ai.detect_helmet(frame)

    # 4. 打印结果
    print("\n[检测结果]:")
    for det in detections:
        print(f"- 目标: {det['label']}, 置信度: {det['conf']:.2f}, 坐标: {det['coords']}")

    print("\n[告警信息]:")
    if not alerts:
        print("✅ 未发现违规行为。")
    else:
        for alert in alerts:
            print(f"🚨 {alert['category']}: {alert['msg']}")

    # 5. (可选) 绘制结果并保存，方便你肉眼观察
    for det in detections:
        x1, y1, x2, y2 = map(int, det['coords'])
        color = (0, 255, 0) if det['label'] == 'helmet' else (0, 0, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, f"{det['label']}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    output_path = "test_result.jpg"
    cv2.imwrite(output_path, frame)
    print(f"\n--- 测试完成！可视化结果已保存至: {output_path} ---")

if __name__ == "__main__":
    test_ai()