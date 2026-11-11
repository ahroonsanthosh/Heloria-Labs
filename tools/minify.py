"""Make the deployed scripts and styles smaller, without changing what they do.

The script is minified by esbuild (pinned in package.json: npm install, once): comments and spaces go, and the names of
things inside the page's closure get shorter. Nothing is rewritten into newer JavaScript than the source already uses
(es2020, the same as the source), so an older phone runs exactly what it ran before. The strings stay as they are,
the shaders in them included. The style sheet loses only its comments and spaces.

Used by tools/build.py for docs/, and by tamed/build.py and untamed/build.py with --minify, so the tests can run the
exact code the site serves."""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESBUILD = os.path.join(ROOT, 'node_modules', '.bin', 'esbuild' + ('.cmd' if os.name == 'nt' else ''))
JS = ['--minify', '--target=es2020', '--charset=utf8', '--log-level=error']
CSS = ['--minify-whitespace', '--charset=utf8', '--log-level=error']


def available():
    return os.path.exists(ESBUILD)


def _run(text, loader, flags):
    if not available():
        sys.exit('esbuild is not installed: run  npm install  once in the repository (it minifies the deployed files),\n'
                 'or build with --no-minify for a site that is larger but otherwise the same')
    r = subprocess.run([ESBUILD, '--loader=' + loader] + flags, input=text.encode('utf-8'), capture_output=True)
    if r.returncode != 0:
        sys.exit('esbuild could not minify the %s:\n%s' % (loader, r.stderr.decode('utf-8', 'replace')))
    out = r.stdout.decode('utf-8')
    if loader == 'js' and '</script' in out.lower():
        sys.exit('the minified script contains </script, which would end an inline script early')
    return out


def js(text):
    return _run(text, 'js', JS)


def css(text):
    return _run(text, 'css', CSS)
