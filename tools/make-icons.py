#!/usr/bin/env python3
"""Genera el icono y la pantalla de carga de Paleta Polar."""
import os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = os.path.join(root, 'android', 'app', 'src', 'main', 'res')
S = 1024

def popsicle(size, scale=1.0):
    """Paleta de fresa con cara, sobre fondo transparente."""
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = size * scale / 1000
    cx, cy = size / 2, size / 2
    # stick
    d.rounded_rectangle([cx - 55*u, cy + 150*u, cx + 55*u, cy + 440*u], radius=50*u, fill='#d9a96a')
    d.rectangle([cx - 55*u, cy + 170*u, cx + 55*u, cy + 205*u], fill='#b88850')
    # body with vertical gradient
    w, top, bot = 290*u, cy - 400*u, cy + 240*u
    body = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    grad = Image.new('RGBA', (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = min(1, max(0, (y - top) / (bot - top)))
        a = (255, 163, 196); b = (255, 92, 141); c = (232, 58, 110)
        col = tuple(int(a[i] + (b[i]-a[i]) * t/0.55) if t < 0.55 else int(b[i] + (c[i]-b[i]) * (t-0.55)/0.45) for i in range(3))
        gd.line([(0, y), (size, y)], fill=col + (255,))
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([cx - w, top, cx + w, bot - 30*u], radius=w, fill=255)
    md.rectangle([cx - w, top + w, cx + w, bot - 30*u], fill=255)
    for dx, r, dy in [(-205, 48, 25), (-70, 40, 55), (110, 44, 18), (235, 34, 40)]:
        md.ellipse([cx + dx*u - r*u, bot - 60*u, cx + dx*u + r*u, bot - 30*u + dy*u + r*u], fill=255)
    body.paste(grad, (0, 0), mask)
    im = Image.alpha_composite(im, body)
    d = ImageDraw.Draw(im)
    # highlight
    d.rounded_rectangle([cx - 230*u, top + 130*u, cx - 160*u, top + 430*u], radius=35*u, fill='#ffc4da')
    # eyes
    for k in (-1, 1):
        ex, ey = cx + k*120*u, cy - 90*u
        d.ellipse([ex - 70*u, ey - 85*u, ex + 70*u, ey + 85*u], fill='white')
        d.ellipse([ex - 30*u + 15*u, ey - 30*u + 20*u, ex + 30*u + 15*u, ey + 30*u + 20*u], fill='#22163a')
        d.ellipse([ex + 2*u, ey - 5*u, ex + 22*u, ey + 15*u], fill='white')
    # cheeks + smile
    for k in (-1, 1):
        d.ellipse([cx + k*215*u - 45*u, cy + 15*u, cx + k*215*u + 45*u, cy + 50*u], fill='#ff9ab9')
    d.chord([cx - 70*u, cy - 10*u, cx + 70*u, cy + 110*u], 0, 180, fill='#5a1030')
    return im

def background(size, rounded=None, circle=False):
    im = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(im)
    for y in range(size):
        t = y / size
        col = (int(27 + (10-27)*t), int(58 + (20-58)*t), int(138 + (48-138)*t), 255)
        d.line([(0, y), (size, y)], fill=col)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([size*.15, size*.12, size*.85, size*.82], fill=(159, 232, 255, 90))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(size*.08)))
    rnd = random.Random(7); d = ImageDraw.Draw(im)
    for _ in range(26):
        x, y, r = rnd.random()*size, rnd.random()*size, size*(0.006 + rnd.random()*0.01)
        d.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255, 170))
    if rounded or circle:
        m = Image.new('L', (size, size), 0); md = ImageDraw.Draw(m)
        if circle: md.ellipse([0, 0, size-1, size-1], fill=255)
        else: md.rounded_rectangle([0, 0, size-1, size-1], radius=int(size*rounded), fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0)); out.paste(im, (0, 0), m); im = out
    return im

def compose(size, rounded=None, circle=False):
    bg = background(S, rounded, circle)
    fg = popsicle(S, 0.62)
    if rounded or circle:
        m = bg.split()[3]
        fg2 = Image.new('RGBA', (S, S), (0, 0, 0, 0)); fg2.paste(fg, (0, 0), Image.composite(fg.split()[3], Image.new('L', (S, S), 0), m))
        fg = fg2
    return Image.alpha_composite(bg, fg).resize((size, size), Image.LANCZOS)

dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in dens.items():
    d = os.path.join(res, 'mipmap-' + name)
    compose(int(48*k), rounded=0.22).save(os.path.join(d, 'ic_launcher.png'))
    compose(int(48*k), circle=True).save(os.path.join(d, 'ic_launcher_round.png'))
    popsicle(S, 0.5).resize((int(108*k), int(108*k)), Image.LANCZOS).save(os.path.join(d, 'ic_launcher_foreground.png'))

# adaptive background as a picture
for name, k in dens.items():
    os.makedirs(os.path.join(res, 'mipmap-' + name), exist_ok=True)
    background(S).resize((int(108*k), int(108*k)), Image.LANCZOS).save(os.path.join(res, 'mipmap-' + name, 'ic_launcher_background.png'))
for f in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    open(os.path.join(res, 'mipmap-anydpi-v26', f), 'w').write(
        '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')

# splash screens: keep each existing file's size
font = None
for cand in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
    if os.path.exists(cand): font = cand
lilita = os.path.join(root, 'tools', 'LilitaOne-Regular.ttf')
if os.path.exists(lilita): font = lilita
for dp, dirs, files in os.walk(res):
    if 'splash.png' not in files: continue
    p = os.path.join(dp, 'splash.png'); w, h = Image.open(p).size
    im = Image.new('RGBA', (w, h), (10, 20, 48, 255))
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0)); m = min(w, h)
    ImageDraw.Draw(glow).ellipse([w/2 - m*.35, h/2 - m*.42, w/2 + m*.35, h/2 + m*.28], fill=(47, 143, 216, 110))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(m*.08)))
    ic = popsicle(S, 0.8).resize((int(m*.42), int(m*.42)), Image.LANCZOS)
    im.alpha_composite(ic, (int(w/2 - ic.width/2), int(h/2 - ic.height*.62)))
    if font:
        f = ImageFont.truetype(font, max(12, int(m*.08)))
        d = ImageDraw.Draw(im); txt = 'Paleta Polar'
        tw = d.textlength(txt, font=f)
        d.text((w/2 - tw/2, h/2 + m*.2), txt, font=f, fill='white', stroke_width=max(1, int(m*.008)), stroke_fill='#1b4f90')
    im.convert('RGB').save(p)
print('iconos y pantallas de carga listos')
