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

    def notas(self, ctx, t, P):
        """pílula branca com bolinha colorida: a CAUSA do problema"""
        for r in self.ev.get("notas", []):
            if not (r["t0"] <= t < r["t1"]) or r["id"] not in P: continue
            x, y, vis = P[r["id"]]
            if not vis: continue
            a = clamp((r["t1"] - t) / 0.2); k = back_out(clamp((t - r["t0"]) / 0.25))
            font(ctx, 25); tw = text_w(ctx, r["txt"]); w = tw + 52; h = 42
            x = min(max(x, w / 2 + 16), W - w / 2 - 16); y = min(max(y, 150), 870)
            ctx.save(); ctx.translate(x, y); ctx.scale(max(k, 0.01), max(k, 0.01))
            rrect(ctx, -w / 2 + 2, -h / 2 + 4, w, h, h / 2); setc(ctx, "#000000", 0.28 * a); ctx.fill()
            rrect(ctx, -w / 2, -h / 2, w, h, h / 2); setc(ctx, "#FFFFFF", a); ctx.fill_preserve(); ctx.set_line_width(3.5); setc(ctx, r.get("cor", "#E5483A"), a); ctx.stroke()
            ctx.new_path(); ctx.arc(-w / 2 + 21, 0, 7, 0, 6.283); setc(ctx, r.get("cor", "#E5483A"), a); ctx.fill()
            font(ctx, 25); ctx.move_to(-w / 2 + 36, 9); setc(ctx, "#1B1B1B", a); ctx.show_text(r["txt"])
            ctx.restore()

    def medidas(self, ctx, t, P):
        for r in self.ev.get("medidas", []):
            if not (r["t0"] <= t < r["t1"]) or r["id"] not in P: continue
            x, y, vis = P[r["id"]]
            if not vis: continue
            a = clamp((r["t1"] - t) / 0.2); k = back_out(clamp((t - r["t0"]) / 0.25)); font(ctx, 38); tw = min(560, text_w(ctx, r["txt"]))
            x = min(max(x, tw / 2 + 20), W - tw / 2 - 20); y = min(max(y + 52, 150), 880)
            ctx.save(); ctx.translate(x, y); ctx.scale(max(k, 0.01), max(k, 0.01)); outlined_text(ctx, r["txt"], 0, 0, 38, fill=AM, stroke="#2B1B00", sw=9, maxw=560, alpha=a); ctx.restore()

    def icones(self, ctx, t, f):
        """▶▶ amarelo (obra acelerada) e ◀◀ branco com riscos de fita (rebobinando o jeito errado)"""
        def tri(x, y, s, d):
            ctx.move_to(x - d * s * 0.5, y - s * 0.6); ctx.line_to(x + d * s * 0.5, y); ctx.line_to(x - d * s * 0.5, y + s * 0.6); ctx.close_path()
        for ic in self.ev.get("icones", []):
            if not (ic["t0"] <= t < ic["t1"]): continue
            a = clamp((t - ic["t0"]) / 0.12) * clamp((ic["t1"] - t) / 0.15)
            if ic["tipo"] == "acelera":
                p = 0.75 + 0.25 * math.sin(t * 12); ctx.new_path(); tri(600, 205, 26, 1); tri(634, 205, 26, 1)
                ctx.set_line_join(cairo.LINE_JOIN_ROUND); ctx.set_line_width(9); setc(ctx, "#2B1B00", a); ctx.stroke_preserve(); setc(ctx, AM, a * p); ctx.fill()
            else:
                rnd = np.random.default_rng(f * 7 + 3)
                for _ in range(16):
                    y = rnd.uniform(0, H); hh = rnd.uniform(2, 7); ctx.rectangle(0, y, W, hh); setc(ctx, "#FFFFFF", a * rnd.uniform(0.12, 0.4)); ctx.fill()
                for _ in range(3):
                    y = rnd.uniform(0, H); ctx.rectangle(0, y, W, rnd.uniform(18, 46)); setc(ctx, "#FFFFFF", a * 0.07); ctx.fill()
                ctx.new_path(); tri(343, 250, 40, -1); tri(395, 250, 40, -1)
                ctx.set_line_join(cairo.LINE_JOIN_ROUND); ctx.set_line_width(10); setc(ctx, "#101010", a); ctx.stroke_preserve(); setc(ctx, "#FFFFFF", a); ctx.fill()

    def cta(self, ctx, t):
        """cartão final: SABIA? COMENTE “X” / NÃO SABIA? COMENTE “Y”"""
        c = self.ev.get("cta")
        if not c or t < c["t0"]: return
        linhas = [("SABIA? COMENTE", 34, "#FFFFFF", 0.0, 196), (f"“{c['a']}”", 62, AM, 0.18, 262), ("NÃO SABIA? COMENTE", 34, "#FFFFFF", 0.9, 338), (f"“{c['b']}”", 62, AM, 1.08, 404)]
        for txt, sz, cor, d, y in linhas:
            k = back_out(clamp((t - c["t0"] - d) / 0.3))
            if k <= 0: continue
            ctx.save(); ctx.translate(360, y); ctx.rotate(-0.045); ctx.scale(k, k); outlined_text(ctx, txt, 0, 0, sz, fill=cor, stroke="#1A1206", sw=sz * 0.22, maxw=640); ctx.restore()

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
        self.icones(ctx, t, f); self.marcas(ctx, t, P); self.notas(ctx, t, P); self.medidas(ctx, t, P); self.rotulos(ctx, t, P); self.cta(ctx, t); self.legenda(ctx, t); self.selo(ctx, t)
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
