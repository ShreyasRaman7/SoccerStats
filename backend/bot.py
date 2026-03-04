"""
Telegram bot for ClipAgent.
Paste a YouTube link → AI clips it → sends you the clips → ask which to post.
"""
import os
import re
import logging
import asyncio
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, ContextTypes, filters,
)

from database import SessionLocal, Job, Clip, ScheduledPost
from main import next_slot

log = logging.getLogger("bot")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

TOKEN    = os.getenv("TELEGRAM_BOT_TOKEN", "")
OWNER_ID = os.getenv("TELEGRAM_OWNER_ID", "")

YT_PATTERN = re.compile(
    r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)[\w\-]+"
)
PLATFORMS = ["TikTok", "Instagram", "YouTube"]


# ─────────────────────────────────────────────────────────────────────────────
# Guards
# ─────────────────────────────────────────────────────────────────────────────

def is_owner(update: Update) -> bool:
    if not OWNER_ID:
        return True   # No owner set — allow anyone (for testing)
    return str(update.effective_user.id) == str(OWNER_ID)


# ─────────────────────────────────────────────────────────────────────────────
# /start
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 *ClipAgent is online!*\n\n"
        "Just paste a YouTube link and I'll:\n"
        "  ✂️ Find the viral clips\n"
        "  💬 Add clean captions\n"
        "  🎯 Face-track & crop to 9:16\n"
        "  📅 Schedule to TikTok, IG & YouTube\n\n"
        "Commands:\n"
        "  /clips — list recent clips\n"
        "  /schedule — view scheduled posts\n"
        "  /status — pipeline status\n"
        "  /help — this message",
        parse_mode="Markdown",
    )


# ─────────────────────────────────────────────────────────────────────────────
# YouTube link handler — main entry point
# ─────────────────────────────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text or ""
    match = YT_PATTERN.search(text)

    if not match:
        await update.message.reply_text(
            "Send me a YouTube link and I'll clip it for you! 🎬"
        )
        return

    if not is_owner(update):
        await update.message.reply_text("Sorry, this bot is private.")
        return

    url     = match.group(0)
    chat_id = str(update.effective_chat.id)

    # Create job in DB
    db = SessionLocal()
    try:
        job = Job(url=url, telegram_chat_id=chat_id)
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    msg = await update.message.reply_text(
        f"🎬 *Job #{job_id} queued!*\n\n"
        f"URL: `{url}`\n\n"
        "⏳ Downloading video...\n"
        "I'll send you the clips when they're ready.",
        parse_mode="Markdown",
    )

    # Store message id for status updates
    context.application.job_queue.run_once(
        _run_pipeline,
        when=0,
        data={"job_id": job_id, "chat_id": chat_id, "status_msg_id": msg.message_id},
    )


async def _run_pipeline(context: ContextTypes.DEFAULT_TYPE):
    data   = context.job.data
    job_id = data["job_id"]

    from pipeline import process_job
    try:
        await process_job(job_id)
    except Exception as e:
        log.error(f"Pipeline error for job {job_id}: {e}")
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
                text=f"❌ Job #{job_id} failed: {e}",
            )
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# /clips — show recent clips with inline approve buttons
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_clips(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        clips = db.query(Clip).filter(Clip.status == "pending").order_by(
            Clip.viral_score.desc()
        ).limit(10).all()

        if not clips:
            await update.message.reply_text("No pending clips. Paste a YouTube link to get started!")
            return

        for clip in clips:
            title = clip.job.title[:40] if clip.job else "Unknown"
            text  = (
                f"🎬 *Clip #{clip.id}* — {clip.viral_score:.0f}% viral\n"
                f"📹 {title}\n"
                f"⏱ {_fmt_time(clip.start_time)} – {_fmt_time(clip.end_time)} "
                f"({clip.duration:.0f}s)\n"
                f"💬 {clip.caption[:80] if clip.caption else '—'}"
            )
            keyboard = InlineKeyboardMarkup([
                [
                    InlineKeyboardButton("✅ Approve all platforms", callback_data=f"approve_all:{clip.id}"),
                ],
                [
                    InlineKeyboardButton("TikTok",    callback_data=f"post:tiktok:{clip.id}"),
                    InlineKeyboardButton("Instagram",  callback_data=f"post:instagram:{clip.id}"),
                    InlineKeyboardButton("YouTube",    callback_data=f"post:youtube:{clip.id}"),
                ],
                [
                    InlineKeyboardButton("❌ Reject", callback_data=f"reject:{clip.id}"),
                ],
            ])
            await update.message.reply_text(text, reply_markup=keyboard, parse_mode="Markdown")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# /schedule — show upcoming posts
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_schedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        posts = db.query(ScheduledPost).filter(
            ScheduledPost.status == "pending"
        ).order_by(ScheduledPost.scheduled_at.asc()).limit(10).all()

        if not posts:
            await update.message.reply_text("No scheduled posts yet. Use /clips to approve clips for posting.")
            return

        lines = ["📅 *Upcoming Scheduled Posts:*\n"]
        for p in posts:
            dt  = p.scheduled_at.strftime("%b %d %I:%M %p") if p.scheduled_at else "TBD"
            cap = p.caption[:50] if p.caption else "—"
            lines.append(f"• *{p.platform}* @ {dt}\n  {cap}")

        await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# /status — job pipeline status
# ─────────────────────────────────────────────────────────────────────────────

async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    db = SessionLocal()
    try:
        jobs = db.query(Job).order_by(Job.created_at.desc()).limit(5).all()
        if not jobs:
            await update.message.reply_text("No jobs yet. Paste a YouTube link!")
            return

        STATUS_EMOJI = {
            "queued": "⏳", "downloading": "⬇️", "transcribing": "📝",
            "scoring": "🧠", "clipping": "✂️", "done": "✅", "error": "❌",
        }
        lines = ["🔧 *Recent Jobs:*\n"]
        for j in jobs:
            emoji = STATUS_EMOJI.get(j.status, "•")
            title = (j.title or j.url)[:50]
            clips = len(j.clips)
            lines.append(f"{emoji} Job #{j.id}: *{j.status}* — {title}\n   {clips} clips found")

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
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if not clip:
                await query.edit_message_text("Clip not found.")
                return

            msgs = []
            for platform in ["tiktok", "instagram", "youtube"]:
                sched_dt = next_slot(platform)
                post = ScheduledPost(
                    clip_id=clip_id,
                    platform=platform,
                    caption=clip.caption,
                    scheduled_at=sched_dt,
                )
                db.add(post)
                msgs.append(f"• *{platform.capitalize()}*: {sched_dt.strftime('%b %d %I:%M %p')}")

            clip.status = "scheduled"
            db.commit()

            await query.edit_message_text(
                f"✅ *Clip #{clip_id} scheduled on all platforms!*\n\n" + "\n".join(msgs),
                parse_mode="Markdown",
            )

        elif data.startswith("post:"):
            _, platform, clip_id_str = data.split(":")
            clip_id = int(clip_id_str)
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if not clip:
                await query.edit_message_text("Clip not found.")
                return

            sched_dt = next_slot(platform)
            post = ScheduledPost(
                clip_id=clip_id,
                platform=platform,
                caption=clip.caption,
                scheduled_at=sched_dt,
            )
            db.add(post)
            clip.status = "scheduled"
            db.commit()

            await query.edit_message_text(
                f"📅 Clip #{clip_id} → *{platform.capitalize()}*\n"
                f"Scheduled for {sched_dt.strftime('%b %d at %I:%M %p')} UTC",
                parse_mode="Markdown",
            )

        elif data.startswith("reject:"):
            clip_id = int(data.split(":")[1])
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if clip:
                clip.status = "rejected"
                db.commit()
            await query.edit_message_text(f"❌ Clip #{clip_id} rejected.")

    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_time(secs: float) -> str:
    m, s = divmod(int(secs), 60)
    return f"{m}:{s:02d}"


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler: auto-post due clips every minute
# ─────────────────────────────────────────────────────────────────────────────

async def auto_post_job(context: ContextTypes.DEFAULT_TYPE):
    """Called every 60 seconds. Posts any clips whose scheduled_at is due."""
    now = datetime.utcnow()
    db  = SessionLocal()
    try:
        due = db.query(ScheduledPost).filter(
            ScheduledPost.status == "pending",
            ScheduledPost.scheduled_at <= now,
        ).all()

        for post in due:
            clip = post.clip
            if not clip or not clip.file_path or not os.path.exists(clip.file_path):
                post.status = "failed"
                db.commit()
                continue

            try:
                from platforms import post_to_platform
                result = post_to_platform(post.platform, clip.file_path, post.caption)
                post.status   = "posted"
                post.posted_at = now
                post.post_url  = result.get("post_url", "")
                if clip.status != "posted":
                    clip.status = "posted"
                db.commit()
                log.info(f"Posted clip #{clip.id} to {post.platform}: {post.post_url}")

                # Notify owner
                owner = os.getenv("TELEGRAM_OWNER_ID", "")
                if owner:
                    try:
                        await context.bot.send_message(
                            chat_id=owner,
                            text=(
                                f"📤 *Posted!*\n"
                                f"Platform: {post.platform.capitalize()}\n"
                                f"Clip #{clip.id}\n"
                                f"URL: {post.post_url}"
                            ),
                            parse_mode="Markdown",
                        )
                    except Exception:
                        pass

            except Exception as e:
                log.error(f"Auto-post failed for post #{post.id} ({post.platform}): {e}")
                post.status = "failed"
                db.commit()
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN not set in .env")

    from database import init_db
    init_db()

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start",    cmd_start))
    app.add_handler(CommandHandler("help",     cmd_start))
    app.add_handler(CommandHandler("clips",    cmd_clips))
    app.add_handler(CommandHandler("schedule", cmd_schedule))
    app.add_handler(CommandHandler("status",   cmd_status))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(handle_callback))

    # Auto-post scheduler: every 60 seconds
    app.job_queue.run_repeating(auto_post_job, interval=60, first=10)

    log.info("ClipAgent bot is running...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
