#!/usr/bin/env python3
"""Build Heloria Tamed, the daylight site, from tamed/src.

  python3 tamed/build.py                          # dist/tamed.html, a complete single HTML document
  python3 tamed/build.py --single /tmp/t.html     # the same document, somewhere else
  python3 tamed/build.py --artifact /tmp/a.html   # page content only, for a claude.ai artifact
  python3 tamed/build.py --single dist/tamed.html --artifact dist/tamed.artifact.html

The page is assembled from tamed/src: head.html, css/*.css, body.html, js/*.js (in name order, wrapped in one
strict closure). The three portraits are read from untamed/src/assets/img (the untamed site's own files, never written
to) and embedded as base64. three.js r160 is loaded from jsDelivr as a global.

The deployed site (Tamed at the front, Untamed under untamed/) is written by tools/build.py, which calls write_site() here.
"""
import argparse, base64, glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'src')
PHOTO_DIR = os.path.join(ROOT, 'untamed', 'src', 'assets', 'img')
PEOPLE = ['ahroon', 'michael', 'abraham']   # in this order, everywhere
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
UNTAMED_ARTIFACT = 'https://claude.ai/artifact/LudKe5Wd8ZGPv88m9A4MMn'   # where the wild site lives when this is an artifact
LIMIT = 16 * 1024 * 1024
EM_DASH = chr(0x2014)   # spelled out, so this file has none in it either


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


def parts(untamed_url, photo_list):
    """the css, the markup and the script, with the photos and the way to the untamed site filled in"""
    css_files, js_files = sources()
    check_dashes(css_files + js_files + [os.path.join(SRC, 'head.html'), os.path.join(SRC, 'body.html')])
    css = '\n'.join(open(f, encoding='utf-8').read() for f in css_files)
    js = '\n'.join('/* ---- %s ---- */\n' % os.path.basename(f) + open(f, encoding='utf-8').read() for f in js_files)
    for key in ('__PHOTOS__', '__UNTAMED__'):
        if key not in js:
            sys.exit('the app script lost its %s placeholder' % key)
    js = js.replace('__PHOTOS__', json.dumps(photo_list)).replace('__UNTAMED__', untamed_url)
    app = "(()=>{\n'use strict';\n" + js + "\n})();\n"
    return css, read('body.html').strip(), app


def body():
    css, html, app = parts(UNTAMED_ARTIFACT, photos())
    return (read('head.html').strip() + '\n<style>\n' + css + '\n</style>\n' + html + '\n'
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


def write_site(out):
    """Tamed's part of the deployed site: out/index.html (the front door, with both ways in), and its css and js in
    out/assets/. The portraits and three.js are the shared files the untamed build puts in out/assets/img and vendor."""
    css, html, app = parts('untamed/', ['assets/img/%s.webp' % n for n in PEOPLE])
    head = read('head.html').strip().replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    og = 'assets/img/og-tamed.jpg' if os.path.exists(os.path.join(SRC, 'assets', 'og.jpg')) else 'assets/img/og.jpg'
    meta = ('<meta property="og:type" content="website">\n<meta property="og:title" content="Heloria Labs">\n'
            '<meta property="og:description" content="We dare to build where others hesitate. A small software lab in Ireland.">\n'
            '<meta property="og:image" content="%s">\n<meta name="twitter:card" content="summary_large_image">\n' % og)
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + head + '\n' + meta + '<link rel="stylesheet" href="assets/tamed.css">\n</head>\n<body>\n' + html + '\n'
            '<script src="assets/vendor/three.min.js"></script>\n<script src="assets/tamed.js"></script>\n</body>\n</html>\n')
    os.makedirs(os.path.join(out, 'assets', 'img'), exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(out, 'assets', 'tamed.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(out, 'assets', 'tamed.js'), 'w', encoding='utf-8').write(app)
    if og.endswith('og-tamed.jpg'):
        with open(os.path.join(SRC, 'assets', 'og.jpg'), 'rb') as f, open(os.path.join(out, og), 'wb') as g:
            g.write(f.read())
    return out


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
