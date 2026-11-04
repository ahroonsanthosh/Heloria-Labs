#!/usr/bin/env python3
"""Build the whole Heloria Labs site: one place, three ways in.

  python3 tools/build.py            # docs/ (what Cloudflare serves) and the single-file builds in dist/
  python3 tools/build.py --docs /tmp/site   # the site somewhere else, nothing in dist/
  python3 tools/build.py --bundle /tmp/one  # everything as one claude.ai artifact: index.html (the page) and
                                            # untamed/index.html (a page of its own), linked in the same tab

docs/
  index.html          Heloria Tamed, the front door: the gate offers Walk, Land and Fly
  untamed/index.html  Heloria Untamed, the playable universe (Beacon, its contact station, links back to the calm walk)
  assets/             tamed.css, tamed.js, untamed.css, untamed.js, img/ (portraits, social images, icon), vendor/ (three.js)
  404.html            for any address that is not here
  _headers            for Cloudflare: security headers, and how long each kind of file may be cached
  _redirects          for Cloudflare: /walk, /land and /fly (the addresses shown while you are there) back to the front door
"""
import argparse, importlib.util, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, path))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


# Cloudflare reads this from the site's root. Pages and their code can change at any deploy, so they are checked
# again within the hour; three.js is a fixed version and kept for a year. Rules for a folder add to those of the folders
# round it, so the inner ones drop the outer Cache-Control (the ! lines) before setting their own
HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/assets/img/*
  ! Cache-Control
  Cache-Control: public, max-age=604800

/assets/vendor/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
"""


# /walk, /land and /fly are where the address bar says you are, not pages: reloading one goes back to the front door
REDIRECTS = """/walk / 302
/walk/ / 302
/land / 302
/land/ / 302
/fly / 302
/fly/ / 302
"""


def main():
    ap = argparse.ArgumentParser(description='Build the Heloria Labs site')
    ap.add_argument('--docs', default='docs', help='where to write the site (default docs/)')
    ap.add_argument('--bundle', help='write the one-artifact build here, and nothing else')
    a = ap.parse_args()
    untamed = load('untamed_build', 'untamed/build.py')
    tamed = load('tamed_build', 'tamed/build.py')
    if a.bundle:
        out = a.bundle if os.path.isabs(a.bundle) else os.path.join(ROOT, a.bundle)
        os.makedirs(os.path.join(out, 'untamed'), exist_ok=True)
        p, n = tamed.write(os.path.join(out, 'index.html'), tamed.body(tamed.BUNDLE_LINKS))   # the page: content only
        print('bundle   ->', p, n)
        doc = untamed.document(tamed_url='../index.html')
        open(os.path.join(out, 'untamed', 'index.html'), 'w', encoding='utf-8').write(doc)
        print('bundle   ->', os.path.join(out, 'untamed', 'index.html'), len(doc.encode('utf-8')))
        return
    out = a.docs if os.path.isabs(a.docs) else os.path.join(ROOT, a.docs)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    untamed.write_site(out)   # first: it also lays down the shared files in assets/
    tamed.write_site(out)
    open(os.path.join(out, '.nojekyll'), 'w').write('')
    open(os.path.join(out, '_headers'), 'w').write(HEADERS)
    open(os.path.join(out, '_redirects'), 'w').write(REDIRECTS)
    print('site     ->', out)
    for root, _, files in sorted(os.walk(out)):
        for f in sorted(files):
            p = os.path.join(root, f)
            print('  %-34s %9d' % (os.path.relpath(p, out), os.path.getsize(p)))
    if a.docs == 'docs':
        sys.argv = [sys.argv[0]]
        untamed.main()   # dist/untamed.html
        tamed.main()     # dist/tamed.html


if __name__ == '__main__':
    main()
