#!/usr/bin/env python3
"""Build the whole Heloria Labs site: one place, two ways in.

  python3 tools/build.py            # docs/ (what Cloudflare serves) and the single-file builds in dist/
  python3 tools/build.py --docs /tmp/site   # the site somewhere else, nothing in dist/
  python3 tools/build.py --no-minify        # the deployed script and styles as written (esbuild minifies them otherwise:
                                            # npm install, once)
  python3 tools/build.py --bundle /tmp/one  # everything as one claude.ai artifact: index.html (the page) and
                                            # untamed/index.html (Land, a page of its own), linked in the same tab

docs/
  index.html          Heloria Tamed, the front door: the gate offers Walk and Land
  untamed/index.html  Land: Earth, the drawn town where the three of us are waiting (its white page links back to the walk)
  assets/             tamed.css, tamed.js, untamed.css, untamed.js, img/ (portraits, social image, icon), vendor/ (three.js)
  404.html            for any address that is not here
  _headers            for Cloudflare: security headers, and how long each kind of file may be cached
  _redirects          for Cloudflare: /walk and /land (the addresses shown while you are there), and /fly (the old way into
                      orbit), back to the front door
"""
import argparse, importlib.util, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, path))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


# Cloudflare reads this from the site's root. Pages and their code can change at any deploy, so they are checked
# again within the hour; three.js is a fixed version and kept for a year. Rules for a folder add to those of the folders
# round it, so the inner ones drop the outer Cache-Control (the ! lines) before setting their own
# The rest is security: the browser keeps to https, a page loads nothing but its own files, the fonts and the sound it makes
# itself (blob:), and Cloudflare's visitor count (its beacon script, which reports to this site or to Cloudflare), the weather
# where the visitor probably is (Earth asks MET Norway once a visit, for a city worked out from the time zone), no other site can frame it, and
# it asks for none of the device's sensors (tested with no violations on every page and station)
HEADERS = """/*
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: default-src 'none'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com https://api.met.no; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: accelerometer=(), bluetooth=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

# every script and style is asked for by its version (?v=...), so a browser may keep each one for good: a new version is a new address
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/assets/img/*
  ! Cache-Control
  ! Cross-Origin-Resource-Policy
  Cache-Control: public, max-age=604800
  Cross-Origin-Resource-Policy: cross-origin

/assets/vendor/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable
"""


# where someone who finds a security problem in the site can tell us (RFC 9116); renew Expires before it lapses
SECURITY_TXT = """Contact: mailto:contact@helorialabs.com
Expires: 2027-11-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://helorialabs.com/.well-known/security.txt
"""


# /walk and /land are where the address bar says you are, not pages: reloading one goes back to the front door. /fly was
# the way into orbit, which is gone; an old link to it goes to the front door too
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
    ap.add_argument('--no-minify', action='store_true', help='leave the deployed script and styles as written (larger, otherwise the same)')
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
    untamed.write_site(out, minify=not a.no_minify)   # first: it also lays down the shared files in assets/
    tamed.write_site(out, minify=not a.no_minify)
    # Land is a page of its own: the front door asks for Land's script and styles while you are still there, at the lowest
    # priority (once everything of its own is in), at the very addresses Land asks for, so going in finds them already kept
    land = open(os.path.join(out, 'untamed', 'index.html'), encoding='utf-8').read()
    want = re.findall(r'"\.\./(assets/untamed\.(?:js|css)\?v=[0-9a-f]+)"', land)
    gp = os.path.join(out, 'index.html'); gate = open(gp, encoding='utf-8').read()
    if want and '</head>' in gate:
        gate = gate.replace('</head>', '<meta name="heloria-land" content="%s">\n</head>' % ','.join(want), 1)   # (read by the front door's script: a prefetch link is not allowed by the site's own rules)
        open(gp, 'w', encoding='utf-8').write(gate)
    shutil.copy(os.path.join(ROOT, 'untamed', 'src', 'assets', 'favicon.ico'), os.path.join(out, 'favicon.ico'))   # where browsers and search engines look first
    open(os.path.join(out, '_headers'), 'w').write(HEADERS)
    open(os.path.join(out, '_redirects'), 'w').write(REDIRECTS)
    os.makedirs(os.path.join(out, '.well-known'), exist_ok=True)
    open(os.path.join(out, '.well-known', 'security.txt'), 'w').write(SECURITY_TXT)
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
