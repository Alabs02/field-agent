"""
Turn raw captures in screenshots/ (ignored by git) into the README's docs/screenshots/ set:
resized to at most 1440 px wide, PNG-optimised, and renamed to the names the README expects.
Run from the repo root: python scripts/gen-screenshots.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "screenshots"
OUT = ROOT / "docs" / "screenshots"
MAX_WIDTH = 1440
MAX_HEIGHT = 2600  # very tall full-page captures are cropped; the README wants a glance, not the whole page

# raw name -> published name. Photo-heavy pages go out as JPEG; UI pages stay PNG for crisp text.
NAMES = {
    "new-lander.png": "lander.jpg",
    "overview.png": "overview.png",
    "promotions.png": "promotions.jpg",
    "runs.png": "runs.png",
    "verification.png": "verification.png",
    "schedules.png": "schedules.png",
    "audit-trail.png": "audit-trail.png",
    "notifications.png": "notifications.png",
    "admin.png": "admin.png",
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for raw, published in NAMES.items():
        src = SRC / raw
        if not src.exists():
            print(f"skip {raw}: not found")
            continue
        im = Image.open(src).convert("RGB")
        w, h = im.size
        if w > MAX_WIDTH:
            im = im.resize((MAX_WIDTH, round(h * MAX_WIDTH / w)), Image.LANCZOS)
        if im.size[1] > MAX_HEIGHT:
            im = im.crop((0, 0, im.size[0], MAX_HEIGHT))
        dest = OUT / published
        if dest.suffix == ".jpg":
            im.save(dest, "JPEG", quality=85, optimize=True, progressive=True)
        else:
            im.save(dest, "PNG", optimize=True)
        print(f"{published}: {w}x{h} -> {im.size[0]}x{im.size[1]}, {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
