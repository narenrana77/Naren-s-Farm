import zlib
import struct
import math
import os

def create_png(width, height, get_pixel_func):
    """Generates an RGBA PNG using only python standard library (zlib, struct)."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0: None
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend((r, g, b, a))

    compressed = zlib.compress(bytes(raw_data), 9)

    def chunk(chunk_type, data):
        return (
            struct.pack(">I", len(data)) +
            chunk_type +
            data +
            struct.pack(">I", zlib.crc32(chunk_type + data) & 0xffffffff)
        )

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) # 8-bit RGBA
    idat = chunk(b"IDAT", compressed)
    iend = chunk(b"IEND", b"")

    return header + ihdr + idat + iend

def farm_icon_pixel(x, y, w, h, is_maskable=False):
    # Normalized coordinates (-1 to 1)
    nx = (x / w) * 2.0 - 1.0
    ny = (y / h) * 2.0 - 1.0
    dist_sq = nx * nx + ny * ny

    # Base gradient: Emerald Deep Green
    # Top: #047857 (4, 120, 87) -> Bottom: #064e3b (6, 78, 59)
    grad_factor = (y / h)
    bg_r = int(6 * grad_factor + 4 * (1 - grad_factor))
    bg_g = int(88 * grad_factor + 128 * (1 - grad_factor))
    bg_b = int(68 * grad_factor + 92 * (1 - grad_factor))

    # Corner radius for standard icon (squircle: |nx|^3 + |ny|^3 <= 1)
    if not is_maskable:
        squircle_val = (abs(nx) ** 3.4) + (abs(ny) ** 3.4)
        if squircle_val > 0.95:
            # Outside squircle -> transparent
            return (0, 0, 0, 0)
        elif squircle_val > 0.88:
            # Antialiased soft edge border
            alpha = int(255 * (0.95 - squircle_val) / 0.07)
            # Gold border accent
            return (52, 211, 153, max(0, min(255, alpha)))

    # Emblem Center: Gold Sun & Wheat Sheaf & Tractor
    scale = 0.8 if is_maskable else 1.0
    enx = nx / scale
    eny = ny / scale
    edist = math.sqrt(enx * enx + eny * eny)

    # 1. Subtle glowing sun circle in upper center
    sun_dist = math.sqrt(enx * enx + (eny + 0.15) * (eny + 0.15))
    if sun_dist < 0.65:
        glow = (1.0 - sun_dist / 0.65) * 0.35
        bg_r = int(bg_r * (1 - glow) + 254 * glow)
        bg_g = int(bg_g * (1 - glow) + 240 * glow)
        bg_b = int(bg_b * (1 - glow) + 138 * glow)

    # 2. Field furrows at bottom (eny between 0.3 and 0.7)
    if 0.35 < eny < 0.7 and abs(enx) < 0.8:
        furrow_wave = math.sin(enx * 4.0) * 0.04
        if eny > 0.42 + furrow_wave:
            # Soil furrow
            bg_r = int(bg_r * 0.4 + 180 * 0.6)
            bg_g = int(bg_g * 0.4 + 83 * 0.6)
            bg_b = int(bg_b * 0.4 + 9 * 0.6)

    # 3. Tractor Big Wheel (Rear): around enx=-0.22, eny=0.32, radius=0.22
    tw_dist = math.sqrt((enx + 0.22)**2 + (eny - 0.32)**2)
    if tw_dist < 0.22:
        if tw_dist > 0.17:
            # Tire rim tread
            return (30, 41, 59, 255)
        elif tw_dist > 0.14:
            # White rim edge
            return (241, 245, 249, 255)
        elif tw_dist > 0.07:
            # Inner wheel
            return (51, 65, 85, 255)
        else:
            # Gold hub
            return (251, 191, 36, 255)

    # 4. Tractor Small Wheel (Front): around enx=0.32, eny=0.38, radius=0.14
    sw_dist = math.sqrt((enx - 0.32)**2 + (eny - 0.38)**2)
    if sw_dist < 0.14:
        if sw_dist > 0.10:
            return (30, 41, 59, 255)
        elif sw_dist > 0.08:
            return (241, 245, 249, 255)
        elif sw_dist > 0.04:
            return (51, 65, 85, 255)
        else:
            return (251, 191, 36, 255)

    # 5. Tractor Hood (Gold Body): -0.08 <= enx <= 0.42 and 0.22 <= eny <= 0.38
    if -0.06 <= enx <= 0.42 and 0.22 <= eny <= 0.38:
        return (245, 158, 11, 255)

    # 6. Cabin Glass & Roof: -0.32 <= enx <= -0.02 and -0.04 <= eny <= 0.22
    if -0.32 <= enx <= -0.02 and -0.04 <= eny <= 0.22:
        if eny < 0.01:
            # White Roof
            return (255, 255, 255, 255)
        elif abs(enx + 0.17) > 0.12 or abs(eny - 0.10) > 0.09:
            # Cabin Frame
            return (241, 245, 249, 255)
        else:
            # Blue tinted Glass
            return (56, 189, 248, 240)

    # 7. Exhaust Stack: enx=0.28, -0.04 <= eny <= 0.22
    if 0.26 <= enx <= 0.30 and -0.02 <= eny <= 0.22:
        return (100, 116, 139, 255)

    # 8. Golden Wheat Sheaf on Top-Right (enx between 0.05 and 0.55, eny between -0.65 and -0.05)
    for stem_x, stem_y, angle in [(0.25, -0.35, 0.4), (0.12, -0.42, 0.1), (-0.02, -0.38, -0.3)]:
        dx = enx - stem_x
        dy = eny - stem_y
        dist = math.sqrt(dx*dx + dy*dy)
        if dist < 0.28:
            # Leaflets along the stalk
            sub_y = dy * 4.0
            sub_x = (dx - math.sin(dy * 5.0) * 0.05) * 4.0
            if abs(sub_x) < (0.35 - abs(sub_y) * 0.2) and abs(sub_y) < 1.0:
                return (251, 191, 36, 255)

    return (bg_r, bg_g, bg_b, 255)

os.makedirs("public", exist_ok=True)

# 1. Standard 192x192
print("Generating pwa-192x192.png...")
png_192 = create_png(192, 192, lambda x, y, w, h: farm_icon_pixel(x, y, w, h, False))
with open("public/pwa-192x192.png", "wb") as f:
    f.write(png_192)

# 2. Standard 512x512
print("Generating pwa-512x512.png...")
png_512 = create_png(512, 512, lambda x, y, w, h: farm_icon_pixel(x, y, w, h, False))
with open("public/pwa-512x512.png", "wb") as f:
    f.write(png_512)

# 3. Maskable 512x512
print("Generating pwa-maskable-512x512.png...")
png_mask = create_png(512, 512, lambda x, y, w, h: farm_icon_pixel(x, y, w, h, True))
with open("public/pwa-maskable-512x512.png", "wb") as f:
    f.write(png_mask)

# 4. Apple Touch Icon 180x180
print("Generating apple-touch-icon.png...")
png_apple = create_png(180, 180, lambda x, y, w, h: farm_icon_pixel(x, y, w, h, False))
with open("public/apple-touch-icon.png", "wb") as f:
    f.write(png_apple)

# 5. Favicon 48x48
print("Generating favicon.ico (PNG format)...")
png_fav = create_png(48, 48, lambda x, y, w, h: farm_icon_pixel(x, y, w, h, False))
with open("public/favicon.ico", "wb") as f:
    f.write(png_fav)

print("All PWA PNG icons successfully generated!")
