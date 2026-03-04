#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ClipAgent — start everything
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

# 1. Check .env
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Copying .env.example → .env"
  cp .env.example .env
  echo "📝 Edit backend/.env and add your TELEGRAM_BOT_TOKEN, then re-run this script."
  exit 1
fi

# 2. Check Python deps
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "📦 Installing Python dependencies..."
  pip3 install -r requirements.txt
fi

# 3. Check system deps
for cmd in ffmpeg yt-dlp; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ '$cmd' not found. Install it first:"
    echo "   Ubuntu/Debian: sudo apt install ffmpeg && pip install yt-dlp"
    echo "   Mac:           brew install ffmpeg && pip install yt-dlp"
    exit 1
  fi
done

echo ""
echo "╔════════════════════════════════════════╗"
echo "║       ClipAgent Starting Up           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 4. Start FastAPI backend in background
echo "🚀 Starting FastAPI server on :8000..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
echo "   API PID: $API_PID"

sleep 2

# 5. Start Telegram bot
echo "🤖 Starting Telegram bot..."
python3 bot.py &
BOT_PID=$!
echo "   Bot PID: $BOT_PID"

echo ""
echo "✅ ClipAgent is running!"
echo "   Dashboard API : http://localhost:8000"
echo "   Telegram Bot  : polling (send a YouTube link to test)"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Wait and clean up on exit
trap "echo ''; echo 'Stopping...'; kill $API_PID $BOT_PID 2>/dev/null; exit 0" INT TERM
wait
