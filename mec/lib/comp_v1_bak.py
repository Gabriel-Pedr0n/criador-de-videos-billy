"""Compositor 2D: junta o quadro 3D com a legenda de UMA palavra, etiquetas amarelas, X vermelho e check verde."""
import cairo, json, math, os, re, subprocess, sys, unicodedata
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gfx import outlined_text, font, text_w, setc, rrect, clamp, ease_out, back_out

FPS = 30; W, H = 720, 1280
AM = "#FFD23F"; VM = "#FF5A4D"; VD = "#3DDC6A"


def norm(s):
    s = unicodedata.normalize("NFD", s.lower()); return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def limpa(w):
    w = w.strip(" .,:;!?…\"“”()—–-"); return (w[0].upper() + w[1:]) if w else w


class Comp:
    def __init__(self, pdir, escala=1.0, previa=None, passo=1):
        self.p = pdir; self.e = escala; self.previa = previa; self.passo = passo
        self.proj = json.load(open(os.path.join(pdir, "projeto.json"))); self.tempo = json.load(open(os.path.join(pdir, "tempo.json")))
        self.ev = json.load(open(os.path.join(pdir, "eventos.json")))
        self.Q = os.path.join(pdir, "quadros")
        self.words = []                                    # [txt, ini, fim, amarelo, bloco]
        for b, pb in zip(self.tempo["blocos"], self.proj["blocos"]):
            chave = {norm(x) for t in pb.get("termos", []) for x in t.split()}
            for w, s, e in b["palavras"]:
                self.words.append([limpa(w), s, e, norm(w) in chave, b["id"]])
        for i, w in enumerate(self.words):
            nxt = self.words[i + 1] if i + 1 < len(self.words) else None
            w.append(min(nxt[1], w[2] + 0.4) if nxt and nxt[4] == w[4] else w[2] + 0.4)

    # ---------------------------------------------------------------- camadas
    def legenda(self, ctx, t):
        for txt, s, e, am, _, fim in self.words:
            if s <= t < fim and txt:
                k = 0.86 + 0.14 * ease_out((t - s) / 0.08)
                ctx.save(); ctx.translate(360, 952); ctx.scale(k, k)
                outlined_text(ctx, txt, 0, 0, 58, fill=AM if am else "#FFFFFF", stroke="#101010", sw=12, maxw=620)
                ctx.restore(); return

    def rotulos(self, ctx, t, P):
        for r in self.ev["rotulos"]:
            if not (r["t0"] <= t < r["t1"]) or r["id"] not in P: continue
            x, y, vis = P[r["id"]]
            if not vis: continue
            a = clamp((r["t1"] - t) / 0.2); k = back_out(clamp((t - r["t0"]) / 0.28))
            font(ctx, 42); tw = min(600, text_w(ctx, r["txt"]))
            x = min(max(x, tw / 2 + 24), W - tw / 2 - 24); y = min(max(y - 46, 150), 860)
            ctx.save(); ctx.translate(x, y); ctx.rotate(-0.07); ctx.scale(max(k, 0.01), max(k, 0.01))
            outlined_text(ctx, r["txt"], 0, 0, 42, fill=AM, stroke="#2B1B00", sw=10, maxw=600, alpha=a)
            ctx.restore()

    def marcas(self, ctx, t, P):
        for m in self.ev["marcas"]:
            if not (m["t0"] <= t < m["t1"]) or m["id"] not in P: continue
            x, y, vis = P[m["id"]]
            if not vis: continue
            x = min(max(x, 60), W - 60); y = min(max(y, 140), 880)
            a = clamp((m["t1"] - t) / 0.2); k = back_out(clamp((t - m["t0"]) / 0.25)) * (1 + 0.05 * math.sin(t * 9))
            ctx.save(); ctx.translate(x, y); ctx.scale(max(k, 0.01), max(k, 0.01)); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.set_line_join(cairo.LINE_JOIN_ROUND)
            def tr():
                if m["tipo"] == "x":
                    ctx.move_to(-26, -26); ctx.line_to(26, 26); ctx.move_to(26, -26); ctx.line_to(-26, 26)
                else:
                    ctx.move_to(-30, 2); ctx.line_to(-8, 24); ctx.line_to(32, -24)
            tr(); ctx.set_line_width(24); setc(ctx, "#FFFFFF", 0.95 * a); ctx.stroke()
            tr(); ctx.set_line_width(15); setc(ctx, VM if m["tipo"] == "x" else VD, a); ctx.stroke()
            ctx.restore()

    def selo(self, ctx, t):
        if self.previa is None: return
        b = next(x for x in self.tempo["blocos"] if x["id"] == self.previa)
        s = f"PRÉVIA · BLOCO {self.previa} · {max(0, t - b['ini']):04.1f}s"
        font(ctx, 20, "Bold"); tw = text_w(ctx, s)
        rrect(ctx, 16, 16, tw + 24, 36, 10); setc(ctx, "#000000", 0.55); ctx.fill()
        ctx.move_to(28, 41); setc(ctx, "#FFFFFF", 0.95); ctx.show_text(s)

    # ---------------------------------------------------------------- quadro
    def base(self, f):
        g = f - (f % self.passo)
        while g > 0 and not os.path.exists(f"{self.Q}/f_{g:05d}.jpg"): g -= 1
        im = np.asarray(Image.open(f"{self.Q}/f_{g:05d}.jpg").convert("RGB")); h, w = im.shape[:2]
        b = np.empty((h, w, 4), np.uint8); b[..., 0] = im[..., 2]; b[..., 1] = im[..., 1]; b[..., 2] = im[..., 0]; b[..., 3] = 255
        self._buf = bytearray(b.tobytes())
        try: P = json.load(open(f"{self.Q}/f_{g:05d}.json"))["P"]
        except Exception: P = {}
        return cairo.ImageSurface.create_for_data(self._buf, cairo.FORMAT_ARGB32, w, h), P

    def frame(self, ctx, f):
        t = f / FPS; img, P = self.base(f)
        ctx.save(); ctx.scale(self.e, self.e)
        ctx.set_source_surface(img, 0, 0); ctx.get_source().set_filter(cairo.FILTER_BEST if self.e != 1 else cairo.FILTER_FAST); ctx.paint()
        self.marcas(ctx, t, P); self.rotulos(ctx, t, P); self.legenda(ctx, t); self.selo(ctx, t)
        ctx.restore()

    def render(self, f0, f1, out):
        w, h = int(W * self.e), int(H * self.e)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h); ctx = cairo.Context(surf)
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                              "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", out + ".tmp.mp4"], stdin=subprocess.PIPE)
        for f in range(f0, f1):
            self.frame(ctx, f); surf.flush(); p.stdin.write(bytes(surf.get_data()))
        p.stdin.close()
        if p.wait() != 0: raise SystemExit("ffmpeg falhou")
        os.replace(out + ".tmp.mp4", out)

    def foto(self, f, out):
        w, h = int(W * self.e), int(H * self.e)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h); ctx = cairo.Context(surf); self.frame(ctx, f); surf.write_to_png(out)


if __name__ == "__main__":   # comp.py <pdir> <escala> <previa|-> <passo> <f0> <f1> <out>
    a = sys.argv
    Comp(a[1], float(a[2]), None if a[3] == "-" else int(a[3]), int(a[4])).render(int(a[5]), int(a[6]), a[7])
