"""
Platform posting handlers.
Each post() function returns {"ok": True, "post_url": "..."} or raises an exception.
"""
import os
import logging

log = logging.getLogger("platforms")


# ─────────────────────────────────────────────────────────────────────────────
# TikTok
# ─────────────────────────────────────────────────────────────────────────────

def post_tiktok(video_path: str, caption: str) -> dict:
    """
    Upload a video to TikTok via the Content Posting API.
    Requires TIKTOK_ACCESS_TOKEN in .env (approved TikTok developer app).
    Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
    """
    token = os.getenv("TIKTOK_ACCESS_TOKEN", "")
    if not token:
        raise ValueError("TIKTOK_ACCESS_TOKEN not set in .env")

    import requests

    # Step 1: Init upload
    init_resp = requests.post(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8"},
        json={
            "post_info": {
                "title": caption[:150],
                "privacy_level": "PUBLIC_TO_EVERYONE",
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
            },
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": os.path.getsize(video_path),
                "chunk_size": os.path.getsize(video_path),
                "total_chunk_count": 1,
            },
        },
        timeout=30,
    )
    init_resp.raise_for_status()
    init_data = init_resp.json()
    publish_id   = init_data["data"]["publish_id"]
    upload_url   = init_data["data"]["upload_url"]

    # Step 2: Upload file
    with open(video_path, "rb") as f:
        upload_resp = requests.put(
            upload_url,
            headers={
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes 0-{os.path.getsize(video_path)-1}/{os.path.getsize(video_path)}",
            },
            data=f,
            timeout=120,
        )
    upload_resp.raise_for_status()

    log.info(f"TikTok publish_id: {publish_id}")
    return {"ok": True, "post_url": f"https://www.tiktok.com/@me/video/{publish_id}"}


# ─────────────────────────────────────────────────────────────────────────────
# Instagram (Reels via Meta Graph API)
# ─────────────────────────────────────────────────────────────────────────────

def post_instagram(video_path: str, caption: str, public_video_url: str = "") -> dict:
    """
    Post a Reel to Instagram via the Meta Graph API.
    Requires INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in .env.
    The video must be accessible via a public URL (serve from your own host or use upload flow).
    Docs: https://developers.facebook.com/docs/instagram-api/guides/reels
    """
    token   = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
    user_id = os.getenv("INSTAGRAM_USER_ID", "")
    if not token or not user_id:
        raise ValueError("INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID must be set in .env")
    if not public_video_url:
        raise ValueError("Instagram requires a public video URL. Host the file and pass public_video_url.")

    import requests

    base = f"https://graph.facebook.com/v19.0/{user_id}"

    # Step 1: Create media container
    create = requests.post(
        f"{base}/media",
        params={
            "media_type":  "REELS",
            "video_url":   public_video_url,
            "caption":     caption,
            "access_token": token,
        },
        timeout=30,
    )
    create.raise_for_status()
    container_id = create.json()["id"]

    # Step 2: Wait for processing (poll status)
    import time
    for _ in range(20):
        time.sleep(5)
        status = requests.get(
            f"https://graph.facebook.com/v19.0/{container_id}",
            params={"fields": "status_code", "access_token": token},
            timeout=10,
        ).json()
        if status.get("status_code") == "FINISHED":
            break

    # Step 3: Publish
    publish = requests.post(
        f"{base}/media_publish",
        params={"creation_id": container_id, "access_token": token},
        timeout=30,
    )
    publish.raise_for_status()
    media_id = publish.json()["id"]

    return {"ok": True, "post_url": f"https://www.instagram.com/p/{media_id}/"}


# ─────────────────────────────────────────────────────────────────────────────
# YouTube Shorts (via YouTube Data API v3)
# ─────────────────────────────────────────────────────────────────────────────

def post_youtube(video_path: str, title: str, description: str = "") -> dict:
    """
    Upload a video to YouTube Shorts via the YouTube Data API v3.
    Requires OAuth2 credentials. Run `python platforms.py --auth` once to authorize.
    Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
    """
    secrets_file = os.getenv("YOUTUBE_CLIENT_SECRETS_FILE", "client_secrets.json")
    token_file   = os.path.join(os.path.dirname(__file__), "youtube_token.json")

    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        import json

        SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
        creds = None

        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(secrets_file, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_file, "w") as f:
                f.write(creds.to_json())

        youtube = build("youtube", "v3", credentials=creds)

        body = {
            "snippet": {
                "title":       title[:100],
                "description": description or title,
                "tags":        ["shorts", "football", "viral", "clips"],
                "categoryId":  "17",   # Sports
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)
        request = youtube.videos().insert(
            part=",".join(body.keys()),
            body=body,
            media_body=media,
        )
        response = None
        while response is None:
            _, response = request.next_chunk()

        video_id = response["id"]
        return {"ok": True, "post_url": f"https://www.youtube.com/shorts/{video_id}"}

    except ImportError:
        raise ImportError("Install google-api-python-client and google-auth-oauthlib")


# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def post_to_platform(platform: str, video_path: str, caption: str, **kwargs) -> dict:
    platform = platform.lower()
    if platform == "tiktok":
        return post_tiktok(video_path, caption)
    elif platform == "instagram":
        return post_instagram(video_path, caption, kwargs.get("public_video_url", ""))
    elif platform == "youtube":
        return post_youtube(video_path, caption, kwargs.get("description", ""))
    else:
        raise ValueError(f"Unknown platform: {platform}")


# ─────────────────────────────────────────────────────────────────────────────
# CLI helper: python platforms.py --auth  →  authorize YouTube OAuth
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if "--auth" in sys.argv:
        print("Opening browser for YouTube OAuth authorization...")
        post_youtube.__wrapped__ if hasattr(post_youtube, "__wrapped__") else None
        # Trigger the auth flow by attempting an upload with a dummy path
        try:
            post_youtube("/dev/null", "auth-test")
        except Exception as e:
            print(f"Auth result: {e}")
