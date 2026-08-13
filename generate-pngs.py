#!/usr/bin/env python3
"""Generate PNG icons for iOS from the SVG design using Pillow."""
from PIL import Image, ImageDraw
import os

def generate_icon(size):
    """Generate a space shooter icon at the given size."""
    img = Image.new('RGBA', (size, size), (10, 10, 42, 255))  # #0a0a2a background
    draw = ImageDraw.Draw(img)
    
    # Scale factor (SVG viewBox is 100x100)
    s = size / 100.0
    
    # Circle outline (cx=50, cy=50, r=45, stroke=#0ff, opacity=0.3)
    circle_color = (0, 255, 255, int(255 * 0.3))
    stroke_w = max(1, int(2 * s))
    # Draw circle as ellipse outline
    bbox = (int((50-45)*s), int((50-45)*s), int((50+45)*s), int((50+45)*s))
    draw.ellipse(bbox, outline=circle_color, width=stroke_w)
    
    # Spaceship polygon: points="50,15 35,70 42,60 50,72 58,60 65,70"
    # Color: #0ff (0, 255, 255)
    ship_points = [
        (50*s, 15*s),
        (35*s, 70*s),
        (42*s, 60*s),
        (50*s, 72*s),
        (58*s, 60*s),
        (65*s, 70*s),
    ]
    draw.polygon(ship_points, fill=(0, 255, 255, 255))
    
    # Cockpit rect: x=47, y=30, w=6, h=15, fill=#fff
    draw.rectangle([int(47*s), int(30*s), int(53*s), int(45*s)], fill=(255, 255, 255, 255))
    
    # Left wing: x=28, y=58, w=8, h=5, fill=#08f -> (0, 136, 255)
    draw.rectangle([int(28*s), int(58*s), int(36*s), int(63*s)], fill=(0, 136, 255, 255))
    
    # Right wing: x=64, y=58, w=8, h=5, fill=#08f
    draw.rectangle([int(64*s), int(58*s), int(72*s), int(63*s)], fill=(0, 136, 255, 255))
    
    # Stars
    stars = [
        (2, 20, 2, 2, 0.7),
        (85, 15, 2, 2, 0.5),
        (15, 80, 2, 2, 0.6),
        (90, 75, 2, 2, 0.4),
        (75, 40, 1.5, 1.5, 0.5),
        (10, 45, 1.5, 1.5, 0.6),
    ]
    for (x, y, w, h, opacity) in stars:
        star_color = (255, 255, 255, int(255 * opacity))
        draw.rectangle(
            [int(x*s), int(y*s), int((x+w)*s), int((y+h)*s)],
            fill=star_color
        )
    
    return img


# Generate icons at all required sizes
sizes = [72, 96, 128, 144, 152, 192, 384, 512]
icons_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')

for size in sizes:
    img = generate_icon(size)
    filepath = os.path.join(icons_dir, f'icon-{size}.png')
    img.save(filepath, 'PNG')
    print(f'Generated: {filepath}')

# Also generate a 180x180 for Apple touch icon (standard iOS size)
img = generate_icon(180)
filepath = os.path.join(icons_dir, 'apple-touch-icon.png')
img.save(filepath, 'PNG')
print(f'Generated: {filepath}')

print('\nDone! All PNG icons generated.')
