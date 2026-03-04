"""
Burns clean captions onto a video clip using Whisper + ffmpeg subtitle filter.
"""
import os
import subprocess
import tempfile
from typing import List, Dict


def format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def segments_to_srt(segments: List[Dict], video_start: float = 0.0) -> str:
    """
    Convert whisper segments (adjusted relative to clip start) to SRT format.
    """
    lines = []
    for i, seg in enumerate(segments, 1):
        start = max(0.0, seg["start"] - video_start)
        end   = max(0.0, seg["end"]   - video_start)
        text  = seg["text"].strip()
        if not text:
            continue
        lines.append(f"{i}")
        lines.append(f"{format_srt_time(start)} --> {format_srt_time(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def burn_captions(
    input_path: str,
    output_path: str,
    segments: List[Dict],
    clip_start: float = 0.0,
) -> bool:
    """
    Burns styled captions onto `input_path`, writes to `output_path`.
    Returns True on success.
    """
    if not segments:
        # No transcript — just copy
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, "-c", "copy", output_path],
                check=True, capture_output=True,
            )
            return True
        except subprocess.CalledProcessError:
            return False

    srt_content = segments_to_srt(segments, video_start=clip_start)

    # Write SRT to temp file next to input
    srt_path = input_path.replace(".mp4", ".srt")
    try:
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # Caption style: white bold text, black outline, bottom-center
        style = (
            "FontName=Arial,"
            "FontSize=14,"
            "PrimaryColour=&H00FFFFFF,"
            "OutlineColour=&H00000000,"
            "BackColour=&H80000000,"
            "Bold=1,"
            "Outline=2,"
            "Shadow=1,"
            "Alignment=2,"         # bottom-center
            "MarginV=30"
        )

        # Escape path for ffmpeg filter
        escaped = srt_path.replace("\\", "/").replace(":", "\\:")

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-vf", f"subtitles={escaped}:force_style='{style}'",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
        return True
    except (subprocess.CalledProcessError, OSError):
        return False
    finally:
        if os.path.exists(srt_path):
            os.remove(srt_path)


def transcribe_audio(audio_path: str, model_size: str = "base") -> List[Dict]:
    """
    Transcribe audio using faster-whisper.
    Returns list of {start, end, text} dicts.
    """
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, _ = model.transcribe(audio_path, beam_size=5)
        return [
            {"start": seg.start, "end": seg.end, "text": seg.text}
            for seg in segments
        ]
    except ImportError:
        # Fall back to openai-whisper if faster-whisper not installed
        try:
            import whisper
            model = whisper.load_model(model_size)
            result = model.transcribe(audio_path)
            return [
                {"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in result["segments"]
            ]
        except ImportError:
            return []
