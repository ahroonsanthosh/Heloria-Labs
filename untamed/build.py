#!/usr/bin/env python3
"""Build Heloria Untamed, the playable universe, from untamed/src.

  python3 untamed/build.py                      # dist/untamed.html, one self-contained HTML document
  python3 untamed/build.py --single dist/x.html # the same document, somewhere else
  python3 untamed/build.py --artifact out.html  # page content only, for a claude.ai artifact
  python3 untamed/build.py --only kr --single /tmp/kr.html   # just one station (fast testing)
  python3 untamed/build.py --src journey/src --artifact out.html   # the journey version, built from its own source tree

The deployed site (Tamed at the front, Untamed under untamed/) is written by tools/build.py, which calls write_site() here.
"""
import argparse, base64, glob, json, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'untamed', 'src')
ORDER = ['kr', 'ae', 'ph', 'og', 'cr', 'be']
CORE_JS = ['00-core.js', '05-bh.js', '10-universe.js', '20-hub.js', '25-story.js', '29-station.js']
CREW = ['ahroon', 'michael', 'abraham']   # crew order: Ahroon first
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Doto:ROND,wght@0..100,100..900&display=swap'
TAMED_ARTIFACT = 'https://claude.ai/artifact/2sQrGTPr8inczHUGHVpFss'   # where the calm site lives when this is an artifact

def read(p): return open(os.path.join(SRC, p), encoding='utf-8').read()
def b64(p): return base64.b64encode(open(os.path.join(SRC, p), 'rb').read()).decode()

def calm_link(html, url):
    """the one link to the calm site, on the first screen: a new tab when it is another artifact, the same tab on the site"""
    attrs = 'href="%s"' % url + ('' if url.startswith('.') or url.startswith('/') else ' target="_blank" rel="noopener"')
    return html.replace('href="__TAMED__"', attrs)

def parts(only, tamed_url=TAMED_ARTIFACT):
    ids = [i for i in ORDER if os.path.isdir(os.path.join(SRC, 'stations', i)) and (not only or i in only)]
    css = read('css/core.css') + '\n' + '\n'.join('/* ===== station %s ===== */\n' % i + read('stations/%s/station.css' % i) for i in ids)
    html = calm_link(read('body.html').replace('<!-- @STATIONS -->', '\n'.join(read('stations/%s/station.html' % i) for i in ids)), tamed_url)
    has = lambda f: os.path.exists(os.path.join(SRC, 'js', f))
    core = [x for f in CORE_JS for x in ((['28-finale.js'] if f == '29-station.js' and has('28-finale.js') else []) + [f])]   # the last flight, before the stations
    core += ['26-journey.js'] if has('26-journey.js') else []   # the journey version adds its director
    js = '\n'.join(read('js/' + f) for f in core)
    js += '\n' + '\n'.join('/* ===== station %s ===== */\n' % i + read('stations/%s/station.js' % i) for i in ids)
    js += '\n' + read('js/90-main.js')
    # station data files (json) become globals: DATA['og/table'] etc.
    data = {}
    for i in ids:
        for f in sorted(glob.glob(os.path.join(SRC, 'stations', i, '*.json'))):
            data['%s/%s' % (i, os.path.splitext(os.path.basename(f))[0])] = json.load(open(f))
    js = 'const DATA=%s;\n' % json.dumps(data, separators=(',', ':')) + js
    return ids, css, html, js

def wrap_js(js): return "(()=>{\n'use strict';\n" + js + "\n})();\n"

def single(only, inline_three=False):
    ids, css, html, js = parts(only)
    photos = ['data:image/webp;base64,' + b64('assets/img/%s.webp' % n) for n in CREW]
    js = js.replace('__PHOTOS__', json.dumps(photos))
    head = read('head.html')
    three = ('<script>\n' + read('assets/vendor/three.min.js') + '\n</script>') if inline_three else '<script src="%s"></script>' % THREE_CDN
    return head + '\n<style>\n' + css + '\n</style>\n' + html + '\n' + three + '\n<script>\n' + wrap_js(js) + '</script>\n'

DOC_HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Heloria Labs: Untamed</title>
<meta name="description" content="Heloria Labs is a software lab in Ireland. A playable universe: fall into a ray-traced black hole and play Kríos, Aetos, Pharos and Ogive.">
<meta name="theme-color" content="#050504">
<meta property="og:type" content="website">
<meta property="og:title" content="Heloria Labs: Untamed">
<meta property="og:description" content="A software lab in Ireland. Software for problems with physics in them.">
<meta property="og:image" content="{A}img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{A}img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{F}">
<link rel="stylesheet" href="{A}untamed.css">
</head>
<body>
'''

def write_site(out, only=None):
    """Untamed's part of the deployed site: out/untamed/index.html, its css and js in out/assets/, and the shared
    files both sites use (the portraits, the social image, the icon, three.js) in out/assets/img and out/assets/vendor"""
    ids, css, html, js = parts(only, tamed_url='../')
    A = '../assets/'
    os.makedirs(os.path.join(out, 'untamed'), exist_ok=True); os.makedirs(os.path.join(out, 'assets', 'vendor'), exist_ok=True)
    shutil.copytree(os.path.join(SRC, 'assets', 'img'), os.path.join(out, 'assets', 'img'), dirs_exist_ok=True)
    for f in ('three.min.js', 'three.LICENSE.txt'): shutil.copy(os.path.join(SRC, 'assets', 'vendor', f), os.path.join(out, 'assets', 'vendor', f))
    js = js.replace('__PHOTOS__', json.dumps([A + 'img/%s.webp' % n for n in CREW]))
    open(os.path.join(out, 'assets', 'untamed.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(out, 'assets', 'untamed.js'), 'w', encoding='utf-8').write(wrap_js(js))
    page = DOC_HEAD.replace('{A}', A).replace('{F}', FONTS_CSS) + html + '\n<script src="%svendor/three.min.js"></script>\n<script src="%suntamed.js"></script>\n</body>\n</html>\n' % (A, A)
    open(os.path.join(out, 'untamed', 'index.html'), 'w', encoding='utf-8').write(page)
    nf = os.path.join(SRC, '404.html')
    if os.path.exists(nf): shutil.copy(nf, os.path.join(out, '404.html'))
    return out

def main():
    ap = argparse.ArgumentParser(description='Build Heloria Untamed')
    ap.add_argument('--single'); ap.add_argument('--artifact'); ap.add_argument('--only')
    ap.add_argument('--inline-three', action='store_true')
    ap.add_argument('--src', help='build from another source tree, e.g. journey/src (the default is untamed/src)')
    a = ap.parse_args()
    global SRC
    if a.src: SRC = a.src if os.path.isabs(a.src) else os.path.join(ROOT, a.src)
    only = set(a.only.split(',')) if a.only else None
    if not (a.single or a.artifact):
        a.single = 'dist/untamed.html'
    if a.single:
        doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + single(only, a.inline_three) + '</body></html>'
        p = a.single if os.path.isabs(a.single) else os.path.join(ROOT, a.single)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(doc); print('single ->', p, len(doc))
    if a.artifact:
        p = a.artifact if os.path.isabs(a.artifact) else os.path.join(ROOT, a.artifact)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(single(only)); print('artifact ->', p)

if __name__ == '__main__':
    main()
