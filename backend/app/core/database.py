from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

Base = declarative_base()

import app.models.admin_user
import app.models.device
import app.models.video
import app.models.group_call
import app.models.fence
import app.models.alarm_records

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:123456@127.0.0.1:3306/smart_helmet_db?charset=utf8mb4"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def ensure_schema_compatibility():
    """Best-effort patch for legacy databases missing newly added columns."""
    required_columns = {
        "project_regions": {
            "project_id": "ALTER TABLE project_regions ADD COLUMN project_id INT NULL",
        },
        "alarm_records": {
            "project_id": "ALTER TABLE alarm_records ADD COLUMN project_id INT NULL",
        },
        "video_devices": {
            "rtsp_url": "ALTER TABLE video_devices ADD COLUMN rtsp_url TEXT NULL",
        },
    }

    with engine.begin() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())

        for table_name, columns in required_columns.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
            for column_name, ddl in columns.items():
                if column_name in existing_columns:
                    continue
                conn.execute(text(ddl))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()