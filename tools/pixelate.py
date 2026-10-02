"""
pixelate.py: перетворює картинки на піксельну сітку з обмеженою палітрою.

Запуск у VS Code:
  1) Поклади картинки в папку  foto/  поруч зі скриптом.
  2) Задай SIZE і COLORS нижче й натисни ▶ (Run Python File).
  або з терміналу:
     python pixelate.py foto/apple.png --size 16 --colors 5
     python pixelate.py foto --size 20 --colors 6 --clean

Результат (папка output/):
  <ім'я>_<розмір>_<кольори>.png   прев'ю, щоб побачити, що вийшло
  <ім'я>_<розмір>_<кольори>.json  дані рівня: палітра + сітка (-1 = порожньо)

Встановлення (один раз):  pip install pillow numpy
"""
import argparse
import json
import sys
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image

# ---------- НАЛАШТУВАННЯ ЗА ЗАМОВЧУВАННЯМ (для кнопки Run) ----------
INPUT = "foto"        # файл або папка з картинками (відносно папки зі скриптом)
SIZE = 16             # довша сторона сітки в пікселях
COLORS = 5            # кількість кольорів у палітрі
CLEAN = True          # прибрати поодинокі «шумні» пікселі
TOLERANCE = 40        # наскільки колір може відрізнятися від фону, щоб вважатись фоном
PREVIEW_CELL = 24     # розмір одного пікселя на прев'ю (px)
# ---------------------------------------------------------------------

EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
WORK = 256  # робочий розмір для визначення фону (швидше)


def remove_background(img: Image.Image, tol: int) -> np.ndarray:
    """Повертає маску переднього плану (True = об'єкт) для зображення WORK-розміру."""
    arr = np.array(img)  # RGBA
    alpha = arr[:, :, 3]
    if alpha.min() < 250:  # є прозорість, використовуємо її
        return alpha > 128
    rgb = arr[:, :, :3].astype(int)
    h, w = rgb.shape[:2]
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    bg = np.median(corners, axis=0)
    similar = np.abs(rgb - bg).sum(axis=2) <= tol * 3 // 2 + 10
    # фон = подібні до нього пікселі, з'єднані з краєм картинки (заливка від країв)
    bgmask = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if similar[y, x] and not bgmask[y, x]:
                bgmask[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if similar[y, x] and not bgmask[y, x]:
                bgmask[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and similar[ny, nx] and not bgmask[ny, nx]:
                bgmask[ny, nx] = True; q.append((ny, nx))
    return ~bgmask


def clean_noise(grid: np.ndarray) -> np.ndarray:
    """Поодинокий піксель без сусідів свого кольору отримує колір більшості сусідів."""
    h, w = grid.shape
    out = grid.copy()
    for y in range(h):
        for x in range(w):
            c = grid[y, x]
            if c < 0:
                continue
            nb = [grid[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if 0 <= y + dy < h and 0 <= x + dx < w and grid[y + dy, x + dx] >= 0]
            if nb and c not in nb:
                out[y, x] = Counter(nb).most_common(1)[0][0]
    return out


def kmeans(pts: np.ndarray, k: int, iters: int = 12):
    """Підбір палітри: старт із максимально різних кольорів, щоб малі деталі не губились."""
    uniq = np.unique(pts.round(), axis=0)
    k = min(k, len(uniq))
    centers = [pts.mean(axis=0)]
    while len(centers) < k:
        d = np.min([((uniq - c) ** 2).sum(axis=1) for c in centers], axis=0)
        centers.append(uniq[d.argmax()])
    centers = np.array(centers)
    for _ in range(iters):
        d = ((pts[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        for i in range(k):
            if (lab == i).any():
                centers[i] = pts[lab == i].mean(axis=0)
    d = ((pts[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    return d.argmin(axis=1), centers.round()


def pixelate(path: Path, size: int, colors: int, clean: bool, tol: int, outdir: Path):
    img = Image.open(path).convert("RGBA")
    img.thumbnail((WORK, WORK), Image.LANCZOS)
    mask = remove_background(img, tol)
    if not mask.any():
        print(f"  ! {path.name}: не знайшла об'єкт (спробуй більший --tolerance)")
        return

    # обрізаємо по об'єкту, щоб він займав усю сітку
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb = np.array(img)[y0:y1, x0:x1, :3]
    mask = mask[y0:y1, x0:x1]
    h, w = mask.shape

    # розмір сітки зі збереженням пропорцій
    if w >= h:
        gw, gh = size, max(1, round(size * h / w))
    else:
        gw, gh = max(1, round(size * w / h)), size

    # фон заповнюємо середнім кольором об'єкта, щоб краї не світлішали
    filled = rgb.copy()
    filled[~mask] = rgb[mask].mean(axis=0).astype(np.uint8)
    small = np.array(Image.fromarray(filled).resize((gw, gh), Image.BOX))
    small_mask = np.array(Image.fromarray((mask * 255).astype(np.uint8)).resize((gw, gh), Image.BOX)) > 127

    # зводимо кольори до палітри з N кольорів (тільки по пікселях об'єкта)
    fg = small[small_mask].astype(float)
    ids, centers = kmeans(fg, colors)
    palette = [c for c in centers]
    # прибираємо невикористані кольори палітри
    used = sorted(set(ids.tolist()))
    remap = {old: new for new, old in enumerate(used)}
    palette = [centers[i] for i in used]

    grid = np.full((gh, gw), -1, dtype=int)
    grid[small_mask] = [remap[i] for i in ids]
    if clean:
        grid = clean_noise(grid)

    # збереження
    outdir.mkdir(exist_ok=True)
    stem = f"{path.stem}_{gw}x{gh}_{len(palette)}c"
    hexes = ["#%02X%02X%02X" % tuple(int(v) for v in c) for c in palette]
    with open(outdir / f"{stem}.json", "w", encoding="utf-8") as f:
        json.dump({"w": gw, "h": gh, "palette": hexes, "pixels": grid.tolist()}, f)

    cell = PREVIEW_CELL
    prev = Image.new("RGBA", (gw * cell, gh * cell), (0, 0, 0, 0))
    for y in range(gh):
        for x in range(gw):
            if grid[y, x] >= 0:
                c = tuple(int(v) for v in palette[grid[y, x]]) + (255,)
                prev.paste(Image.new("RGBA", (cell - 1, cell - 1), c), (x * cell, y * cell))
    prev.save(outdir / f"{stem}.png")

    counts = Counter(grid[grid >= 0].tolist())
    print(f"  ✓ {path.name} -> {gw}x{gh}, {len(palette)} кольорів, {sum(counts.values())} пікселів")
    print("    пікселів по кольорах:", {hexes[k]: v for k, v in sorted(counts.items())})


def main():
    ap = argparse.ArgumentParser(description="Картинка -> піксельний рівень")
    ap.add_argument("input", nargs="?", default=INPUT, help="файл або папка")
    ap.add_argument("--size", type=int, default=SIZE, help="довша сторона сітки")
    ap.add_argument("--colors", type=int, default=COLORS, help="кількість кольорів")
    ap.add_argument("--clean", action="store_true", default=CLEAN, help="прибрати шум")
    ap.add_argument("--no-clean", dest="clean", action="store_false")
    ap.add_argument("--tolerance", type=int, default=TOLERANCE, help="допуск для фону")
    ap.add_argument("--out", default="output", help="папка результату")
    a = ap.parse_args()

    base = Path(__file__).resolve().parent  # шляхи рахуємо від кореня проєкту, а не від терміналу
    if base.name == 'tools':
        base = base.parent
    p = Path(a.input)
    if not p.is_absolute():
        p = base / p
    out = Path(a.out)
    if not out.is_absolute():
        out = base / out
    files = [p] if p.is_file() else sorted(f for f in p.glob("*") if f.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"Не знайшла картинок у '{p}'. Поклади їх у папку foto/ поруч зі скриптом.")
    print(f"Розмір {a.size}, кольорів {a.colors}, картинок: {len(files)}")
    for f in files:
        pixelate(f, a.size, a.colors, a.clean, a.tolerance, out)


if __name__ == "__main__":
    main()
