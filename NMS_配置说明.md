# Node Media Server (NMS) 配置说明

## 问题原因

`node-media-server` v4.2.2 **不支持** `/api/relays` 动态API端点。这是一个在 v2.x 版本中存在的功能,但在 v4.x 中已被移除。

## 解决方案

### 当前修改
已修改 `backend/app/services/video_service.py`,移除了对 NMS API 的调用。现在添加摄像头只会在数据库中创建记录。

### 如何配置摄像头流

当你通过前端添加摄像头后,需要手动配置 NMS:

#### 步骤 1: 添加摄像头(前端操作)
通过前端"视频中心"添加摄像头,填写:
- 名称: `测试摄像头1`
- RTSP地址: `rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101`

系统会生成流名称: `测试摄像头1` → `测试摄像头1` (转为URL安全格式)

#### 步骤 2: 修改 media_server/app.js
打开 `media_server/app.js`,找到 `relay` 配置部分,添加任务:

```javascript
relay: {
  ffmpeg: 'D:/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe',
  tasks: [
    {
      app: 'live',
      mode: 'pull',
      edge: 'rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101',
      name: '测试摄像头1',
      rtsp_transport: 'tcp'
    }
    // 添加更多摄像头...
  ]
}
```

#### 步骤 3: 重启 media_server
```powershell
cd media_server
npm start
```

#### 步骤 4: 验证流
HLS 播放地址: `http://127.0.0.1:8001/live/测试摄像头1.m3u8`

## 未来改进建议

### 方案 A: 降级到 v2.x
```json
{
  "dependencies": {
    "node-media-server": "^2.6.0"
  }
}
```

### 方案 B: 使用其他流媒体服务器
考虑使用支持动态API的服务器:
- **MediaMTX** (推荐,Go语言,性能好)
- **ZLMediaKit** (C++,功能强大)
- **SRS** (Simple RTMP Server)

### 方案 C: 实现配置文件自动生成
编写脚本自动修改 `app.js` 并重启服务。

## 当前状态
- ✅ 数据库记录创建正常
- ❌ 需要手动配置 NMS relay 任务
- ⚠️ 添加摄像头后状态默认为 `offline`,配置 NMS 后改为 `online`
