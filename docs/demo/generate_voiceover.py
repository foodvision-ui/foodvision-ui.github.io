"""
Strip cue brackets from demo_script.txt and synthesize a voiceover with edge-tts.
Outputs demo_voiceover.mp3 next to this script.
"""
import asyncio
import re
from pathlib import Path

import edge_tts

HERE = Path(__file__).parent
SRC = HERE / "demo_script.txt"
OUT = HERE / "demo_voiceover.mp3"

VOICE = "en-US-AndrewNeural"
RATE = "-5%"


def clean(text: str) -> str:
    # Drop the three-line header
    body = text.split("\n", 3)[-1]
    # Drop any line that is a bracketed cue like "[SCENE ...]" or "[00:05 — ...]"
    kept = []
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped:
            kept.append("")
            continue
        if stripped.startswith("[") and stripped.endswith("]"):
            continue
        kept.append(stripped)
    # Collapse runs of blank lines into a single paragraph break
    collapsed = re.sub(r"\n{2,}", "\n\n", "\n".join(kept)).strip()
    # Re-flow soft-wrapped lines inside a paragraph into single lines
    paragraphs = [" ".join(p.split()) for p in collapsed.split("\n\n")]
    return "\n\n".join(paragraphs)


async def main():
    spoken = clean(SRC.read_text())
    (HERE / "demo_script_spoken.txt").write_text(spoken)
    print(f"Spoken text: {len(spoken.split())} words")
    print(f"Voice: {VOICE}  rate: {RATE}")
    communicate = edge_tts.Communicate(spoken, VOICE, rate=RATE)
    await communicate.save(str(OUT))
    print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
