"""Build concept/orbit/index.html from head.html + js/*.js. Run: python3 concept/orbit/src/build.py"""
import base64, json, glob, os
here = os.path.dirname(os.path.abspath(__file__))
head = open(os.path.join(here, 'head.html')).read()
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(here, 'js', '*.js'))))
photos = ['data:image/webp;base64,' + base64.b64encode(open(os.path.join(here, 'img', n + '-380.webp'), 'rb').read()).decode() for n in ['michael', 'ahroon', 'abraham']]
js = js.replace('__PHOTOS__', json.dumps(photos))
page = head + '\n<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>\n<script>\n(()=>{\n\'use strict\';\n' + js + '\n})();\n</script>\n'
doc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>' + page + '</body></html>'
open(os.path.join(here, '..', 'index.html'), 'w').write(doc)
print('wrote', len(doc), 'bytes')
