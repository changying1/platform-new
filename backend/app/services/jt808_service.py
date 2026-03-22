import socket
import struct
import threading
import time
from datetime import datetime
from app.utils.logger import get_logger
from app.utils.coord_transform import wgs84_to_gcj02
from app.core.database import SessionLocal
from app.models.device import Device

logger = get_logger("JT808")

class JT808Packet:
    @staticmethod
    def get_checksum(data: bytes) -> int:
        checksum = 0
        for b in data:
            checksum ^= b
        return checksum

    @staticmethod
    def escape(data: bytes) -> bytes:
        res = bytearray()
        for b in data:
            if b == 0x7e:
                res.extend([0x7d, 0x02])
            elif b == 0x7d:
                res.extend([0x7d, 0x01])
            else:
                res.append(b)
        return bytes(res)

    @staticmethod
    def pack(msg_id: int, phone: str, seq: int, body: bytes) -> bytes:
        msg_attr = len(body) & 0x03FF
        phone_bcd = bytes.fromhex(phone.zfill(12))
        header = struct.pack('>H H 6s H', msg_id, msg_attr, phone_bcd, seq)
        content = header + body
        checksum = JT808Packet.get_checksum(content)
        escaped = JT808Packet.escape(content + bytes([checksum]))
        return b'\x7e' + escaped + b'\x7e'

def unescape(data: bytes) -> bytes:
    res = bytearray()
    i = 0
    while i < len(data):
        if data[i] == 0x7d and i + 1 < len(data):
            if data[i+1] == 0x01: res.append(0x7d); i += 2
            elif data[i+1] == 0x02: res.append(0x7e); i += 2
            else: res.append(data[i]); i += 1
        else: res.append(data[i]); i += 1
    return bytes(res)

def generate_8001_reply(msg_id, phone, seq, result=0):
    target_id = int(msg_id, 16) if isinstance(msg_id, str) else msg_id
    body = struct.pack('>H H B', seq, target_id, result)
    return JT808Packet.pack(0x8001, phone, 0, body)

def generate_8100_reply(phone, seq, auth_code="AUTH123456"):
    result = 0 
    material = struct.pack('>H B', seq, result) + auth_code.encode('gbk')
    return JT808Packet.pack(0x8100, phone, 0, material)

class JT808Manager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(JT808Manager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.host = '0.0.0.0'
        self.port = 8989
        self.last_seen = {}  # {phone_num: timestamp}
        self.running = False
        self._initialized = True

    def ensure_device_exists(self, db, phone_num):
        """确保设备在数据库中存在，不存在则新增"""
        device = db.query(Device).filter(Device.stream_url == phone_num).first()
        if not device:
            logger.info(f"【自动注册】发现新设备，正在创建记录: {phone_num}")
            new_device = Device(
                id=f"JT808-{phone_num}",
                device_name=f"定位终端-{phone_num}",
                device_type="JT808",
                ip_address="0.0.0.0", # 填充有效字符串防止前端校验失败
                port=8989,
                stream_url=phone_num,
                is_online=True,
                owner_id=1 # 默认归属 admin
            )
            db.add(new_device)
            db.commit()
            return new_device
        return device

    def update_device_data(self, phone_num, lat=None, lon=None):
        """更新设备状态、坐标及心跳"""
        self.last_seen[phone_num] = time.time()
        
        db = SessionLocal()
        try:
            # 1. 确保设备存在
            self.ensure_device_exists(db, phone_num)

            # 2. 准备更新数据
            update_dict = {"is_online": True}
            
            if lat is not None and lon is not None:
                # 原始 WGS84 日志输出
                logger.info(f"收到 [设备:{phone_num}] 原始 WGS84 -> Lat: {lat:.10f}, Lon: {lon:.10f}")
                
                if abs(lat) > 0.000001 and abs(lon) > 0.000001:
                    # 转换 GCJ02
                    gcj_lon, gcj_lat = wgs84_to_gcj02(lon, lat)
                    logger.success(f"纠偏完成 [设备:{phone_num}] 火星坐标 -> Lat: {gcj_lat:.10f}, Lon: {gcj_lon:.10f}")
                    
                    update_dict["last_latitude"] = gcj_lat
                    update_dict["last_longitude"] = gcj_lon
                else:
                    logger.warning(f"设备 {phone_num} 坐标为 (0,0)，可能在室内，暂不更新地图位置")
            
            # 3. 执行更新
            db.query(Device).filter(Device.stream_url == phone_num).update(update_dict)
            db.commit()
        except Exception as e:
            logger.error(f"更新设备 {phone_num} 数据异常: {e}")
            db.rollback()
        finally:
            db.close()

    def timeout_checker(self):
        """超时检测线程"""
        while self.running:
            now = time.time()
            offline_phones = []
            # 检查是否超过 30 分钟 (1800 秒)
            for phone, last_time in list(self.last_seen.items()):
                if now - last_time > 1800:
                    offline_phones.append(phone)
            
            if offline_phones:
                db = SessionLocal()
                try:
                    for phone in offline_phones:
                        db.query(Device).filter(Device.stream_url == phone).update({"is_online": False})
                        if phone in self.last_seen:
                            del self.last_seen[phone]
                        logger.info(f"【超时离线】设备 {phone} 已超过30分钟未上报")
                    db.commit()
                except Exception as e:
                    logger.error(f"超时检测逻辑异常: {e}")
                    db.rollback()
                finally:
                    db.close()
            
            time.sleep(20)

    def handle_client(self, client_sock, addr):
        logger.info(f"【新连接接入】来自: {addr}")
        try:
            buffer = bytearray()
            while self.running:
                data = client_sock.recv(2048)
                if not data: break
                buffer.extend(data)
                
                while b'\x7e' in buffer:
                    start_idx = buffer.find(b'\x7e')
                    end_idx = buffer.find(b'\x7e', start_idx + 1)
                    
                    if end_idx == -1:
                        buffer = buffer[start_idx:]
                        break
                        
                    frame = buffer[start_idx : end_idx + 1]
                    buffer = buffer[end_idx:]
                    
                    if len(frame) < 15:
                        continue
                        
                    content = unescape(frame[1:-1])
                    content_clean = content[:-1] # 移除校验码
                    
                    if len(content_clean) < 12:
                        continue

                    msg_id = content_clean[0:2].hex().upper()
                    msg_attr = struct.unpack('>H', content_clean[2:4])[0]
                    phone_num = content_clean[4:10].hex().upper()
                    seq_num = struct.unpack('>H', content_clean[10:12])[0]

                    is_subpackage = (msg_attr & 0x2000) != 0
                    header_len = 16 if is_subpackage else 12

                    # --- 逻辑处理分发 ---

                    # 1. 终端注册 (0x0100)
                    if msg_id == "0100":
                        logger.info(f"收到 [注册请求] 设备: {phone_num}")
                        self.update_device_data(phone_num)
                        client_sock.sendall(generate_8100_reply(phone_num, seq_num))

                    # 2. 终端鉴权 (0x0102)
                    elif msg_id == "0102":
                        logger.info(f"收到 [鉴权请求] 设备: {phone_num}")
                        self.update_device_data(phone_num)
                        client_sock.sendall(generate_8001_reply(msg_id, phone_num, seq_num))

                    # 3. 终端心跳 (0x0002)
                    elif msg_id == "0002":
                        self.update_device_data(phone_num)
                        client_sock.sendall(generate_8001_reply(msg_id, phone_num, seq_num))

                    # 4. 位置信息汇报 (0x0200, 0x0203, 0x0204)
                    elif msg_id in ["0200", "0203", "0204"]:
                        body = content_clean[header_len:]
                        if len(body) >= 28:
                            lat_int, lon_int = struct.unpack('>I I', body[8:16])
                            lat, lon = lat_int / 10**6, lon_int / 10**6
                            self.update_device_data(phone_num, lat, lon)
                        else:
                            self.update_device_data(phone_num)
                        
                        client_sock.sendall(generate_8001_reply(msg_id, phone_num, seq_num))
                    
                    # 5. 其他消息通用回复
                    else:
                        self.update_device_data(phone_num)
                        client_sock.sendall(generate_8001_reply(msg_id, phone_num, seq_num))

        except Exception as e:
            logger.error(f"客户端 {addr} 通信异常: {e}")
        finally:
            client_sock.close()

    def start_server(self):
        self.running = True
        threading.Thread(target=self.timeout_checker, daemon=True).start()
        
        try:
            server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server_sock.settimeout(2.0)
            server_sock.bind((self.host, self.port))
            server_sock.listen(20)
            logger.success(f"=== JT808 高精度定位服务已启动，监听端口: {self.port} ===")
            
            while self.running:
                try:
                    client_sock, addr = server_sock.accept()
                    threading.Thread(target=self.handle_client, args=(client_sock, addr), daemon=True).start()
                except socket.timeout:
                    continue
        except Exception as e:
            logger.error(f"JT808 服务启动失败: {e}")
        finally:
            self.running = False

jt808_manager = JT808Manager()
