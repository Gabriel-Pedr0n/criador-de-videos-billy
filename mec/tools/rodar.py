import sys, os, json, base64, subprocess, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
MEC = '/tmp/claude-0/-home-claude/529e6ddb-807f-5acf-b582-a84d6ee2ebfc/scratchpad/mec'
OUT = sys.argv[1]; slug = sys.argv[2]; t = float(sys.argv[3]); objs = json.loads(open(sys.argv[4]).read())
os.makedirs(OUT, exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=MEC); H.log_message = lambda *a: None
srv = socketserver.TCPServer(('127.0.0.1', 0), H); porta = srv.server_address[1]; threading.Thread(target=srv.serve_forever, daemon=True).start()
js = open(os.path.join(os.path.dirname(__file__), 'estudio.js')).read()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 400, 'height': 400}); pg.on('console', lambda m: print('[js]', m.text) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{porta}/engine/viewer.html?p={slug}')
    pg.wait_for_function('window.READY || window.ERRO', timeout=300000)
    if pg.evaluate('window.ERRO'): sys.exit(pg.evaluate('window.ERRO'))
    r = pg.evaluate(js, {'t': t, 'objetos': objs, 'slug': slug, 'w': 900, 'h': 1200})
    for k, v in r['fotos'].items(): open(os.path.join(OUT, k + '.png'), 'wb').write(base64.b64decode(v.split(',', 1)[1]))
    for k, v in r['glb'].items(): open(os.path.join(OUT, k + '.glb'), 'wb').write(base64.b64decode(v))
    print('faltou:', r.get('faltou')); print('ok', len(r['fotos']), 'fotos', list(r['glb']))
    b.close()
