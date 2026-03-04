# ClipAgent — AI Clipping Agent

> 24/7 autonomous AI agent that turns long-form YouTube videos into viral short-form clips, adds captions, tracks faces, and auto-posts to TikTok, Instagram, and YouTube.

---

## What It Does

Paste a YouTube link and let the agent handle everything:

1. **AI Viral Detection** — Scores every moment in the video for virality potential using AI analysis
2. **Auto-Clipping** — Extracts the highest-scoring segments (typically 15–60s)
3. **Face Tracking & Crop** — Automatically reframes to 9:16 with smart face tracking
4. **Clean Captions** — Generates and burns accurate captions onto each clip
5. **Multi-Platform Scheduling** — Schedules and posts to TikTok, Instagram Reels, and YouTube Shorts at optimal times
6. **Telegram Control** — Trigger jobs and get status updates directly from Telegram

---

## Dashboard

The React dashboard (`src/`) provides a full control panel with:

| Page | Description |
|---|---|
| **Dashboard** | Submit YouTube links, view live stats (clips generated, views, viral scores) |
| **Clip Queue** | Browse all clips with status, captions, viral scores, and platform assignments |
| **Schedule** | Weekly posting calendar with per-platform on/off controls and auto-schedule settings |
| **Analytics** | Cross-platform performance — views, likes, shares, engagement rate, top clips |
| **Settings** | API keys, Telegram bot config, platform credentials |

---

## Tech Stack

- **Frontend**: React 18 + Bootstrap 4 (dark theme)
- **AI Analysis**: LLM-based viral moment detection
- **Video Processing**: `yt-dlp` (download), `ffmpeg` (clip/crop/captions)
- **Face Tracking**: OpenCV / MediaPipe
- **Captioning**: Whisper ASR → burned-in subtitles
- **Posting**: TikTok API, Instagram Graph API, YouTube Data API v3
- **Orchestration**: Telegram Bot + job queue

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm start
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=
TIKTOK_API_KEY=
INSTAGRAM_ACCESS_TOKEN=
YOUTUBE_API_KEY=
OPENAI_API_KEY=
```

---

## Project Structure

```
src/
  views/
    Dashboard.js     # Main submission + overview
    ClipQueue.js     # Clip processing & management
    Schedule.js      # Posting schedule & platform settings
    Analytics.js     # Performance analytics
    UserProfile.js   # Settings & credentials
  variables/
    charts.js        # Chart data for all dashboards
  components/        # Sidebar, Navbar, Footer, etc.
  routes.js          # Navigation routes
```

---

## License

MIT
