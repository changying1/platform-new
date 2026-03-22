from sqlalchemy import Column, Integer, String, Float, Text
from app.core.database import Base

class VideoDevice(Base):
    """
    视频设备模型，用于存储监控摄像头的信息。
    """
    __tablename__ = "video_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, comment="摄像头名称")
    
    # 网络连接信息
    ip_address = Column(String(50), comment="设备IP地址")
    port = Column(Integer, default=80, comment="服务端口")
    username = Column(String(50), comment="登录用户名")
    password = Column(String(100), comment="登录密码")
    
    # 流媒体信息
    stream_url = Column(Text, comment="原始流地址 (RTSP/HLS/FLV)")
    
    # 地理位置信息 (用于在地图上标记)
    latitude = Column(Float, nullable=True, comment="纬度 (GCJ-02)")
    longitude = Column(Float, nullable=True, comment="经度 (GCJ-02)")
    
    # 状态与备注
    status = Column(String(20), default="offline", comment="设备状态: online, offline")
    remark = Column(String(255), comment="备注信息")
    
    # 启用状态
    is_active = Column(Integer, default=1, comment="是否启用 1-启用 0-禁用")