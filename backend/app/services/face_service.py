"""
人脸识别服务：YOLO Pose 定位 + FaceNet 特征比对
底库目前从文件目录模拟，后续可替换为数据库用户表读取。
"""
import cv2
import os
import numpy as np


class FaceService:
    def __init__(self, pose_model_path="app/models/yolo11n-pose.pt",
                 face_db_dir="app/data/face_db", similarity_threshold=0.60):
        self.pose_model_path = pose_model_path
        self.face_db_dir = face_db_dir
        self.similarity_threshold = similarity_threshold
        self.pose_model = None
        self.face_model = None
        self.known_db = {}  # {name: {"vector": tensor, "info": str}}
        self._loaded = False

    def ensure_loaded(self):
        if self._loaded:
            return True
        try:
            self._load_models()
            self._load_face_database()
            self._loaded = True
            return True
        except Exception as e:
            print(f"❌ [人脸服务] 初始化失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _load_models(self):
        from ultralytics import YOLO
        from facenet_pytorch import InceptionResnetV1

        base_dir = os.getcwd()
        pose_path = os.path.join(base_dir, self.pose_model_path)

        print("⏳ [人脸服务] 正在加载 YOLO Pose 模型...")
        self.pose_model = YOLO('yolo11n-pose.pt')
        print("✅ [人脸服务] YOLO Pose 模型加载完成")

        print("⏳ [人脸服务] 正在加载 FaceNet 模型...")
        self.face_model = InceptionResnetV1(pretrained='vggface2').eval()
        print("✅ [人脸服务] FaceNet 模型加载完成")

    def _load_face_database(self):
        """
        从底库目录加载人脸特征（模拟数据库用户表）。
        目录结构：
            app/data/face_db/
                ├── 张三.jpg        → 注册名: 张三
                ├── 李四-工号001.jpg → 注册名: 李四
                └── 王五.png        → 注册名: 王五
        文件名（去掉扩展名，取第一个 '-' 前的部分）作为人员姓名。
        """
        base_dir = os.getcwd()
        db_dir = os.path.join(base_dir, self.face_db_dir)

        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            print(f"📂 [人脸服务] 已创建底库目录: {db_dir}")
            print(f"   └─ 请放入人脸图片（文件名即人名），格式: 姓名.jpg")
            return

        image_exts = {'.jpg', '.jpeg', '.png', '.bmp'}
        count = 0
        print("⚙️ [人脸服务] 正在扫描底库并录入人脸特征...")

        for filename in sorted(os.listdir(db_dir)):
            ext = os.path.splitext(filename)[1].lower()
            if ext not in image_exts:
                continue
            name = os.path.splitext(filename)[0].split("-")[0]
            img_path = os.path.join(db_dir, filename)
            try:
                crops = self._find_and_crop_faces(img_path)
                if crops:
                    vec = self._extract_face_vector(crops[0]["face_crop"])
                    self.known_db[name] = {
                        "vector": vec,
                        "info": f"姓名: {name}",  # 模拟用户信息
                    }
                    count += 1
                    print(f"   ✅ [录入成功] {name}")
                else:
                    print(f"   ❌ [录入跳过] {filename} (未检测到人脸)")
            except Exception as e:
                print(f"   ❌ [录入失败] {filename}: {e}")

        print(f"✨ [人脸服务] 底库初始化完成，当前包含 {count} 人")

    def _pre_process_facenet(self, cv2_img):
        import torch
        img_rgb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (160, 160))
        img_tensor = torch.tensor(img_resized).permute(2, 0, 1).float()
        img_tensor = (img_tensor - 127.5) / 128.0
        return img_tensor.unsqueeze(0)

    def _extract_face_vector(self, cv2_img):
        import torch
        img_tensor = self._pre_process_facenet(cv2_img)
        with torch.no_grad():
            vector = self.face_model(img_tensor)
        return vector.flatten()

    def _find_and_crop_faces(self, source):
        """
        从图片路径或视频帧中检测并裁剪人脸区域。
        Returns: list of {"face_crop": ndarray, "coords": [x1, y1, x2, y2]}
        """
        results = self.pose_model.predict(source=source, conf=0.3, verbose=False)[0]
        img_orig = results.orig_img
        face_data = []

        if results.keypoints is not None:
            for kpts in results.keypoints.xy:
                head_pts = kpts[:5].cpu().numpy()
                valid_pts = head_pts[np.any(head_pts != 0, axis=1)]
                if len(valid_pts) < 2:
                    continue

                x_min, y_min = np.min(valid_pts, axis=0)
                x_max, y_max = np.max(valid_pts, axis=0)

                w, h = x_max - x_min, y_max - y_min
                padding = max(w, h) * 0.82
                x1 = int(x_min - padding * 0.5)
                y1 = int(y_min - padding * 0.7)
                x2 = int(x_max + padding * 0.5)
                y2 = int(y_max + padding * 0.4)

                h_orig, w_orig = img_orig.shape[:2]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w_orig, x2), min(h_orig, y2)

                face_roi = img_orig[y1:y2, x1:x2]
                if face_roi.size > 0:
                    face_data.append({
                        "face_crop": face_roi,
                        "coords": [x1, y1, x2, y2],
                    })

        return face_data

    def recognize_faces(self, frame):
        """
        在视频帧中识别人脸，与底库进行比对。
        Returns: list of {"name", "info", "similarity", "coords"}
        """
        if not self._loaded and not self.ensure_loaded():
            return []
        if not self.known_db:
            return []

        face_data = self._find_and_crop_faces(frame)
        if not face_data:
            return []

        import torch.nn.functional as F

        results = []
        for fd in face_data:
            current_vec = self._extract_face_vector(fd["face_crop"])
            match_name = "未知人员"
            match_info = ""
            best_similarity = 0.0

            for name, db_entry in self.known_db.items():
                similarity = F.cosine_similarity(
                    current_vec.unsqueeze(0), db_entry["vector"].unsqueeze(0)
                ).item()
                if similarity > best_similarity:
                    best_similarity = similarity
                    if similarity > self.similarity_threshold:
                        match_name = name
                        match_info = db_entry.get("info", "")

            results.append({
                "name": match_name,
                "info": match_info,
                "similarity": best_similarity,
                "coords": fd["coords"],
            })

        return results
