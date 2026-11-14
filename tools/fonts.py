"""The site's three typefaces, served from the site itself rather than from Google Fonts: the same files Google serves
(Doto, Instrument Sans, Libre Caslon Display, each SIL Open Font License), the Latin set and the extended Latin set of
each, with the same rules. A page asks for nothing from anywhere else before its words can be set, and the Latin file of
each face it needs is asked for at once (preloaded), alongside its script.
Used by the deployed site's build (untamed/build.py and tamed/build.py); the single-file previews keep Google's sheet."""
import hashlib, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'untamed', 'src', 'assets', 'fonts')   # laid down at out/assets/fonts by Land's build
LATIN = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, '
         'U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
LATIN_EXT = ('U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, '
             'U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF')
FACES = {
    'doto': ('Doto', '100 900', '', 'doto'),
    'isans': ('Instrument Sans', '400 600', 'font-stretch:100%;', 'isans'),
    'caslon': ('Libre Caslon Display', '400', '', 'caslon'),
}

def _v(name):
    return hashlib.sha1(open(os.path.join(DIR, name), 'rb').read()).hexdigest()[:10]

def face_css(keys, base='fonts/'):
    """@font-face rules for these faces, their files at base (relative to the stylesheet, or absolute)"""
    out = []
    for k in keys:
        fam, wt, extra, stem = FACES[k]
        for sub, rng in (('latin-ext', LATIN_EXT), ('latin', LATIN)):
            f = '%s-%s.woff2' % (stem, sub)
            out.append("@font-face{font-family:'%s';font-style:normal;font-weight:%s;%sfont-display:swap;src:url(%s%s?v=%s) format('woff2');unicode-range:%s}"
                       % (fam, wt, extra, base, f, _v(f), rng))
    return '\n'.join(out) + '\n'

def preload(keys, base):
    """the Latin file of each face, asked for at once"""
    return ''.join('<link rel="preload" href="%s%s-latin.woff2?v=%s" as="font" type="font/woff2" crossorigin>\n'
                   % (base, FACES[k][3], _v(FACES[k][3] + '-latin.woff2')) for k in keys)

def files():
    return sorted(n for n in os.listdir(DIR) if n.endswith('.woff2'))
