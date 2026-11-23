"""Renderizador de quadros: abre o motor no Chromium (Playwright) e salva jpg + json por quadro."""
import base64, sys, os, json
from playwright.sync_api import sync_playwright


def abrir(pw, porta, slug):
    b = pw.chromium.launch(executable_path=("/usr/bin/google-chrome" if __import__("os").path.exists("/usr/bin/google-chrome") else None), args=["--no-sandbox","--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 720, "height": 1280})
    pg.on("pageerror", lambda e: print("ERRO-PAGINA", e, flush=True))
    pg.goto(f"http://127.0.0.1:{porta}/engine/viewer.html?p={slug}")
    pg.wait_for_function("window.READY || window.ERRO", timeout=180000)
    err = pg.evaluate("window.ERRO || ''")
    if err:
        print("ERRO-CENA", err, flush=True); b.close(); sys.exit(2)
    return b, pg


def main():
    modo, porta, slug = sys.argv[1], sys.argv[2], sys.argv[3]
    with sync_playwright() as pw:
        b, pg = abrir(pw, porta, slug)
        if modo == "eventos":
            open(sys.argv[4], "w").write(pg.evaluate("window.EVENTOS"))
        elif modo == "inspecao":       # inspecao <out.json> f0 f1
            f0, f1 = int(sys.argv[5]), int(sys.argv[6])
            Q = [json.loads(pg.evaluate("t => window.inspecionar(t)", f / 30.0)) for f in range(f0, f1)]
            A = json.loads(pg.evaluate("a => window.inspecionarAcoes(a[0], a[1])", [f0 / 30.0, f1 / 30.0]))
            json.dump({"quadros": Q, "acoes": A}, open(sys.argv[4], "w"))
        elif modo == "foto":           # foto <out> t...  |  com câmera livre: t:px,py,pz:ax,ay,az:fov
            out = sys.argv[4]; os.makedirs(out, exist_ok=True)
            for x in sys.argv[5:]:
                p = x.split(":")
                if len(p) >= 3:
                    d = json.loads(pg.evaluate("a => window.dbg(a[0], a[1], a[2], a[3])", [float(p[0]), [float(v) for v in p[1].split(",")], [float(v) for v in p[2].split(",")], float(p[3]) if len(p) > 3 else 45]))
                else:
                    d = json.loads(pg.evaluate("t => window.renderFrame(t)", float(p[0])))
                open(f"{out}/foto_{float(p[0]):07.2f}.jpg", "wb").write(base64.b64decode(d["img"].split(",")[1]))
        else:                          # quadros <out> <arquivo_lista> <parte> <npartes>
            out, lista, parte, npartes = sys.argv[4], sys.argv[5], int(sys.argv[6]), int(sys.argv[7])
            os.makedirs(out, exist_ok=True)
            F = [int(x) for x in open(lista).read().split()]
            for f in F[parte::npartes]:
                fn = f"{out}/f_{f:05d}.jpg"
                if os.path.exists(fn): continue
                d = json.loads(pg.evaluate("t => window.renderFrame(t)", f / 30.0))
                json.dump({"P": d["P"], "cam": d["cam"]}, open(f"{out}/f_{f:05d}.json", "w"))
                open(fn + ".tmp", "wb").write(base64.b64decode(d["img"].split(",")[1])); os.replace(fn + ".tmp", fn)
        b.close()


if __name__ == "__main__":
    main()
