"""임시 앱 아이콘 생성 (외부 라이브러리 없이 PNG 작성)

로즈 배경에 겹친 반지 두 개. 원하는 이미지가 생기면 public/icons/ 의 파일만 같은 이름으로 바꾸면 됩니다.
실행: python3 scripts/make-icons.py
"""
import math
import os
import struct
import zlib

BG = (212, 83, 126)
FG = (255, 255, 255)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')

# (중심 x, 중심 y, 반지름) — 이미지 크기에 대한 비율. maskable 안전 영역(가운데 80%) 안에 들어감
RINGS = [(0.41, 0.52, 0.17), (0.59, 0.48, 0.17)]
THICKNESS = 0.042
SAMPLES = 3


def coverage(px, py, size):
    hit = 0
    for sy in range(SAMPLES):
        for sx in range(SAMPLES):
            x = (px + (sx + 0.5) / SAMPLES) / size
            y = (py + (sy + 0.5) / SAMPLES) / size
            if any(abs(math.hypot(x - cx, y - cy) - r) <= THICKNESS / 2 for cx, cy, r in RINGS):
                hit += 1
    return hit / (SAMPLES * SAMPLES)


def write_png(path, size):
    rows = bytearray()
    for py in range(size):
        rows.append(0)
        for px in range(size):
            a = coverage(px, py, size)
            rows.extend(round(BG[i] + (FG[i] - BG[i]) * a) for i in range(3))

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(rows), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, size in [('192.png', 192), ('512.png', 512), ('maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
        write_png(os.path.join(OUT, name), size)
        print('wrote', name)
