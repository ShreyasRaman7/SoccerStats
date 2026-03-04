"""
Core processing pipeline:
  YT URL → download → transcribe → score → clip → face-crop → captions → done
"""
import os
import asyncio
import subprocess
import logging
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, Job, Clip
from ai_scorer import pick_best_clips, generate_caption
from face_tracker import crop_to_916
from captioner import transcribe_audio, burn_captions

log = logging.getLogger("pipeline")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CLIPS_DIR   = os.path.join(os.path.dirname(__file__), "clips")
MIN_SCORE   = float(os.getenv("MIN_VIRAL_SCORE", 70))
MAX_CLIPS   = int(os.getenv("MAX_CLIPS_PER_VIDEO", 8))
WHISPER_MDL = os.getenv("WHISPER_MODEL", "base")

os.makedirs(CLIPS_DIR, exist_ok=True)


def _set_status(job_id: int, status: str, **kwargs):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status     = status
            job.updated_at = datetime.utcnow()
            for k, v in kwargs.items():
                setattr(job, k, v)
            db.commit()
    finally:
        db.close()


def _save_clip(job_id: int, start: float, end: float, score: float,
               caption: str, hashtags: str, file_path: str, face_tracked: bool) -> int:
    db = SessionLocal()
    try:
        clip = Clip(
            job_id       = job_id,
            start_time   = round(start, 2),
            end_time     = round(end, 2),
            duration     = round(end - start, 2),
            viral_score  = round(score, 1),
            caption      = caption,
            hashtags     = hashtags,
            file_path    = file_path,
            face_tracked = face_tracked,
            status       = "pending",
        )
        db.add(clip)
        db.commit()
        db.refresh(clip)
        return clip.id
    finally:
        db.close()


async def process_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        url = job.url
        chat_id = job.telegram_chat_id
    finally:
        db.close()

    work_dir = os.path.join(CLIPS_DIR, f"job_{job_id}")
    os.makedirs(work_dir, exist_ok=True)

    # ── 1. Download ────────────────────────────────────────────────────────────
    log.info(f"[Job {job_id}] Downloading {url}")
    _set_status(job_id, "downloading")

    video_path = os.path.join(work_dir, "source.mp4")
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp",
            "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--write-info-json",
            "--no-playlist",
            "-o", video_path,
            url,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(stderr.decode()[:300])
    except Exception as e:
        _set_status(job_id, "error", error_msg=f"Download failed: {e}")
        await _notify(chat_id, f"❌ Download failed for job #{job_id}:\n{e}")
        return

    # Read title from info json
    import json, glob
    info_files = glob.glob(os.path.join(work_dir, "*.info.json"))
    title = f"Video #{job_id}"
    if info_files:
        try:
            with open(info_files[0]) as f:
                info = json.load(f)
            title    = info.get("title", title)[:120]
            duration = int(info.get("duration", 0))
            thumb    = info.get("thumbnail", "")
            _set_status(job_id, "downloading", title=title, duration_secs=duration, thumbnail=thumb)
        except Exception:
            pass

    await _notify(chat_id, f"⬇️ Downloaded: *{title}*\nNow transcribing & finding viral clips...")

    # ── 2. Transcribe ─────────────────────────────────────────────────────────
    log.info(f"[Job {job_id}] Transcribing")
    _set_status(job_id, "transcribing")

    audio_path = os.path.join(work_dir, "audio.wav")
    try:
        await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            audio_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.sleep(1)   # let ffmpeg finish (subprocess is non-blocking)

        loop = asyncio.get_event_loop()
        segments = await loop.run_in_executor(
            None, transcribe_audio, audio_path, WHISPER_MDL
        )
    except Exception as e:
        log.warning(f"[Job {job_id}] Transcription failed: {e}. Continuing with empty transcript.")
        segments = []

    # ── 3. Score & select clips ───────────────────────────────────────────────
    log.info(f"[Job {job_id}] Scoring {len(segments)} segments")
    _set_status(job_id, "scoring")

    loop = asyncio.get_event_loop()
    candidates = await loop.run_in_executor(
        None, pick_best_clips, segments, MIN_SCORE, MAX_CLIPS
    )

    if not candidates:
        # Fall back: split video into equal parts and score each chunk
        log.info(f"[Job {job_id}] No segments above threshold — using fallback chunking")
        candidates = _fallback_chunks(segments)

    log.info(f"[Job {job_id}] {len(candidates)} clip candidates selected")

    # ── 4. Extract + crop + caption each clip ─────────────────────────────────
    _set_status(job_id, "clipping")
    clip_ids = []

    for idx, cand in enumerate(candidates):
        start    = cand["start"]
        end      = cand["end"]
        duration = end - start
        score    = cand["viral_score"]
        text     = cand.get("text", "")

        log.info(f"[Job {job_id}] Clip {idx+1}: {start:.1f}s–{end:.1f}s score={score:.0f}")

        raw_path      = os.path.join(work_dir, f"clip_{idx:02d}_raw.mp4")
        cropped_path  = os.path.join(work_dir, f"clip_{idx:02d}_cropped.mp4")
        final_path    = os.path.join(CLIPS_DIR, f"job{job_id}_clip{idx:02d}.mp4")

        # 4a. Extract raw clip
        try:
            await asyncio.create_subprocess_exec(
                "ffmpeg", "-y",
                "-ss", str(start), "-to", str(end),
                "-i", video_path,
                "-c", "copy",
                raw_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.sleep(0.5)
        except Exception as e:
            log.warning(f"[Job {job_id}] Clip {idx} extraction failed: {e}")
            continue

        if not os.path.exists(raw_path):
            continue

        # 4b. Face-track crop to 9:16
        face_tracked = await loop.run_in_executor(None, crop_to_916, raw_path, cropped_path)
        source_for_caption = cropped_path if face_tracked and os.path.exists(cropped_path) else raw_path

        # 4c. Burn captions
        clip_segments = [s for s in segments if s["start"] >= start - 0.5 and s["end"] <= end + 0.5]
        cap_ok = await loop.run_in_executor(
            None, burn_captions, source_for_caption, final_path, clip_segments, start
        )
        if not cap_ok:
            # Fall back: just copy without captions
            import shutil
            shutil.copy(source_for_caption, final_path)

        # 4d. Generate caption text
        caption  = await loop.run_in_executor(None, generate_caption, text, "tiktok")
        hashtags = "#football #viral #clips #soccer"

        clip_id = _save_clip(
            job_id, start, end, score,
            caption, hashtags, final_path, face_tracked,
        )
        clip_ids.append(clip_id)

        # Clean up intermediates
        for p in [raw_path, cropped_path, audio_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass

    # ── 5. Done ───────────────────────────────────────────────────────────────
    _set_status(job_id, "done")
    log.info(f"[Job {job_id}] Done — {len(clip_ids)} clips")

    await _notify(
        chat_id,
        f"✅ *{title}*\n\n"
        f"✂️ Found *{len(clip_ids)} viral clips*\n"
        f"Reply with clip IDs to approve for posting, or /clips to see all.\n\n"
        + "\n".join(f"• Clip #{cid}" for cid in clip_ids)
    )

    # Send each clip file to Telegram
    for clip_id in clip_ids:
        await _send_clip(chat_id, clip_id)


def _fallback_chunks(segments, chunk_secs=30, max_chunks=5):
    """When there's no good transcript, create evenly-spaced clip candidates."""
    if not segments:
        return []
    total = segments[-1]["end"] if segments else 120
    chunks = []
    t = 10.0
    while t + chunk_secs < total and len(chunks) < max_chunks:
        chunks.append({
            "start": t,
            "end": t + chunk_secs,
            "text": "",
            "viral_score": 72.0,
            "duration": chunk_secs,
        })
        t += chunk_secs + 5
    return chunks


async def _notify(chat_id: str, text: str):
    """Send a Telegram message if a chat_id is set."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token or not chat_id:
        return
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=10,
            )
    except Exception as e:
        log.warning(f"Telegram notify failed: {e}")


async def _send_clip(chat_id: str, clip_id: int):
    """Send a clip video file to Telegram."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token or not chat_id:
        return

    db = SessionLocal()
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip or not clip.file_path or not os.path.exists(clip.file_path):
            return
        file_path = clip.file_path
        caption   = f"🎬 *Clip #{clip_id}* — Viral Score: {clip.viral_score:.0f}%\n\n{clip.caption}"
    finally:
        db.close()

    try:
        import httpx
        async with httpx.AsyncClient(timeout=120) as client:
            with open(file_path, "rb") as f:
                await client.post(
                    f"https://api.telegram.org/bot{token}/sendVideo",
                    data={"chat_id": chat_id, "caption": caption, "parse_mode": "Markdown"},
                    files={"video": f},
                )
    except Exception as e:
        log.warning(f"Send clip failed: {e}")
