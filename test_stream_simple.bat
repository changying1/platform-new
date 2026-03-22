@echo off
chcp 65001 > nul
REM ================================================
REM 简化版推流测试 - 直接推流指定视频
REM ================================================

REM FFmpeg 路径
set FFMPEG=D:\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe

REM 在这里直接修改你的视频文件路径
set VIDEO=视频文件路径.mp4

REM 推流地址
set RTMP_URL=rtmp://127.0.0.1:1935/live/test

echo 开始推流...
echo 播放地址: rtmp://127.0.0.1:1935/live/test
echo HLS播放: http://127.0.0.1:8001/live/test/index.m3u8
echo.
echo 按 Ctrl+C 停止推流
echo.

REM 循环推流 (加 -stream_loop -1 参数)
"%FFMPEG%" -stream_loop -1 -re -i "%VIDEO%" -c:v copy -c:a aac -f flv "%RTMP_URL%"

pause
