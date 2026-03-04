"""
Face tracking + 9:16 crop.
Samples frames from a clip, finds average face position, computes crop box,
then uses ffmpeg to produce the final 9:16 cropped video.
"""
import os
import subprocess
import tempfile
from typing import Optional, Tuple

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def detect_face_center(video_path: str, sample_count: int = 15) -> Optional[Tuple[float, float]]:
    """
    Sample `sample_count` frames evenly through the video, detect faces,
    and return the (x_ratio, y_ratio) of the average face center
    relative to the frame width/height. Returns None if no faces found.
    """
    if not CV2_AVAILABLE:
        return None

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if total_frames <= 0 or width <= 0 or height <= 0:
        cap.release()
        return None

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    cx_list, cy_list = [], []
    step = max(1, total_frames // sample_count)

    for i in range(0, total_frames, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            continue

        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
        )
        for (x, y, w, h) in faces:
            cx_list.append((x + w / 2) / width)
            cy_list.append((y + h / 2) / height)

    cap.release()

    if not cx_list:
        return None

    return (float(np.mean(cx_list)), float(np.mean(cy_list)))


def crop_to_916(input_path: str, output_path: str) -> bool:
    """
    Crop `input_path` to 9:16 aspect ratio, centering on detected face.
    Falls back to center crop if no face is found.
    Returns True on success.
    """
    face = detect_face_center(input_path)

    # Get video dimensions via ffprobe
    try:
        probe = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0",
                input_path,
            ],
            capture_output=True, text=True, check=True,
        )
        w_str, h_str = probe.stdout.strip().split(",")
        orig_w, orig_h = int(w_str), int(h_str)
    except Exception:
        return False

    # Target: 9:16
    target_ratio = 9 / 16
    crop_w = int(orig_h * target_ratio)

    if crop_w > orig_w:
        # Video is already narrower than 9:16 — just scale
        vf = f"scale={min(orig_w, 1080)}:-2"
    else:
        # Determine crop x offset from face center (or center of frame)
        cx_ratio = face[0] if face else 0.5
        crop_x = int(cx_ratio * orig_w - crop_w / 2)
        crop_x = max(0, min(crop_x, orig_w - crop_w))
        vf = f"crop={crop_w}:{orig_h}:{crop_x}:0,scale=1080:1920:flags=lanczos"

    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False
