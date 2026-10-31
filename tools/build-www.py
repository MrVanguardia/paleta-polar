#!/usr/bin/env python3
"""Arma www/ (la app) a partir de web-src/game.html: fuentes locales, PeerJS y el puente de salas."""
import os, re, shutil
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'web-src')
www = os.path.join(root, 'www')
shutil.rmtree(www, ignore_errors=True)
os.makedirs(os.path.join(www, 'fonts'))
for f in os.listdir(os.path.join(src, 'fonts')):
    shutil.copy(os.path.join(src, 'fonts', f), os.path.join(www, 'fonts', f))
for f in ('peerjs.min.js', 'mqtt.min.js', 'peer-room.js'):
    shutil.copy(os.path.join(src, f), os.path.join(www, f))
shutil.copy(os.path.join(root, 'THIRD_PARTY_NOTICES.md'), os.path.join(www, 'THIRD_PARTY_NOTICES.md'))
game =open(os.path.join(src, 'game.html'), encoding='utf-8').read()
game = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?', '', game)
game = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', game)
game = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n?', '', game)
faces = []
def face(fam, w, file, style='normal'):
    for sub, rng in (('latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'),
                     ('latin-ext', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF')):
        faces.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{w};font-display:swap;src:url(fonts/{file.format(sub)}) format('woff2');unicode-range:{rng}}}")
face('Lilita One', 400, 'lilita-one-{}-400-normal.woff2')
face('Anton', 400, 'anton-{}-400-normal.woff2')
face('IBM Plex Mono', 400, 'ibm-plex-mono-{}-400-normal.woff2')
face('IBM Plex Mono', 600, 'ibm-plex-mono-{}-600-normal.woff2')
face('Instrument Serif', 400, 'instrument-serif-{}-400-normal.woff2')
face('Instrument Serif', 400, 'instrument-serif-{}-400-italic.woff2', 'italic')
for w in (600, 800, 900):
    face('Nunito', w, 'nunito-{}-%d-normal.woff2' % w)
head = ('<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px/1.4 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}'
        + ''.join(faces) + '</style></head><body>\n')
game = game.replace('<script>\n(()=>{', '<script src="peerjs.min.js"></script>\n<script src="mqtt.min.js"></script>\n<script src="peer-room.js"></script>\n<script>\n(()=>{', 1)
open(os.path.join(www, 'index.html'), 'w', encoding='utf-8').write(head + game + '\n</body></html>\n')
print('www/index.html listo')
