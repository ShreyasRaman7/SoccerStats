"""
Viral moment scorer.
Scores transcript segments 0-100 using keyword heuristics + optional OpenAI boost.
"""
import os
import re
from typing import List, Dict

HYPE_WORDS = {
    # Goals / highlights
    "goal": 12, "golazo": 15, "banger": 12, "screamer": 15, "worldie": 15,
    "volley": 10, "header": 8, "free kick": 10, "penalty": 8,
    # Skill
    "skill": 8, "dribble": 8, "elastico": 12, "nutmeg": 14, "rainbow": 12,
    "step over": 10, "feint": 8, "trick": 8, "tekkers": 10,
    # Reactions
    "insane": 14, "incredible": 12, "unbelievable": 15, "ridiculous": 13,
    "insanity": 14, "crazy": 10, "mad": 8, "wow": 8, "omg": 10, "oh my": 10,
    "no way": 12, "what": 6, "how": 4,
    # Save / defensive
    "save": 8, "block": 6, "tackle": 6, "clearance": 5,
    # General hype
    "viral": 10, "fire": 8, "heat": 6, "elite": 8, "goat": 12, "legend": 10,
    "king": 8, "perfect": 8, "clean": 6, "smooth": 6,
    # Crowd
    "crowd": 4, "fans": 4, "stadium": 4,
    # Numbers / achievements
    "100": 5, "hat trick": 15, "champions": 10, "final": 8, "winner": 10,
}

PENALTY_WORDS = {
    "advertisement": -20, "sponsor": -15, "subscribe": -10,
    "like and": -8, "follow": -5, "channel": -5, "intro": -10,
    "outro": -10, "playlist": -8,
}


def score_segment(text: str, duration: float) -> float:
    """
    Score a transcript segment for virality (0-100).
    """
    text_lower = text.lower()
    score = 40.0   # base

    # Keyword scoring
    for word, pts in HYPE_WORDS.items():
        if word in text_lower:
            score += pts

    for word, pts in PENALTY_WORDS.items():
        if word in text_lower:
            score += pts   # pts are negative

    # Duration bonus: sweet spot is 20-45 seconds
    if 15 <= duration <= 60:
        score += 10
    if 20 <= duration <= 45:
        score += 5

    # Exclamation marks signal hype
    exclamations = text.count("!") + text.count("?")
    score += min(exclamations * 2, 10)

    # ALL CAPS words signal hype
    caps_words = len(re.findall(r'\b[A-Z]{3,}\b', text))
    score += min(caps_words * 3, 12)

    return max(0.0, min(100.0, score))


def score_transcript(segments: List[Dict]) -> List[Dict]:
    """
    Score all transcript segments and return them sorted by score descending.
    Each segment: {start, end, text}
    Returns: same list but with 'viral_score' added.
    """
    for seg in segments:
        duration = seg["end"] - seg["start"]
        seg["viral_score"] = score_segment(seg["text"], duration)

    return sorted(segments, key=lambda s: s["viral_score"], reverse=True)


def merge_nearby_segments(segments: List[Dict], gap: float = 2.0, max_duration: float = 60.0) -> List[Dict]:
    """
    Merge adjacent high-score segments that are within `gap` seconds of each other
    to form complete clip candidates.
    """
    if not segments:
        return []

    # Sort by start time for merging
    sorted_segs = sorted(segments, key=lambda s: s["start"])
    merged = []
    current = dict(sorted_segs[0])

    for seg in sorted_segs[1:]:
        if seg["start"] - current["end"] <= gap and (seg["end"] - current["start"]) <= max_duration:
            current["end"] = seg["end"]
            current["text"] = current["text"] + " " + seg["text"]
            current["viral_score"] = max(current["viral_score"], seg["viral_score"])
        else:
            merged.append(current)
            current = dict(seg)

    merged.append(current)
    return merged


def pick_best_clips(
    segments: List[Dict],
    min_score: float = 70.0,
    max_clips: int = 8,
    min_duration: float = 10.0,
    max_duration: float = 60.0,
    padding: float = 1.5,
) -> List[Dict]:
    """
    Select the best clip candidates from scored segments.
    Adds padding around each clip and returns the top N.
    """
    # Merge nearby segments into clip candidates
    scored = score_transcript(segments)
    candidates = merge_nearby_segments(scored, gap=2.0, max_duration=max_duration)

    # Filter by score and duration
    valid = []
    for c in candidates:
        dur = c["end"] - c["start"]
        if c["viral_score"] >= min_score and min_duration <= dur <= max_duration:
            c["start"] = max(0, c["start"] - padding)
            c["end"]   = c["end"] + padding
            c["duration"] = c["end"] - c["start"]
            valid.append(c)

    # Sort by score and return top N
    valid.sort(key=lambda x: x["viral_score"], reverse=True)
    return valid[:max_clips]


def generate_caption(text: str, platform: str = "tiktok") -> str:
    """
    Generate a short engaging caption from clip transcript text.
    Tries OpenAI if key is available, falls back to truncated transcript.
    """
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            prompt = (
                f"Create a short, punchy social media caption (max 100 chars) for a {platform} video clip. "
                f"Add 3 relevant hashtags. The clip transcript is:\n\n{text[:500]}\n\n"
                "Caption only, no explanation:"
            )
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=120,
            )
            return resp.choices[0].message.content.strip()
        except Exception:
            pass

    # Fallback: clean up transcript text
    clean = re.sub(r'\s+', ' ', text).strip()
    caption = clean[:80] + ("..." if len(clean) > 80 else "")
    return caption + " #football #viral #clips"
