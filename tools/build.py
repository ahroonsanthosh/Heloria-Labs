#!/usr/bin/env python3
"""Build the whole Heloria Labs site: one place, two ways in.

  python3 tools/build.py            # docs/ (what GitHub Pages serves) and the single-file builds in dist/
  python3 tools/build.py --docs /tmp/site   # the site somewhere else, nothing in dist/

docs/
  index.html          Heloria Tamed, the front door: the gate offers Tamed or Untamed
  untamed/index.html  Heloria Untamed, the playable universe (Beacon, its contact station, links back to the calm walk)
  assets/             tamed.css, tamed.js, untamed.css, untamed.js, img/ (portraits, social images, icon), vendor/ (three.js)
  404.html            for any address that is not here
"""
import argparse, importlib.util, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, path))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


def main():
    ap = argparse.ArgumentParser(description='Build the Heloria Labs site')
    ap.add_argument('--docs', default='docs', help='where to write the site (default docs/)')
    a = ap.parse_args()
    untamed = load('untamed_build', 'untamed/build.py')
    tamed = load('tamed_build', 'tamed/build.py')
    out = a.docs if os.path.isabs(a.docs) else os.path.join(ROOT, a.docs)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    untamed.write_site(out)   # first: it also lays down the shared files in assets/
    tamed.write_site(out)
    open(os.path.join(out, '.nojekyll'), 'w').write('')
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
