"""
Core processing pipeline:
  YT URL → audio download → transcribe → score → video download → clip → face-crop → captions → done

For long videos (like 2hr podcasts):
  - Downloads audio-only FIRST (fast, ~100MB vs 3GB for full video)
  - Runs Whisper on audio to find the best moments
  - Downloads full video ONLY AFTER knowing which clips to extract
  - Sends each finished clip to Telegram immediately
"""
import os
import asyncio
import json
import glob
import shutil
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


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

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


def _save_clip(job_id, start, end, score, caption, hashtags, file_path, face_tracked) -> int:
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


# ─────────────────────────────────────────────────────────────────────────────
# Subprocess helper — properly awaits completion
# ─────────────────────────────────────────────────────────────────────────────

async def _run(cmd: list, check: bool = True) -> tuple[int, str]:
    """Run a subprocess, wait for it to finish, return (returncode, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr_bytes = await proc.communicate()   # ← actually waits for completion
    stderr = stderr_bytes.decode(errors="replace")
    if check and proc.returncode != 0:
        raise RuntimeError(stderr[:400])
    return proc.returncode, stderr


# ─────────────────────────────────────────────────────────────────────────────
# Main pipeline
# ─────────────────────────────────────────────────────────────────────────────

async def process_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        url     = job.url
        chat_id = job.telegram_chat_id
    finally:
        db.close()

    work_dir = os.path.join(CLIPS_DIR, f"job_{job_id}")
    os.makedirs(work_dir, exist_ok=True)
    loop = asyncio.get_event_loop()

    # ── 1. Fetch video metadata (fast — no download yet) ──────────────────────
    log.info(f"[Job {job_id}] Fetching metadata for {url}")
    _set_status(job_id, "downloading")

    try:
        _, meta_raw = await _run([
            "yt-dlp", "--dump-json", "--no-playlist", url
        ])
        # yt-dlp --dump-json prints JSON to stdout, not stderr
        # re-run capturing stdout
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--no-playlist", url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        meta_bytes, _ = await proc.communicate()
        meta = json.loads(meta_bytes.decode(errors="replace"))
        title    = meta.get("title", f"Video #{job_id}")[:120]
        duration = int(meta.get("duration", 0))
        thumb    = meta.get("thumbnail", "")
        _set_status(job_id, "downloading", title=title, duration_secs=duration, thumbnail=thumb)
    except Exception as e:
        log.warning(f"[Job {job_id}] Metadata fetch failed: {e}. Continuing.")
        title = f"Video #{job_id}"
        duration = 0

    mins = duration // 60
    await _notify(
        chat_id,
        f"📋 *{title}*\n"
        f"⏱ {mins} min video\n\n"
        f"Step 1/4: Downloading audio for transcription..."
    )

    # ── 2. Download audio only (fast: ~100MB for 2hr vs ~2GB for video) ───────
    audio_src = os.path.join(work_dir, "audio_src.m4a")
    audio_wav = os.path.join(work_dir, "audio.wav")
    try:
        await _run([
            "yt-dlp",
            "-f", "bestaudio[ext=m4a]/bestaudio",
            "--no-playlist",
            "-o", audio_src,
            url,
        ])
        log.info(f"[Job {job_id}] Audio downloaded: {audio_src}")
    except Exception as e:
        _set_status(job_id, "error", error_msg=f"Audio download failed: {e}")
        await _notify(chat_id, f"❌ Download failed:\n`{str(e)[:200]}`")
        return

    # Convert to 16kHz mono WAV for Whisper
    try:
        await _run([
            "ffmpeg", "-y", "-i", audio_src,
            "-ar", "16000", "-ac", "1", "-f", "wav",
            audio_wav,
        ])
    except Exception as e:
        _set_status(job_id, "error", error_msg=f"Audio conversion failed: {e}")
        await _notify(chat_id, f"❌ Audio conversion failed:\n`{str(e)[:200]}`")
        return

    # ── 3. Transcribe ─────────────────────────────────────────────────────────
    log.info(f"[Job {job_id}] Transcribing {mins}min audio with Whisper/{WHISPER_MDL}...")
    _set_status(job_id, "transcribing")

    await _notify(
        chat_id,
        f"📝 Step 2/4: Transcribing {mins} min of audio...\n"
        f"_(This takes a few minutes for long videos)_"
    )

    try:
        segments = await loop.run_in_executor(None, transcribe_audio, audio_wav, WHISPER_MDL)
        log.info(f"[Job {job_id}] Got {len(segments)} transcript segments")
    except Exception as e:
        log.warning(f"[Job {job_id}] Transcription failed: {e}. Using empty transcript.")
        segments = []

    # ── 4. Score & pick best clips ────────────────────────────────────────────
    log.info(f"[Job {job_id}] Scoring {len(segments)} segments")
    _set_status(job_id, "scoring")

    candidates = await loop.run_in_executor(
        None, pick_best_clips, segments, MIN_SCORE, MAX_CLIPS
    )

    if not candidates and duration > 0:
        log.info(f"[Job {job_id}] No scored candidates — using time-based fallback")
        candidates = _fallback_chunks(duration, MAX_CLIPS)

    if not candidates:
        _set_status(job_id, "error", error_msg="No clip candidates found")
        await _notify(chat_id, "⚠️ Couldn't find any strong viral moments. Try a different video.")
        return

    log.info(f"[Job {job_id}] {len(candidates)} clip candidates: "
             + ", ".join(f"{c['start']:.0f}s-{c['end']:.0f}s({c['viral_score']:.0f}%)" for c in candidates))

    await _notify(
        chat_id,
        f"🧠 Step 3/4: Found *{len(candidates)} viral moments*\n"
        f"Downloading video and extracting clips...\n\n"
        + "\n".join(
            f"• {_fmt_time(c['start'])}–{_fmt_time(c['end'])} — {c['viral_score']:.0f}% viral"
            for c in candidates
        )
    )

    # ── 5. Download video ─────────────────────────────────────────────────────
    log.info(f"[Job {job_id}] Downloading video")
    _set_status(job_id, "clipping")

    video_path = os.path.join(work_dir, "source.mp4")
    try:
        await _run([
            "yt-dlp",
            "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best",
            "--merge-output-format", "mp4",
            "--no-playlist",
            "-o", video_path,
            url,
        ])
    except Exception as e:
        _set_status(job_id, "error", error_msg=f"Video download failed: {e}")
        await _notify(chat_id, f"❌ Video download failed:\n`{str(e)[:200]}`")
        return

    # ── 6. Extract + crop + caption each clip ─────────────────────────────────
    clip_ids = []

    for idx, cand in enumerate(candidates):
        start = cand["start"]
        end   = cand["end"]
        score = cand["viral_score"]
        text  = cand.get("text", "")

        log.info(f"[Job {job_id}] Processing clip {idx+1}/{len(candidates)}: {start:.1f}s–{end:.1f}s score={score:.0f}%")

        raw_path     = os.path.join(work_dir, f"clip_{idx:02d}_raw.mp4")
        cropped_path = os.path.join(work_dir, f"clip_{idx:02d}_cropped.mp4")
        final_path   = os.path.join(CLIPS_DIR, f"job{job_id}_clip{idx:02d}.mp4")

        # 6a. Extract raw clip — use -ss BEFORE -i for fast seeking on long files
        try:
            await _run([
                "ffmpeg", "-y",
                "-ss", str(start),
                "-i", video_path,
                "-t", str(end - start),
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                raw_path,
            ])
        except Exception as e:
            log.warning(f"[Job {job_id}] Clip {idx} extraction failed: {e}")
            continue

        if not os.path.exists(raw_path) or os.path.getsize(raw_path) < 1000:
            log.warning(f"[Job {job_id}] Clip {idx} raw file missing/empty")
            continue

        # 6b. Face-track crop to 9:16
        face_tracked = await loop.run_in_executor(None, crop_to_916, raw_path, cropped_path)
        src = cropped_path if (face_tracked and os.path.exists(cropped_path)) else raw_path

        # 6c. Burn captions
        clip_segs = [s for s in segments if s["start"] >= start - 0.5 and s["end"] <= end + 0.5]
        cap_ok    = await loop.run_in_executor(None, burn_captions, src, final_path, clip_segs, start)
        if not cap_ok or not os.path.exists(final_path):
            shutil.copy(src, final_path)

        # 6d. Generate social caption
        caption  = await loop.run_in_executor(None, generate_caption, text, "tiktok")
        hashtags = "#podcast #viral #clips"

        clip_id = _save_clip(job_id, start, end, score, caption, hashtags, final_path, face_tracked)
        clip_ids.append(clip_id)

        # Send this clip to Telegram immediately (don't wait for all clips)
        await _send_clip(chat_id, clip_id, idx + 1, len(candidates))

        # Clean up intermediates to save disk space
        for p in [raw_path, cropped_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass

    # ── 7. Done ───────────────────────────────────────────────────────────────
    # Clean up large source files
    for p in [audio_src, audio_wav, video_path]:
        if os.path.exists(p):
            try:
                os.remove(p)
                log.info(f"[Job {job_id}] Cleaned up {os.path.basename(p)}")
            except OSError:
                pass

    _set_status(job_id, "done")
    log.info(f"[Job {job_id}] Done — {len(clip_ids)} clips")

    await _notify(
        chat_id,
        f"✅ *Done! {len(clip_ids)} clips ready*\n\n"
        f"Use /clips to approve clips for posting to TikTok, IG & YouTube."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_chunks(duration_secs: float, max_chunks: int = 8) -> list:
    """
    When Whisper returns nothing useful, pick evenly-spaced clip candidates
    skipping the first and last 5% of the video (intros/outros).
    """
    margin = duration_secs * 0.05
    usable = duration_secs - 2 * margin
    step   = usable / (max_chunks + 1)
    chunks = []
    for i in range(1, max_chunks + 1):
        t_start = margin + step * i - 15
        t_end   = t_start + 30
        if t_start < 0 or t_end > duration_secs:
            continue
        chunks.append({
            "start":       round(t_start, 1),
            "end":         round(t_end, 1),
            "text":        "",
            "viral_score": 72.0,
            "duration":    30.0,
        })
    return chunks


def _fmt_time(secs: float) -> str:
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


async def _notify(chat_id: str, text: str):
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


async def _send_clip(chat_id: str, clip_id: int, clip_num: int = 1, total: int = 1):
    """Send a finished clip video to Telegram with approve/reject buttons."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token or not chat_id:
        return

    db = SessionLocal()
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip or not clip.file_path or not os.path.exists(clip.file_path):
            log.warning(f"Clip #{clip_id} file not found for sending")
            return
        file_path = clip.file_path
        size_mb   = os.path.getsize(file_path) / 1_000_000
        caption   = (
            f"🎬 Clip {clip_num}/{total} — *{clip.viral_score:.0f}% viral*\n"
            f"⏱ {_fmt_time(clip.start_time)}–{_fmt_time(clip.end_time)} "
            f"({clip.duration:.0f}s)\n\n"
            f"{clip.caption}\n\n"
            f"Reply /clips to approve & schedule"
        )
    finally:
        db.close()

    if size_mb > 50:
        # Telegram bot limit is 50MB — notify without sending file
        await _notify(
            chat_id,
            f"🎬 Clip {clip_num}/{total} — {clip.viral_score:.0f}% viral\n"
            f"⚠️ File is {size_mb:.0f}MB (over Telegram's 50MB limit). "
            f"View it on the dashboard instead."
        )
        return

    try:
        import httpx
        async with httpx.AsyncClient(timeout=180) as client:
            with open(file_path, "rb") as f:
                await client.post(
                    f"https://api.telegram.org/bot{token}/sendVideo",
                    data={"chat_id": chat_id, "caption": caption,
                          "parse_mode": "Markdown", "supports_streaming": "true"},
                    files={"video": ("clip.mp4", f, "video/mp4")},
                )
        log.info(f"Sent clip #{clip_id} ({size_mb:.1f}MB) to Telegram")
    except Exception as e:
        log.warning(f"Send clip #{clip_id} failed: {e}")
        await _notify(chat_id, f"⚠️ Couldn't send clip {clip_num} via Telegram ({size_mb:.0f}MB). Check the dashboard.")
