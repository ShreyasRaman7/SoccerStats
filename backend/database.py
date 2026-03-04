import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, Boolean, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DB_PATH = os.path.join(os.path.dirname(__file__), "clipagent.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Job(Base):
    __tablename__ = "jobs"

    id            = Column(Integer, primary_key=True, index=True)
    url           = Column(String, nullable=False)
    title         = Column(String, default="")
    thumbnail     = Column(String, default="")
    duration_secs = Column(Integer, default=0)
    # queued | downloading | transcribing | scoring | clipping | done | error
    status        = Column(String, default="queued")
    error_msg     = Column(Text, default="")
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    telegram_chat_id = Column(String, default="")

    clips = relationship("Clip", back_populates="job", cascade="all, delete-orphan")


class Clip(Base):
    __tablename__ = "clips"

    id           = Column(Integer, primary_key=True, index=True)
    job_id       = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    start_time   = Column(Float, nullable=False)   # seconds
    end_time     = Column(Float, nullable=False)   # seconds
    duration     = Column(Float, nullable=False)
    viral_score  = Column(Float, default=0.0)      # 0-100
    caption      = Column(Text, default="")
    hashtags     = Column(Text, default="")
    file_path    = Column(String, default="")      # path to final processed clip
    raw_path     = Column(String, default="")      # path to raw clip before processing
    face_tracked = Column(Boolean, default=False)
    # pending | approved | scheduled | posted | rejected
    status       = Column(String, default="pending")
    created_at   = Column(DateTime, default=datetime.utcnow)

    job           = relationship("Job", back_populates="clips")
    scheduled_posts = relationship("ScheduledPost", back_populates="clip", cascade="all, delete-orphan")


class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id           = Column(Integer, primary_key=True, index=True)
    clip_id      = Column(Integer, ForeignKey("clips.id"), nullable=False)
    platform     = Column(String, nullable=False)   # tiktok | instagram | youtube
    caption      = Column(Text, default="")
    scheduled_at = Column(DateTime, nullable=False)
    posted_at    = Column(DateTime, nullable=True)
    # pending | posted | failed
    status       = Column(String, default="pending")
    post_url     = Column(String, default="")
    views        = Column(Integer, default=0)
    likes        = Column(Integer, default=0)
    shares       = Column(Integer, default=0)
    created_at   = Column(DateTime, default=datetime.utcnow)

    clip = relationship("Clip", back_populates="scheduled_posts")


class WatchedChannel(Base):
    __tablename__ = "watched_channels"

    id           = Column(Integer, primary_key=True, index=True)
    url          = Column(String, nullable=False, unique=True)   # channel URL
    name         = Column(String, default="")
    telegram_chat_id = Column(String, default="")
    last_video_id    = Column(String, default="")   # yt video ID of last processed video
    check_interval   = Column(Integer, default=60)  # minutes
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    checked_at   = Column(DateTime, nullable=True)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
