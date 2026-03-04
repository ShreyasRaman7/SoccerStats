import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db, Job, Clip, ScheduledPost

app = FastAPI(title="ClipAgent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLIPS_DIR = os.path.join(os.path.dirname(__file__), "clips")
os.makedirs(CLIPS_DIR, exist_ok=True)
app.mount("/clips", StaticFiles(directory=CLIPS_DIR), name="clips")


@app.on_event("startup")
def startup():
    init_db()


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    url: str
    telegram_chat_id: Optional[str] = ""

class ClipUpdate(BaseModel):
    status: Optional[str] = None
    caption: Optional[str] = None

class ScheduleCreate(BaseModel):
    clip_id: int
    platform: str
    caption: Optional[str] = ""
    scheduled_at: Optional[str] = None   # ISO string; defaults to next best time

class ScheduleUpdate(BaseModel):
    status: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    shares: Optional[int] = None
    post_url: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Helper: serialisers
# ─────────────────────────────────────────────────────────────────────────────

def job_to_dict(j: Job):
    return {
        "id": j.id,
        "url": j.url,
        "title": j.title,
        "thumbnail": j.thumbnail,
        "duration_secs": j.duration_secs,
        "status": j.status,
        "error_msg": j.error_msg,
        "clips_count": len(j.clips),
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "updated_at": j.updated_at.isoformat() if j.updated_at else None,
    }

def clip_to_dict(c: Clip):
    return {
        "id": c.id,
        "job_id": c.job_id,
        "job_title": c.job.title if c.job else "",
        "start_time": c.start_time,
        "end_time": c.end_time,
        "duration": c.duration,
        "viral_score": c.viral_score,
        "caption": c.caption,
        "hashtags": c.hashtags,
        "file_path": f"/clips/{os.path.basename(c.file_path)}" if c.file_path else "",
        "face_tracked": c.face_tracked,
        "status": c.status,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "platforms": [p.platform for p in c.scheduled_posts],
    }

def post_to_dict(p: ScheduledPost):
    return {
        "id": p.id,
        "clip_id": p.clip_id,
        "clip_title": p.clip.job.title if p.clip and p.clip.job else "",
        "clip_caption": p.clip.caption if p.clip else "",
        "platform": p.platform,
        "caption": p.caption,
        "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
        "posted_at": p.posted_at.isoformat() if p.posted_at else None,
        "status": p.status,
        "post_url": p.post_url,
        "views": p.views,
        "likes": p.likes,
        "shares": p.shares,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Jobs
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/jobs")
def create_job(body: JobCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = Job(url=body.url, telegram_chat_id=body.telegram_chat_id or "")
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(run_pipeline, job.id)
    return job_to_dict(job)

@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [job_to_dict(j) for j in jobs]

@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    d = job_to_dict(job)
    d["clips"] = [clip_to_dict(c) for c in job.clips]
    return d


# ─────────────────────────────────────────────────────────────────────────────
# Clips
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/clips")
def list_clips(db: Session = Depends(get_db)):
    clips = db.query(Clip).order_by(Clip.viral_score.desc()).all()
    return [clip_to_dict(c) for c in clips]

@app.get("/api/clips/{clip_id}")
def get_clip(clip_id: int, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip_to_dict(clip)

@app.patch("/api/clips/{clip_id}")
def update_clip(clip_id: int, body: ClipUpdate, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    if body.status is not None:
        clip.status = body.status
    if body.caption is not None:
        clip.caption = body.caption
    db.commit()
    db.refresh(clip)
    return clip_to_dict(clip)


# ─────────────────────────────────────────────────────────────────────────────
# Schedule
# ─────────────────────────────────────────────────────────────────────────────

BEST_TIMES = {
    "tiktok":    [9, 12, 15, 19, 21],
    "instagram": [8, 11, 14, 17, 20],
    "youtube":   [10, 14, 18],
}

def next_slot(platform: str) -> datetime:
    now = datetime.utcnow()
    hours = BEST_TIMES.get(platform.lower(), [12, 18])
    for h in sorted(hours):
        candidate = now.replace(hour=h, minute=0, second=0, microsecond=0)
        if candidate > now:
            return candidate
    # Next day first slot
    tomorrow = (now + timedelta(days=1)).replace(hour=hours[0], minute=0, second=0, microsecond=0)
    return tomorrow

@app.post("/api/schedule")
def create_schedule(body: ScheduleCreate, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == body.clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if body.scheduled_at:
        sched_dt = datetime.fromisoformat(body.scheduled_at)
    else:
        sched_dt = next_slot(body.platform)

    caption = body.caption or clip.caption
    post = ScheduledPost(
        clip_id=body.clip_id,
        platform=body.platform,
        caption=caption,
        scheduled_at=sched_dt,
    )
    db.add(post)
    clip.status = "scheduled"
    db.commit()
    db.refresh(post)
    return post_to_dict(post)

@app.get("/api/schedule")
def list_schedule(db: Session = Depends(get_db)):
    posts = db.query(ScheduledPost).order_by(ScheduledPost.scheduled_at.asc()).all()
    return [post_to_dict(p) for p in posts]

@app.patch("/api/schedule/{post_id}")
def update_schedule(post_id: int, body: ScheduleUpdate, db: Session = Depends(get_db)):
    post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(post, field, val)
    if body.status == "posted":
        post.posted_at = datetime.utcnow()
        if post.clip:
            post.clip.status = "posted"
    db.commit()
    db.refresh(post)
    return post_to_dict(post)

@app.delete("/api/schedule/{post_id}")
def delete_schedule(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(post)
    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    posts = db.query(ScheduledPost).filter(ScheduledPost.status == "posted").all()
    clips = db.query(Clip).all()

    total_views  = sum(p.views  for p in posts)
    total_likes  = sum(p.likes  for p in posts)
    total_shares = sum(p.shares for p in posts)

    by_platform: dict = {}
    for p in posts:
        pl = p.platform
        if pl not in by_platform:
            by_platform[pl] = {"views": 0, "likes": 0, "shares": 0, "posts": 0}
        by_platform[pl]["views"]  += p.views
        by_platform[pl]["likes"]  += p.likes
        by_platform[pl]["shares"] += p.shares
        by_platform[pl]["posts"]  += 1

    avg_score = (
        sum(c.viral_score for c in clips) / len(clips) if clips else 0
    )

    top_clips = sorted(clips, key=lambda c: sum(p.views for p in c.scheduled_posts), reverse=True)[:5]

    return {
        "total_views":   total_views,
        "total_likes":   total_likes,
        "total_shares":  total_shares,
        "total_clips":   len(clips),
        "total_posts":   len(posts),
        "avg_viral_score": round(avg_score, 1),
        "by_platform":   by_platform,
        "top_clips": [
            {
                "id":          c.id,
                "title":       c.caption[:60] if c.caption else f"Clip #{c.id}",
                "platform":    c.scheduled_posts[0].platform if c.scheduled_posts else "—",
                "views":       sum(p.views  for p in c.scheduled_posts),
                "likes":       sum(p.likes  for p in c.scheduled_posts),
                "shares":      sum(p.shares for p in c.scheduled_posts),
                "viral_score": c.viral_score,
            }
            for c in top_clips
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline trigger (called via BackgroundTasks)
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(job_id: int):
    """Synchronous wrapper — runs the async pipeline in a new event loop."""
    import asyncio
    from pipeline import process_job
    asyncio.run(process_job(job_id))


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=False)
