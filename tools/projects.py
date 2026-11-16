"""The list of Heloria Labs projects (projects.json at the top of the repo), read once and checked, for both builds.

The Walk (tamed/build.py) takes from it each room, its label in the page, the index of places, the menu's Projects link
and the page's description. Land (untamed/build.py) takes each project's card, its postcard name and its line in the
plain page. See ADDING-A-PROJECT.md.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# HELORIA_PROJECTS=some/other.json builds from another list instead, to try a project out without touching the real one
PATH = os.environ.get('HELORIA_PROJECTS') or os.path.join(ROOT, 'projects.json')
NEED = ('id', 'name', 'kind', 'walk', 'card', 'by', 'href', 'linkText', 'colour', 'colour2')
# the four the site was made round: each has parts built for it alone (on the Walk, Aetos's skyspace, Pharos's map floor and
# Ogive's shaft; in Land, all four sculptures), so the list has to keep them, under these names, until those parts go too
BUILT_IN = {'aetos': 'ae', 'pharos': 'ph', 'ogive': 'og', 'krios': 'kr'}
LAND_TAKEN = {'be', 'cafe', 'earth', 'hall', 'school', 'pad', 'cliff'}   # Land's own places, which a project cannot be called
EM_DASH = chr(0x2014)


def _fail(msg):
    sys.exit(os.path.basename(PATH) + ': ' + msg)


def load():
    try:
        with open(PATH, encoding='utf-8') as f:
            data = json.load(f)
    except ValueError as e:
        _fail('is not valid JSON (%s)' % e)
    L = data.get('projects')
    if not isinstance(L, list) or not L:
        _fail('needs a "projects" list with at least one project')
    ids, lands = set(), set()
    for i, p in enumerate(L):
        where = 'project %d (%s)' % (i + 1, p.get('id', '?'))
        for k in NEED:
            if not isinstance(p.get(k), str) or not p[k].strip():
                _fail('%s has no "%s"' % (where, k))
        if not re.fullmatch(r'[a-z][a-z0-9]*', p['id']):
            _fail('%s: "id" must be lower-case letters and digits, starting with a letter' % where)
        if p['id'] in ids or p['id'] in ('home', 'team', 'contact', 'projects'):
            _fail('%s: the id "%s" is taken' % (where, p['id']))
        ids.add(p['id'])
        p.setdefault('land', p['id'])
        if not re.fullmatch(r'[a-z][a-z0-9]*', p['land']) or p['land'] in lands or p['land'] in LAND_TAKEN:
            _fail('%s: the land name "%s" is taken or not lower-case letters and digits' % (where, p['land']))
        lands.add(p['land'])
        for k in ('colour', 'colour2'):
            if not re.fullmatch(r'#[0-9A-Fa-f]{6}', p[k]):
                _fail('%s: "%s" must be a colour like #A5C3FF' % (where, k))
        if not re.match(r'(https?://|mailto:)', p['href']):
            _fail('%s: "href" must start with https://, http:// or mailto:' % where)
        for k, v in p.items():
            if isinstance(v, str) and EM_DASH in v:
                _fail('%s: "%s" has an em dash in it; use a comma, a colon or a full stop' % (where, k))
        plot = p.get('plot')
        if plot is not None:
            for k in ('x', 'z', 'yaw', 'w', 'd', 'h'):
                if not isinstance(plot.get(k), (int, float)):
                    _fail('%s: its "plot" needs a number for "%s"' % (where, k))
    for wid, lid in BUILT_IN.items():
        if not any(p['id'] == wid and p['land'] == lid for p in L):
            _fail('"%s" (land "%s") is missing. It has parts built for it alone on the Walk and in Land, so it cannot simply be '
                  'taken off the list: see ADDING-A-PROJECT.md, "Taking one of the four away"' % (wid, lid))
    return L


def walk_json(L):
    """what the Walk's script needs: each room's id, name, light and line (js/00-base.js)"""
    return json.dumps([{'id': p['id'], 'name': p['name'], 'col': p['colour'], 'kind': p['kind']} for p in L], ensure_ascii=False)


def land_json(L):
    """what Land's script needs: each project's card, and where its building stands if it has no sculpture"""
    out = []
    for p in L:
        q = {'id': p['land'], 'name': p['name'], 'kind': p['kind'], 'line': p['card'], 'href': p['href'], 'col': p['colour']}
        if p.get('plot') is not None:
            q['plot'] = p['plot']
        out.append(q)
    return json.dumps(out, ensure_ascii=False)


def names(L):
    """the projects' names as a sentence: 'A, B and C'"""
    n = [p['name'] for p in L]
    return n[0] if len(n) == 1 else ', '.join(n[:-1]) + ' and ' + n[-1]


def _open(p, cls=''):
    """a link's opening tag, without its closing '>': a new tab for anywhere else, the mail app for an address"""
    attrs = '' if p['href'].startswith('mailto:') else ' target="_blank" rel="noopener"'
    return '<a%s href="%s"%s' % (cls, html.escape(p['href']), attrs)


def walk_html(text, L):
    """fills the Walk's page (tamed/src/body.html and head.html): its rooms, its index of places, the menu's Projects link
    and the description"""
    e = html.escape
    n = len(L)
    rooms = []
    for k, p in enumerate(L):
        a = _open(p, ' class="view"')
        rooms.append(
            '    <section class="sec room" id="%s" data-place="%s" style="--c:%s;--c2:%s">\n'
            '      <div class="label">\n'
            '        <p class="no"><span>%02d</span><span>of %02d</span></p>\n'
            '        <h2 class="lab-t mark">%s</h2>\n'
            '        <p class="kind">%s</p>\n'
            '        <p class="medium">%s</p>\n'
            '        <p class="by">%s</p>\n'
            '        %s data-cur="Open"><span>%s</span><i aria-hidden="true"></i></a>\n'
            '      </div>\n'
            '    </section>' % (p['id'], p['id'], p['colour'], p['colour2'], k + 1, n, e(p['name']), e(p['kind']),
                                e(p['walk']), e(p['by']), a, e(p['linkText'])))
    index = ['    <li data-go="home"><span class="n">00</span><span class="t disp">Home</span></li>']
    index += ['    <li data-go="%s"><span class="n">%02d</span><span class="t disp">%s</span></li>' % (p['id'], k + 1, e(p['name']))
              for k, p in enumerate(L)]
    index += ['    <li data-go="team"><span class="n">%02d</span><span class="t disp">Team</span></li>' % (n + 1),
              '    <li data-go="contact"><span class="n">%02d</span><span class="t disp">Contact</span></li>' % (n + 2)]
    for key, val in (('    <!-- @ROOMS -->', '\n'.join(rooms)), ('    <!-- @INDEX -->', '\n'.join(index)),
                     ('@FIRST', L[0]['id']), ('@NAMES', e(names(L)))):
        text = text.replace(key, val)
    return text


def land_html(text, L):
    """fills Land's plain page (untamed/src/body.html, shown without WebGL) with the list of projects, and its description"""
    e = html.escape
    items = []
    for p in L:
        a = _open(p)
        items.append('    <li>%s>%s</a><span>%s</span></li>' % (a, e(p['name']), e(p['kind'])))
    return text.replace('    <!-- @PROJECTS -->', '\n'.join(items)).replace('@NAMES', e(names(L)))
