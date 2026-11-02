#!/usr/bin/env python3
"""Build the Heloria Labs site from src/.

  python3 tools/build.py                      # docs/ (GitHub Pages) + dist/heloria.html (single file)
  python3 tools/build.py --docs docs          # multi-file static site only
  python3 tools/build.py --single dist/x.html # one self-contained HTML document
  python3 tools/build.py --artifact out.html  # page content only, for a claude.ai artifact
  python3 tools/build.py --only kr --single /tmp/kr.html   # just one station (fast testing)
"""
import argparse, base64, glob, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
ORDER = ['kr', 'bs', 'ae', 'ph', 'og', 'cr', 'be']
CORE_JS = ['00-core.js', '05-bh.js', '10-universe.js', '20-hub.js', '25-story.js', '29-station.js']
CREW = ['ahroon', 'michael', 'abraham']   # crew order: Ahroon first
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Doto:ROND,wght@0..100,100..900&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=swap'

def read(p): return open(os.path.join(SRC, p), encoding='utf-8').read()
def b64(p): return base64.b64encode(open(os.path.join(SRC, p), 'rb').read()).decode()

def parts(only):
    ids = [i for i in ORDER if os.path.isdir(os.path.join(SRC, 'stations', i)) and (not only or i in only)]
    css = read('css/core.css') + '\n' + '\n'.join('/* ===== station %s ===== */\n' % i + read('stations/%s/station.css' % i) for i in ids)
    html = read('body.html').replace('<!-- @STATIONS -->', '\n'.join(read('stations/%s/station.html' % i) for i in ids))
    js = '\n'.join(read('js/' + f) for f in CORE_JS)
    js += '\n' + '\n'.join('/* ===== station %s ===== */\n' % i + read('stations/%s/station.js' % i) for i in ids)
    js += '\n' + read('js/90-main.js')
    # station data files (json) become globals: DATA['bs/table'] etc.
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
    css = css.replace('__DM__', 'data:font/woff2;base64,' + b64('assets/fonts/DepartureMono-Regular.woff2'))
    head = read('head.html')
    three = ('<script>\n' + read('assets/vendor/three.min.js') + '\n</script>') if inline_three else '<script src="%s"></script>' % THREE_CDN
    return head + '\n<style>\n' + css + '\n</style>\n' + html + '\n' + three + '\n<script>\n' + wrap_js(js) + '</script>\n'

DOC_HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Heloria Labs</title>
<meta name="description" content="Heloria Labs is a software lab in Ireland. A playable universe: fall into a ray-traced black hole and play Kríos, Bowshock, Aetos, Pharos and Ogive.">
<meta name="theme-color" content="#050504">
<meta property="og:type" content="website">
<meta property="og:title" content="Heloria Labs">
<meta property="og:description" content="A software lab in Ireland. Software for problems with physics in them.">
<meta property="og:image" content="assets/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="%s">
<link rel="stylesheet" href="assets/app.css">
</head>
<body>
'''

def docs(outdir, only):
    ids, css, html, js = parts(only)
    out = os.path.join(ROOT, outdir) if not os.path.isabs(outdir) else outdir
    if os.path.isdir(out): shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'assets', 'vendor'))
    shutil.copytree(os.path.join(SRC, 'assets', 'img'), os.path.join(out, 'assets', 'img'))
    shutil.copytree(os.path.join(SRC, 'assets', 'fonts'), os.path.join(out, 'assets', 'fonts'))
    for f in ('three.min.js', 'three.LICENSE.txt'): shutil.copy(os.path.join(SRC, 'assets', 'vendor', f), os.path.join(out, 'assets', 'vendor', f))
    js = js.replace('__PHOTOS__', json.dumps(['assets/img/%s.webp' % n for n in CREW]))
    css = css.replace('__DM__', 'fonts/DepartureMono-Regular.woff2')
    open(os.path.join(out, 'assets', 'app.css'), 'w', encoding='utf-8').write(css)
    open(os.path.join(out, 'assets', 'app.js'), 'w', encoding='utf-8').write(wrap_js(js))
    page = DOC_HEAD % FONTS_CSS + html + '\n<script src="assets/vendor/three.min.js"></script>\n<script src="assets/app.js"></script>\n</body>\n</html>\n'
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(out, '.nojekyll'), 'w').write('')
    nf = os.path.join(SRC, '404.html')
    if os.path.exists(nf): shutil.copy(nf, os.path.join(out, '404.html'))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--docs'); ap.add_argument('--single'); ap.add_argument('--artifact'); ap.add_argument('--only')
    ap.add_argument('--inline-three', action='store_true')
    a = ap.parse_args()
    only = set(a.only.split(',')) if a.only else None
    if not (a.docs or a.single or a.artifact):
        a.docs = 'docs'; a.single = 'dist/heloria.html'
    if a.docs: print('docs ->', docs(a.docs, only))
    if a.single:
        doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + single(only, a.inline_three) + '</body></html>'
        p = a.single if os.path.isabs(a.single) else os.path.join(ROOT, a.single)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(doc); print('single ->', p, len(doc))
    if a.artifact:
        p = a.artifact if os.path.isabs(a.artifact) else os.path.join(ROOT, a.artifact)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(single(only)); print('artifact ->', p)

if __name__ == '__main__':
    main()
