"""사용: python tools/make_icons.py icons   (약 1분 소요)
favicon.svg 와 같은 눈꽃 도형을 표준 라이브러리만으로 PNG/ICO 렌더링 (4x4 슈퍼샘플링 AA)."""
import math, struct, sys, zlib, os

OUT = sys.argv[1]

def rot(p, deg):
    a = math.radians(deg); x, y = p[0] - 32, p[1] - 32
    return (32 + x * math.cos(a) - y * math.sin(a), 32 + x * math.sin(a) + y * math.cos(a))

ARM = [((32, 32), (32, 10)),
       ((32, 21.5), (25.5, 15)), ((32, 21.5), (38.5, 15)),
       ((32, 14), (28.5, 10.5)), ((32, 14), (35.5, 10.5))]

def segments(simple):
    arm = ARM[:3] if simple else ARM  # 16px 에서는 끝 가지 생략 (뭉개짐 방지)
    return [(rot(a, k * 60), rot(b, k * 60)) for k in range(6) for a, b in arm]

def dseg(px, py, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def in_rrect(x, y, r):
    if r == 0: return 0 <= x <= 64 and 0 <= y <= 64
    cx = min(max(x, r), 64 - r); cy = min(max(y, r), 64 - r)
    return math.hypot(x - cx, y - cy) <= r

C0, C1 = (0x1f, 0x5f, 0xd1), (0x4a, 0x9b, 0xff)

def render(size, rounded=True, simple=False, stroke=3.6):
    segs = segments(simple); half = stroke / 2; ss = 4; rr = 14 if rounded else 0
    rows = []
    for j in range(size):
        row = bytearray([0])
        for i in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sj in range(ss):
                for si in range(ss):
                    x = (i + (si + .5) / ss) * 64 / size; y = (j + (sj + .5) / ss) * 64 / size
                    if not in_rrect(x, y, rr): continue
                    white = math.hypot(x - 32, y - 32) <= 3.4 or any(dseg(x, y, a, b) <= half for a, b in segs)
                    if white: c = (255, 255, 255)
                    else:
                        t = (x + y) / 128; c = tuple(C0[k] + (C1[k] - C0[k]) * t for k in range(3))
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += 1
            n = ss * ss
            if acc[3]: row += bytes([round(acc[0] / acc[3]), round(acc[1] / acc[3]), round(acc[2] / acc[3]), round(255 * acc[3] / n)])
            else: row += bytes(4)
        rows.append(bytes(row))
    raw = b''.join(rows)
    def chunk(tag, data): return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

def write(name, data):
    with open(os.path.join(OUT, name), 'wb') as f: f.write(data)
    print(name, len(data), 'bytes')

# iOS 홈 화면: 모서리는 OS가 깎으므로 꽉 찬 사각형
write('apple-touch-icon.png', render(180, rounded=False))
write('icon-192.png', render(192))
write('icon-512.png', render(512))

# ICO (PNG 내장 방식): 16 / 32 / 48
imgs = [(16, render(16, simple=True, stroke=4.6)), (32, render(32, stroke=4.0)), (48, render(48))]
head = struct.pack('<HHH', 0, 1, len(imgs)); off = 6 + 16 * len(imgs); dirs = b''; body = b''
for s, png in imgs:
    dirs += struct.pack('<BBBBHHII', s % 256, s % 256, 0, 0, 1, 32, len(png), off + len(body)); body += png
write('favicon.ico', head + dirs + body)

