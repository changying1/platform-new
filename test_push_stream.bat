@echo off
chcp 65001 > nul
echo ================================================
echo FFmpeg V4 完美平衡版 (高画质 + 强制低延迟)
echo ================================================
echo.

REM 设置 FFmpeg 路径
set FFMPEG_PATH=C:\Users\DELL\Desktop\platform-shipin-yaokong\platfort-yaokong\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe

if not exist "%FFMPEG_PATH%" (
    echo ❌ 错误: 找不到 FFmpeg
    pause
    exit /b 1
)

REM 设置输入源
set DEFAULT_SOURCE=rtsp://admin:Song%%40871023@10.102.7.154//Streaming/Channels/1
set /p VIDEO_SOURCE="请输入 RTSP 地址或视频路径 (默认: %DEFAULT_SOURCE%): "
if "%VIDEO_SOURCE%"=="" set VIDEO_SOURCE=%DEFAULT_SOURCE%

REM 设置推流目标 (端口 19350)
set STREAM_KEY=test_stream
set RTMP_URL=rtmp://127.0.0.1:19350/live/%STREAM_KEY%

echo.
echo [配置]
echo 源地址: %VIDEO_SOURCE%
echo 推流到: %RTMP_URL%
echo.
echo [V4 优化策略]
echo 1. 传输模式: TCP (稳定防花屏)
echo 2. 延迟控制: 强制重编码，将 GOP 压到 15 (0.6秒)，打破原流长缓存限制。
echo 3. 画质保障: 码率提升至 4000k-6000k，拒绝马赛克。
echo.
echo ⚠️ 验证时请务必检查 VLC 缓存设置为 0ms！
echo.

REM ========================================================
REM 下方命令块中严禁插入任何注释
REM ========================================================

"%FFMPEG_PATH%" ^
 -f rtsp -rtsp_transport tcp ^
 -user_agent "LIVE555 Streaming Media v2013.02.11" ^
 -fflags nobuffer -flags low_delay -strict experimental ^
 -analyzeduration 100000 -probesize 100000 ^
 -i "%VIDEO_SOURCE%" ^
 -c:v libx264 -preset ultrafast -tune zerolatency ^
 -b:v 4000k -maxrate 6000k -bufsize 1000k ^
 -pix_fmt yuv420p -g 15 ^
 -c:a aac -b:a 64k -ar 16000 ^
 -flvflags no_duration_filesize ^
 -f flv "%RTMP_URL%"

echo.
echo 推流已停止
pause