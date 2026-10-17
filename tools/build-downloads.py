#!/usr/bin/env python3
"""Rebuild public/downloads/pcm-voice-notes-short-notes-all.zip
from DATA in index.html + public/audio mp4s. Run after adding/removing short notes."""
import json, re, zipfile, os, shutil, tempfile

html = open('index.html').read()
data = json.loads(re.search(r'const DATA = (\[.*?\]);\n', html, re.S).group(1))
tmp = tempfile.mkdtemp()
os.makedirs(f'{tmp}/companion-text'); os.makedirs(f'{tmp}/audio')
readme = ["PCM Voice Notes - Download All",
          f"{len(data)} short voice notes (audio/) + companion text per chapter (companion-text/).",
          "Full 30+ min course tracks live in the course/ folder on the site, per chapter.", ""]
for c in data:
    src = os.path.join('public', c['file'])
    base = os.path.basename(c['file'])
    assert os.path.exists(src), f"missing {src}"
    os.link(src, f'{tmp}/audio/{base}')
    with open(f"{tmp}/companion-text/{base.rsplit('.',1)[0]}.txt", 'w') as f:
        f.write(f"PCM Voice Notes - Companion text\nClass {c['cls']} {c['subject']} - Ch {c['num']}: {c['title']}\nTrack: {c['tags']}\n\n{c['formulas']}\n")
    readme.append(f"{c['cls']} {c['subject'][:3]} Ch {c['num']:>2} - {c['title']}")
open(f'{tmp}/README.txt', 'w').write('\n'.join(readme) + '\n')
os.makedirs('public/downloads', exist_ok=True)
with zipfile.ZipFile('public/downloads/pcm-voice-notes-short-notes-all.zip', 'w', zipfile.ZIP_STORED) as zf:
    zf.write(f'{tmp}/README.txt', 'README.txt')
    for root, _, files in os.walk(tmp):
        for fn in sorted(files):
            if fn == 'README.txt': continue
            p = os.path.join(root, fn)
            zf.write(p, os.path.relpath(p, tmp))
shutil.rmtree(tmp)
print("zip rebuilt:", os.path.getsize('public/downloads/pcm-voice-notes-short-notes-all.zip'), "bytes")
