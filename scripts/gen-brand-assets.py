"""
Generate the Engagement Agents wordmark variants used by the root docs.

    python scripts/gen-brand-assets.py

Source: apps/web/public/ea/logo.png (dark ink on a transparent background).
Output: docs/brand/ea-logo-light.png  unchanged copy, for GitHub's light theme
        docs/brand/ea-logo-dark.png   RGB inverted, alpha kept, for the dark theme
                                       (the same transform the site applies with `dark:invert`)
Idempotent: running it twice produces identical bytes.
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "apps" / "web" / "public" / "ea" / "logo.png"
OUT = ROOT / "docs" / "brand"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img = Image.open(SRC).convert("RGBA")
    r, g, b, a = img.split()
    inverted = ImageOps.invert(Image.merge("RGB", (r, g, b)))
    dark = Image.merge("RGBA", (*inverted.split(), a))
    light_path = OUT / "ea-logo-light.png"
    dark_path = OUT / "ea-logo-dark.png"
    img.save(light_path, optimize=True)
    dark.save(dark_path, optimize=True)
    for p in (light_path, dark_path):
        print(f"{p.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
