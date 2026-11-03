#!/usr/bin/env python3
"""Build Heloria Tamed, the daylight site, from tamed/src.

  python3 tamed/build.py                          # dist/tamed.html, a complete single HTML document
  python3 tamed/build.py --single /tmp/t.html     # the same document, somewhere else
  python3 tamed/build.py --artifact /tmp/a.html   # page content only, for a claude.ai artifact
  python3 tamed/build.py --single dist/tamed.html --artifact dist/tamed.artifact.html

The page is assembled from tamed/src: head.html, css/*.css, body.html, js/*.js (in name order, wrapped in one
strict closure). The three portraits are read from src/assets/img (the untamed site's own files, never written to)
and embedded as base64. three.js r160 is loaded from jsDelivr as a global.
"""
import argparse, base64, glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'src')
PHOTO_DIR = os.path.join(ROOT, 'src', 'assets', 'img')
PEOPLE = ['ahroon', 'michael', 'abraham']   # in this order, everywhere
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
LIMIT = 16 * 1024 * 1024
EM_DASH = '—'


def read(p):
    return open(os.path.join(SRC, p), encoding='utf-8').read()


def photos():
    out = []
    for n in PEOPLE:
        with open(os.path.join(PHOTO_DIR, n + '.webp'), 'rb') as f:
            out.append('data:image/webp;base64,' + base64.b64encode(f.read()).decode())
    return out


def sources():
    css = sorted(glob.glob(os.path.join(SRC, 'css', '*.css')))
    js = sorted(glob.glob(os.path.join(SRC, 'js', '*.js')))
    return css, js


def check_dashes(files):
    """The copy, the comments and the code never use an em dash."""
    bad = []
    for f in files:
        for i, line in enumerate(open(f, encoding='utf-8'), 1):
            if EM_DASH in line:
                bad.append('%s:%d' % (os.path.relpath(f, ROOT), i))
    if bad:
        sys.exit('em dash found (use a comma, colon or full stop):\n  ' + '\n  '.join(bad))


def body():
    css_files, js_files = sources()
    check_dashes(css_files + js_files + [os.path.join(SRC, 'head.html'), os.path.join(SRC, 'body.html')])
    css = '\n'.join(open(f, encoding='utf-8').read() for f in css_files)
    js = '\n'.join('/* ---- %s ---- */\n' % os.path.basename(f) + open(f, encoding='utf-8').read() for f in js_files)
    if '__PHOTOS__' not in js:
        sys.exit('the app script lost its __PHOTOS__ placeholder')
    js = js.replace('__PHOTOS__', json.dumps(photos()))
    app = "(()=>{\n'use strict';\n" + js + "\n})();\n"
    return (read('head.html').strip() + '\n<style>\n' + css + '\n</style>\n' + read('body.html').strip() + '\n'
            + '<script src="%s"></script>\n' % THREE_CDN + '<script>\n' + app + '</script>\n')


def document(content):
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '</head>\n<body>\n' + content + '</body>\n</html>\n')


def write(path, text):
    p = path if os.path.isabs(path) else os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    size = len(text.encode('utf-8'))
    if size > LIMIT:
        sys.exit('%s is %d bytes, over the 16 MB artifact limit' % (p, size))
    return p, size


def main():
    ap = argparse.ArgumentParser(description='Build Heloria Tamed')
    ap.add_argument('--single', help='write a complete HTML document here')
    ap.add_argument('--artifact', help='write the artifact body (page content only) here')
    a = ap.parse_args()
    if not (a.single or a.artifact):
        a.single = 'dist/tamed.html'
    content = body()
    if a.single:
        p, n = write(a.single, document(content))
        print('single   ->', p, n, 'bytes')
    if a.artifact:
        p, n = write(a.artifact, content)
        print('artifact ->', p, n, 'bytes')


if __name__ == '__main__':
    main()
