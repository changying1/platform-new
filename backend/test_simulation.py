import time
import sys
import os

# 把当前目录加入路径，确保能导入 app
sys.path.append(os.getcwd())

from app.services.ai_manager import ai_manager

def start_simulation():
    device_id = "sim_device_001"
    # 使用 '0' (字符串) 调用电脑摄像头，或者用视频文件路径
    video_source = "0" 
    
    print("--- 🚀 开始模拟测试 ---")
    
    # 1. 测试孔口检测 (模拟版)
    print("\n👉 启动模式: hole_curb (孔口挡坎 - 模拟)")
    ai_manager.start_monitoring(device_id, video_source, algo_type="hole_curb")
    
    print("⏳ 运行 10 秒钟 (请观察控制台输出)...")
    time.sleep(10)
    
    ai_manager.stop_monitoring(device_id)
    print("✅ 孔口测试结束")

    # 2. 测试标识检测 (模拟版)
    time.sleep(2)
    print("\n👉 启动模式: signage (现场标识 - 模拟)")
    ai_manager.start_monitoring(device_id, video_source, algo_type="signage")
    
    print("⏳ 运行 10 秒钟...")
    time.sleep(10)
    
    ai_manager.stop_monitoring(device_id)
    print("✅ 标识测试结束")

if __name__ == "__main__":
    start_simulation()