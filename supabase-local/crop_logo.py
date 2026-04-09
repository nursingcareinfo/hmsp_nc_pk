#!/usr/bin/env python3
"""Crop excess white space from logo and resize for web."""
from PIL import Image

img = Image.open('/home/archbtw/dev/whatsapp/hmsp_nc_pk_repo/src/assets/nursing-care-logo.png')
img = img.convert('RGBA')

# Find bounding box of non-white pixels
bg = (255, 255, 255, 255)
bbox = img.getbbox()  # gets bounds of non-zero pixels, but we need non-white

# Convert to check non-white
pixels = img.load()
w, h = img.size

# Find actual content bounds (anything not pure white)
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Consider it background if very light (not pure white)
        if r < 250 or g < 250 or b < 250:
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

if max_x >= min_x and max_y >= min_y:
    # Add small padding
    pad = int((max_x - min_x) * 0.05)
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(w - 1, max_x + pad)
    max_y = min(h - 1, max_y + pad)
    
    cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    print(f"Original: {w}x{h} -> Cropped: {cropped.width}x{cropped.height}")
    cropped.save('/home/archbtw/dev/whatsapp/hmsp_nc_pk_repo/src/assets/nursing-care-logo.png', 'PNG')
else:
    print("No content found, saving as-is")
