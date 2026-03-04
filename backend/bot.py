"""
ClipAgent Telegram Bot
- Paste 1 or more YouTube links in one message → each queued automatically
- /watch <url>   → monitor a channel, auto-clip every new video (RSS, 15min poll)
- /unwatch       → stop monitoring
- /clips         → pending clips with approve/reject buttons
- /schedule      → upcoming posts
- /status        → pipeline progress
- /watching      → list monitored channels
"""
import os
import re
import json
import logging
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime

import httpx
from dotenv import load_dotenv
load_dotenv()

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters,
)

from database import SessionLocal, Job, Clip, ScheduledPost, WatchedChannel, init_db
from main import next_slot

log = logging.getLogger("bot")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

TOKEN    = os.getenv("TELEGRAM_BOT_TOKEN", "")
OWNER_ID = os.getenv("TELEGRAM_OWNER_ID", "")

YT_URL_RE = re.compile(
    r"https?://(?:www\.)?(?:youtube\.com/(?:watch\?v=|shorts/|live/)|youtu\.be/)[\w\-]+"
    r"(?:[?&][\w=&%\-]*)?"
)
CHANNEL_URL_RE = re.compile(
    r"https?://(?:www\.)?youtube\.com/(?:@[\w\-]+|channel/[\w\-]+|c/[\w\-]+|user/[\w\-]+)"
)


def is_owner(update: Update) -> bool:
    if not OWNER_ID:
        return True
    return str(update.effective_user.id) == str(OWNER_ID)


# ─────────────────────────────────────────────────────────────────────────────
# /start  /help
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 *ClipAgent is online!*\n\n"
        "📎 *Paste any YouTube link(s)* — I'll find the viral clips, add captions, "
        "crop to 9:16 with face tracking, and send them back to you.\n\n"
        "📡 *Auto-monitor a channel:*\n"
        "  `/watch https://youtube.com/@channel`\n"
        "  Every new video gets clipped automatically as it drops.\n\n"
        "📋 *Commands:*\n"
        "  /clips — pending clips (approve to schedule)\n"
        "  /schedule — upcoming posts\n"
        "  /status — pipeline status\n"
        "  /watching — monitored channels\n"
        "  /unwatch — stop monitoring a channel\n",
        parse_mode="Markdown",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Message handler — handles 1 or MANY YouTube links in one message
# ─────────────────────────────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text or ""

    if not is_owner(update):
        await update.message.reply_text("Sorry, this bot is private.")
        return

    urls = list(dict.fromkeys(YT_URL_RE.findall(text)))   # deduplicated, ordered

    if not urls:
        await update.message.reply_text(
            "Send me a YouTube link (or multiple at once) and I'll clip it. "
            "Use /watch to auto-monitor a channel."
        )
        return

    chat_id = str(update.effective_chat.id)

    if len(urls) == 1:
        await _queue_job(context, urls[0], chat_id, update)
    else:
        await update.message.reply_text(
            f"📦 *Got {len(urls)} links!* Queuing all of them...",
            parse_mode="Markdown",
        )
        for url in urls:
            await _queue_job(context, url, chat_id, update, silent=True)
        await update.message.reply_text(
            f"✅ *{len(urls)} jobs queued!*\n"
            "I'll send each set of clips as they finish. Use /status to track progress.",
            parse_mode="Markdown",
        )


async def _queue_job(context, url, chat_id, update, silent=False) -> int:
    db = SessionLocal()
    try:
        job = Job(url=url, telegram_chat_id=chat_id)
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    if not silent:
        await update.message.reply_text(
            f"🎬 *Job #{job_id} queued!*\n`{url}`\n\n"
            "⏳ Downloading audio first (much faster for long videos)...\n"
            "I'll send the clips back when they're ready.",
            parse_mode="Markdown",
        )

    context.application.job_queue.run_once(
        _run_pipeline,
        when=0,
        data={"job_id": job_id, "chat_id": chat_id},
        name=f"job_{job_id}",
    )
    return job_id


async def _run_pipeline(context: ContextTypes.DEFAULT_TYPE):
    data   = context.job.data
    job_id = data["job_id"]
    from pipeline import process_job
    try:
        await process_job(job_id)
    except Exception as e:
        log.error(f"Pipeline error job #{job_id}: {e}", exc_info=True)
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status    = "error"
                job.error_msg = str(e)[:300]
                db.commit()
        finally:
            db.close()
        try:
            await context.bot.send_message(
                chat_id=data["chat_id"],
                text=f"❌ Job #{job_id} failed:\n`{str(e)[:200]}`",
                parse_mode="Markdown",
            )
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# /watch — auto-monitor a YouTube channel
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_watch(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_owner(update):
        return

    args = " ".join(context.args or []).strip()
    match = CHANNEL_URL_RE.search(args)
    if not args or not match:
        await update.message.reply_text(
            "Usage: `/watch https://youtube.com/@channelname`",
            parse_mode="Markdown",
        )
        return

    channel_url = match.group(0).rstrip("/")
    chat_id     = str(update.effective_chat.id)

    name = channel_url.split("/")[-1]
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--playlist-items", "0", "--flat-playlist", channel_url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=25)
        info   = json.loads(out.decode(errors="replace"))
        name   = info.get("channel", info.get("uploader", name))[:80]
    except Exception:
        pass

    db = SessionLocal()
    try:
        existing = db.query(WatchedChannel).filter(WatchedChannel.url == channel_url).first()
        if existing:
            existing.active = True
            existing.telegram_chat_id = chat_id
            db.commit()
            await update.message.reply_text(
                f"🔄 Already watching *{existing.name or name}* — re-activated.",
                parse_mode="Markdown",
            )
            return
        db.add(WatchedChannel(url=channel_url, name=name, telegram_chat_id=chat_id))
        db.commit()
    finally:
        db.close()

    await update.message.reply_text(
        f"📡 Now watching *{name}*!\n\n"
        "Every new upload will be automatically clipped and sent here.\n"
        "Checks every 15 min. Use /watching to see all channels.",
        parse_mode="Markdown",
    )


async def cmd_watching(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        channels = db.query(WatchedChannel).filter(WatchedChannel.active == True).all()
        if not channels:
            await update.message.reply_text(
                "Not watching any channels. Use `/watch <url>` to start.", parse_mode="Markdown"
            )
            return
        lines = ["📡 *Monitored Channels:*\n"]
        for ch in channels:
            checked = ch.checked_at.strftime("%b %d %H:%M") if ch.checked_at else "never"
            lines.append(f"• *{ch.name or ch.url}*\n  Last checked: {checked}")
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    finally:
        db.close()


async def cmd_unwatch(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        channels = db.query(WatchedChannel).filter(WatchedChannel.active == True).all()
        if not channels:
            await update.message.reply_text("Not watching any channels.")
            return
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton(ch.name or ch.url[:40], callback_data=f"unwatch:{ch.id}")]
            for ch in channels
        ])
        await update.message.reply_text("Which channel should I stop watching?", reply_markup=keyboard)
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# /clips — pending clips with inline approve/reject
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_clips(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        clips = (
            db.query(Clip)
            .filter(Clip.status == "pending")
            .order_by(Clip.viral_score.desc())
            .limit(8)
            .all()
        )
        if not clips:
            await update.message.reply_text(
                "No pending clips. Paste a YouTube link or use /status to check jobs in progress."
            )
            return
        for clip in clips:
            title = clip.job.title[:40] if clip.job else f"Job #{clip.job_id}"
            text  = (
                f"🎬 *Clip #{clip.id}* — {clip.viral_score:.0f}% viral\n"
                f"📹 {title}\n"
                f"⏱ {_fmt_time(clip.start_time)}–{_fmt_time(clip.end_time)} ({clip.duration:.0f}s)\n"
                f"💬 {clip.caption[:80] if clip.caption else '—'}"
            )
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("✅ Schedule all 3 platforms", callback_data=f"approve_all:{clip.id}")],
                [
                    InlineKeyboardButton("TikTok",    callback_data=f"post:tiktok:{clip.id}"),
                    InlineKeyboardButton("Instagram", callback_data=f"post:instagram:{clip.id}"),
                    InlineKeyboardButton("YouTube",   callback_data=f"post:youtube:{clip.id}"),
                ],
                [InlineKeyboardButton("❌ Reject", callback_data=f"reject:{clip.id}")],
            ])
            await update.message.reply_text(text, reply_markup=keyboard, parse_mode="Markdown")
    finally:
        db.close()


async def cmd_schedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        posts = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.status == "pending")
            .order_by(ScheduledPost.scheduled_at.asc())
            .limit(10)
            .all()
        )
        if not posts:
            await update.message.reply_text("No scheduled posts. Use /clips to approve clips.")
            return
        lines = ["📅 *Upcoming Posts:*\n"]
        for p in posts:
            dt  = p.scheduled_at.strftime("%b %d %I:%M %p") if p.scheduled_at else "TBD"
            lines.append(f"• *{p.platform.capitalize()}* @ {dt}\n  {(p.caption or '')[:50]}")
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    finally:
        db.close()


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        jobs = db.query(Job).order_by(Job.created_at.desc()).limit(8).all()
        if not jobs:
            await update.message.reply_text("No jobs yet. Paste a YouTube link!")
            return
        EMOJI = {
            "queued": "⏳", "downloading": "⬇️", "transcribing": "📝",
            "scoring": "🧠", "clipping": "✂️", "done": "✅", "error": "❌",
        }
        lines = ["🔧 *Recent Jobs:*\n"]
        for j in jobs:
            lines.append(
                f"{EMOJI.get(j.status, '•')} *#{j.id}* {j.status} — {(j.title or j.url)[:50]}\n"
                f"   {len(j.clips)} clips"
            )
        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Inline button callbacks
# ─────────────────────────────────────────────────────────────────────────────

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data

    db = SessionLocal()
    try:
        if data.startswith("approve_all:"):
            clip_id = int(data.split(":")[1])
            clip    = db.query(Clip).filter(Clip.id == clip_id).first()
            if not clip:
                await query.edit_message_text("Clip not found.")
                return
            lines = []
            for platform in ["tiktok", "instagram", "youtube"]:
                sched_dt = next_slot(platform)
                db.add(ScheduledPost(clip_id=clip_id, platform=platform, caption=clip.caption, scheduled_at=sched_dt))
                lines.append(f"• *{platform.capitalize()}*: {sched_dt.strftime('%b %d %I:%M %p')}")
            clip.status = "scheduled"
            db.commit()
            await query.edit_message_text(
                f"✅ *Clip #{clip_id} scheduled on all 3 platforms!*\n\n" + "\n".join(lines),
                parse_mode="Markdown",
            )

        elif data.startswith("post:"):
            _, platform, clip_id_str = data.split(":")
            clip_id = int(clip_id_str)
            clip    = db.query(Clip).filter(Clip.id == clip_id).first()
            if not clip:
                await query.edit_message_text("Clip not found.")
                return
            sched_dt = next_slot(platform)
            db.add(ScheduledPost(clip_id=clip_id, platform=platform, caption=clip.caption, scheduled_at=sched_dt))
            clip.status = "scheduled"
            db.commit()
            await query.edit_message_text(
                f"📅 Clip #{clip_id} → *{platform.capitalize()}*\n"
                f"Scheduled: {sched_dt.strftime('%b %d %I:%M %p')} UTC",
                parse_mode="Markdown",
            )

        elif data.startswith("reject:"):
            clip_id = int(data.split(":")[1])
            clip    = db.query(Clip).filter(Clip.id == clip_id).first()
            if clip:
                clip.status = "rejected"
                db.commit()
            await query.edit_message_text(f"❌ Clip #{clip_id} rejected.")

        elif data.startswith("unwatch:"):
            ch_id = int(data.split(":")[1])
            ch    = db.query(WatchedChannel).filter(WatchedChannel.id == ch_id).first()
            if ch:
                ch.active = False
                db.commit()
                await query.edit_message_text(
                    f"🔕 Stopped watching *{ch.name or ch.url}*.", parse_mode="Markdown"
                )
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Background: channel watcher (every 15 min, via YouTube RSS)
# ─────────────────────────────────────────────────────────────────────────────

async def check_channels_job(context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        channels = db.query(WatchedChannel).filter(WatchedChannel.active == True).all()
        channel_data = [(ch.id, ch.url, ch.name, ch.telegram_chat_id, ch.last_video_id) for ch in channels]
    finally:
        db.close()

    for ch_id, ch_url, ch_name, chat_id, last_vid_id in channel_data:
        try:
            new_videos = await _get_new_videos(ch_url, last_vid_id)
            if not new_videos:
                continue

            log.info(f"[Watch] {ch_name}: {len(new_videos)} new video(s)")

            db = SessionLocal()
            try:
                ch = db.query(WatchedChannel).filter(WatchedChannel.id == ch_id).first()
                if ch:
                    ch.last_video_id = new_videos[0]["id"]
                    ch.checked_at    = datetime.utcnow()
                    db.commit()
            finally:
                db.close()

            for vid in new_videos[:3]:
                yt_url = f"https://www.youtube.com/watch?v={vid['id']}"
                await context.bot.send_message(
                    chat_id=chat_id,
                    text=f"📡 *New video from {ch_name}!*\n\n*{vid['title']}*\n\nAuto-clipping now...",
                    parse_mode="Markdown",
                )
                db = SessionLocal()
                try:
                    job = Job(url=yt_url, telegram_chat_id=chat_id, title=vid["title"][:120])
                    db.add(job)
                    db.commit()
                    db.refresh(job)
                    job_id = job.id
                finally:
                    db.close()

                context.application.job_queue.run_once(
                    _run_pipeline, when=5,
                    data={"job_id": job_id, "chat_id": chat_id},
                    name=f"job_{job_id}",
                )
        except Exception as e:
            log.warning(f"[Watch] Error checking {ch_url}: {e}")


async def _get_new_videos(channel_url: str, last_video_id: str) -> list:
    channel_id = await _resolve_channel_id(channel_url)
    if not channel_id:
        return []

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    ns   = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt":   "http://www.youtube.com/xml/schemas/2015",
    }
    videos = []
    for entry in root.findall("atom:entry", ns):
        vid_id = entry.findtext("yt:videoId", namespaces=ns, default="")
        title  = entry.findtext("atom:title",  namespaces=ns, default="")
        if vid_id == last_video_id:
            break
        if vid_id:
            videos.append({"id": vid_id, "title": title})
    return videos


async def _resolve_channel_id(channel_url: str) -> str:
    m = re.search(r"youtube\.com/channel/(UC[\w-]+)", channel_url)
    if m:
        return m.group(1)
    try:
        proc = await asyncio.create_subprocess_exec(
            "yt-dlp", "--dump-json", "--playlist-items", "0",
            "--flat-playlist", channel_url,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=20)
        return json.loads(out.decode(errors="replace")).get("channel_id", "")
    except Exception:
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# Background: auto-post due scheduled posts (every 60s)
# ─────────────────────────────────────────────────────────────────────────────

async def auto_post_job(context: ContextTypes.DEFAULT_TYPE):
    now = datetime.utcnow()
    db  = SessionLocal()
    try:
        due = (
            db.query(ScheduledPost)
            .filter(ScheduledPost.status == "pending", ScheduledPost.scheduled_at <= now)
            .all()
        )
        for post in due:
            clip = post.clip
            if not clip or not clip.file_path or not os.path.exists(clip.file_path):
                post.status = "failed"
                db.commit()
                continue
            try:
                from platforms import post_to_platform
                result         = post_to_platform(post.platform, clip.file_path, post.caption)
                post.status    = "posted"
                post.posted_at = now
                post.post_url  = result.get("post_url", "")
                if clip.status != "posted":
                    clip.status = "posted"
                db.commit()
                log.info(f"Posted clip #{clip.id} to {post.platform}: {post.post_url}")
                owner = os.getenv("TELEGRAM_OWNER_ID", "")
                if owner:
                    try:
                        await context.bot.send_message(
                            chat_id=owner,
                            text=f"📤 *Posted to {post.platform.capitalize()}!*\n{post.post_url}",
                            parse_mode="Markdown",
                        )
                    except Exception:
                        pass
            except Exception as e:
                log.error(f"Auto-post failed post #{post.id} ({post.platform}): {e}")
                post.status = "failed"
                db.commit()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_time(secs: float) -> str:
    m, s = divmod(int(secs), 60)
    return f"{m}:{s:02d}"


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN not set in .env")

    init_db()

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start",    cmd_start))
    app.add_handler(CommandHandler("help",     cmd_start))
    app.add_handler(CommandHandler("clips",    cmd_clips))
    app.add_handler(CommandHandler("schedule", cmd_schedule))
    app.add_handler(CommandHandler("status",   cmd_status))
    app.add_handler(CommandHandler("watch",    cmd_watch))
    app.add_handler(CommandHandler("watching", cmd_watching))
    app.add_handler(CommandHandler("unwatch",  cmd_unwatch))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(handle_callback))

    app.job_queue.run_repeating(auto_post_job,      interval=60,  first=15)
    app.job_queue.run_repeating(check_channels_job, interval=900, first=60)

    log.info("ClipAgent bot running.")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
