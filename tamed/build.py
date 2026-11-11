#!/usr/bin/env python3
"""Build Heloria Tamed, the daylight site, from tamed/src.

  python3 tamed/build.py                          # dist/tamed.html, a complete single HTML document
  python3 tamed/build.py --single /tmp/t.html     # the same document, somewhere else
  python3 tamed/build.py --artifact /tmp/a.html   # page content only, for a claude.ai artifact
  python3 tamed/build.py --single dist/tamed.html --artifact dist/tamed.artifact.html
  python3 tamed/build.py --minify --single /tmp/t.html   # minified, exactly as the deployed site serves it

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
# a standalone preview of the walk has nowhere of its own to send Land, Fly or the rocket: they open the whole site, which
# lives as one artifact (tools/build.py --bundle). The separate previews these used to point at are gone
ONE_ARTIFACT = 'https://claude.ai/artifact/AWxaghMgA1wnwfcS97NfEd'
UNTAMED_ARTIFACT = LAND_ARTIFACT = ROCKET_ARTIFACT = ONE_ARTIFACT
ART_LINKS = {'__UNTAMED__': UNTAMED_ARTIFACT, '__LAND__': LAND_ARTIFACT, '__ROCKET__': ROCKET_ARTIFACT, '__PRETTY__': '', '__AHEAD__': ''}
SITE_LINKS = {'__UNTAMED__': 'untamed/', '__LAND__': 'untamed/#land', '__ROCKET__': 'untamed/#aetos', '__PRETTY__': '1', '__AHEAD__': ''}   # __PRETTY__: the address follows you; __AHEAD__: see ahead()
# the one artifact that holds everything: this page at its front, the untamed as a page of its own beside it, the same tab
BUNDLE_LINKS = {'__UNTAMED__': 'untamed/index.html', '__LAND__': 'untamed/index.html#land', '__ROCKET__': 'untamed/index.html#aetos', '__PRETTY__': '', '__AHEAD__': ''}
LIMIT = 16 * 1024 * 1024
EM_DASH = chr(0x2014)   # spelled out, so this file has none in it either


def read(p):
    return open(os.path.join(SRC, p), encoding='utf-8').read()


def minifier():
    """tools/minify.py: esbuild, for the deployed files (and for a single document built with --minify)"""
    import importlib.util
    spec = importlib.util.spec_from_file_location('heloria_minify', os.path.join(ROOT, 'tools', 'minify.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def photos():
    out = []
    for n in PEOPLE:
        with open(os.path.join(PHOTO_DIR, n + '.webp'), 'rb') as f:
            out.append('data:image/webp;base64,' + base64.b64encode(f.read()).decode())
    return out


def land_data():
    """Land from above, rendered by Land's own engine: what the gate's Land way shows before you choose it"""
    with open(os.path.join(SRC, 'assets', 'land.webp'), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()


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


def parts(links, photo_list, land):
    """the css, the markup and the script, with the photos, the Land still and the ways out of the walk filled in"""
    css_files, js_files = sources()
    check_dashes(css_files + js_files + [os.path.join(SRC, 'head.html'), os.path.join(SRC, 'body.html')])
    css = '\n'.join(open(f, encoding='utf-8').read() for f in css_files)
    js = '\n'.join('/* ---- %s ---- */\n' % os.path.basename(f) + open(f, encoding='utf-8').read() for f in js_files)
    for key in ('__PHOTOS__', '__LANDIMG__') + tuple(links):
        if key not in js:
            sys.exit('the app script lost its %s placeholder' % key)
    js = js.replace('__PHOTOS__', json.dumps(photo_list)).replace('__LANDIMG__', land)
    # the recordings a browser keeps from one visit to the next (js/04-keep.js) are kept under a fingerprint of the code
    # that makes them, so a change to any sound makes them all afresh
    import hashlib
    js = js.replace("'__SOUNDV__'", json.dumps(hashlib.sha1(''.join(read('js/' + f) for f in ('04-keep.js', '00-base.js', '05-audio.js')).encode('utf-8')).hexdigest()[:10]))
    for key, url in links.items():
        js = js.replace(key, url)
    app = "(()=>{\n'use strict';\n" + js + "\n})();\n"
    return css, read('body.html').strip(), app


def body(links=ART_LINKS, minify=False):
    css, html, app = parts(links, photos(), land_data())
    if minify:
        M = minifier(); css, app = M.css(css), M.js(app)
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


def fingerprint(text):
    import hashlib
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]

def ahead(out):
    """the Land and Fly page's own script and styles (their fingerprinted addresses, as the untamed build wrote them into
    out/untamed/index.html), which the front door fetches once it is ready: see ahead() in js/90-main.js"""
    import re
    p = os.path.join(out, 'untamed', 'index.html')
    if not os.path.exists(p):
        return ''
    found = re.findall(r'"\.\./(assets/untamed\.(?:css|js)\?v=[0-9a-f]+)"', open(p, encoding='utf-8').read())
    return ' '.join(found)


def write_site(out, minify=True):
    """Tamed's part of the deployed site: out/index.html (the front door, with the three ways in), and its css and js in
    out/assets/. The portraits and three.js are the shared files the untamed build puts in out/assets/img and vendor."""
    # each photograph's address carries a fingerprint of the file, so a browser holding last week's picture fetches the new one
    import hashlib
    pfp = lambda p: hashlib.sha1(open(p, 'rb').read()).hexdigest()[:10]
    css, html, app = parts(dict(SITE_LINKS, __AHEAD__=ahead(out)), ['assets/img/%s.webp?v=%s' % (n, pfp(os.path.join(PHOTO_DIR, n + '.webp'))) for n in PEOPLE],
                           'assets/img/land.webp?v=' + pfp(os.path.join(SRC, 'assets', 'land.webp')))
    if minify:   # smaller to fetch and quicker to read on a phone; the same page (see tools/minify.py)
        M = minifier(); css, app = M.css(css), M.js(app)
    head = read('head.html').strip().replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    og = 'assets/img/og-tamed.jpg' if os.path.exists(os.path.join(SRC, 'assets', 'og.jpg')) else 'assets/img/og.jpg'
    meta = ('<meta property="og:type" content="website">\n<meta property="og:title" content="Heloria Labs">\n'
            '<meta property="og:description" content="We dare to build where others hesitate. A small software lab in Ireland.">\n'
            '<meta property="og:image" content="%s">\n<meta name="twitter:card" content="summary_large_image">\n' % og)
    # each file's address carries a fingerprint of what is in it, so a browser holding an older copy fetches the new one
    # the moment the page changes, instead of running yesterday's code for an hour
    vc, vj = fingerprint(css), fingerprint(app)
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            + head + '\n' + meta + '<link rel="stylesheet" href="assets/tamed.css?v=' + vc + '">\n</head>\n<body>\n' + html + '\n'
            '<script src="assets/vendor/three.min.js?v=' + pfp(os.path.join(ROOT, 'untamed', 'src', 'assets', 'vendor', 'three.min.js'))
            + '"></script>\n<script src="assets/tamed.js?v=' + vj + '"></script>\n</body>\n</html>\n')
    os.makedirs(os.path.join(out, 'assets', 'img'), exist_ok=True)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(out, 'assets', 'tamed.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(out, 'assets', 'tamed.js'), 'w', encoding='utf-8').write(app)
    with open(os.path.join(SRC, 'assets', 'land.webp'), 'rb') as f, open(os.path.join(out, 'assets', 'img', 'land.webp'), 'wb') as g:
        g.write(f.read())
    if og.endswith('og-tamed.jpg'):
        with open(os.path.join(SRC, 'assets', 'og.jpg'), 'rb') as f, open(os.path.join(out, og), 'wb') as g:
            g.write(f.read())
    return out


def main():
    ap = argparse.ArgumentParser(description='Build Heloria Tamed')
    ap.add_argument('--single', help='write a complete HTML document here')
    ap.add_argument('--artifact', help='write the artifact body (page content only) here')
    ap.add_argument('--minify', action='store_true', help='minify the css and script, as the deployed site does')
    a = ap.parse_args()
    if not (a.single or a.artifact):
        a.single = 'dist/tamed.html'
    content = body(minify=a.minify)
    if a.single:
        p, n = write(a.single, document(content))
        print('single   ->', p, n, 'bytes')
    if a.artifact:
        p, n = write(a.artifact, content)
        print('artifact ->', p, n, 'bytes')


if __name__ == '__main__':
    main()
