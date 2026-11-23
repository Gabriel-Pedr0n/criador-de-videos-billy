"""Efeitos sonoros sintetizados (sem arquivos externos). Cada nome de evento do motor vira um som."""
import numpy as np, wave

SR = 48000
_rng = np.random.default_rng(5)


def _t(d): return np.arange(int(SR * d)) / SR
def _env(n, att=0.005, p=3):
    x = np.linspace(0, 1, n); return np.minimum(1, x / max(att, 1e-4)) * (1 - x) ** p
def _lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def _hp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (fc / np.maximum(f, 1)) ** 4), len(x))
def _noise(n): return _rng.standard_normal(n)
def _n(x): return x / (np.max(np.abs(x)) + 1e-9)
def _fade(x, d=0.25):
    k = min(len(x) // 2, int(SR * d)); r = np.linspace(0, 1, k); x = x.copy(); x[:k] *= r; x[-k:] *= r[::-1]; return x


def tum(d=0.22):
    t = _t(d); return _n(np.sin(2 * np.pi * (140 * np.exp(-t * 18) + 55) * t) * _env(len(t), 0.003, 3) + 0.25 * _lp(_noise(len(t)), 900) * _env(len(t), 0.002, 8))
def bloco(d=0.12):
    t = _t(d); return _n(_lp(_noise(len(t)), 1800) * _env(len(t), 0.002, 6) + 0.6 * np.sin(2 * np.pi * 210 * t) * _env(len(t), 0.002, 5))
def pop(d=0.12):
    t = _t(d); return _n(np.sin(2 * np.pi * (420 + 900 * t / d) * t) * _env(len(t), 0.004, 2.5))
def sobe(d=0.4):
    t = _t(d); return _n(np.sin(2 * np.pi * (220 + 380 * (t / d) ** 2) * t) * np.sin(np.pi * t / d) ** 2) * 0.7
def encaixe(d=0.09):
    t = _t(d); return _n(_hp(_noise(len(t)), 1800) * _env(len(t), 0.001, 9) + 0.5 * np.sin(2 * np.pi * 950 * t) * _env(len(t), 0.001, 7))
def tick(d=0.05):
    t = _t(d); return _n(np.sin(2 * np.pi * 1700 * t) * _env(len(t), 0.001, 5))
def brilho(d=0.5):
    t = _t(d); return _n(sum(np.sin(2 * np.pi * f * t) * _env(len(t), 0.01, 2 + i) for i, f in enumerate((1320, 1760, 2640)))) * 0.6
def termo(d=0.28):
    t = _t(d); return _n(np.sin(2 * np.pi * 880 * t) * _env(len(t), 0.004, 3) + 0.6 * np.sin(2 * np.pi * 1320 * t) * _env(len(t), 0.03, 3)) * 0.7
def ding(d=0.7):
    t = _t(d); a = np.sin(2 * np.pi * 1047 * t) * _env(len(t), 0.003, 3); n2 = int(SR * 0.11); b = np.zeros(len(t)); tb = t[:len(t) - n2]
    b[n2:] = np.sin(2 * np.pi * 1568 * tb) * _env(len(tb), 0.003, 3); return _n(a + b)
def erro(d=0.38):
    t = _t(d); s = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sin(2 * np.pi * 112 * t); return _n(_lp(s, 1400) * _env(len(t), 0.005, 1.2))
def whoosh(d=0.5):
    n = int(SR * d); x = _noise(n); y = np.zeros(n); hop = 1024; win = np.hanning(2 * hop)
    for s in range(0, n - 2 * hop, hop):
        fc = 400 + 2200 * (s / n); X = np.fft.rfft(x[s:s + 2 * hop] * win); f = np.fft.rfftfreq(2 * hop, 1 / SR)
        y[s:s + 2 * hop] += np.fft.irfft(X * np.exp(-(np.log(np.maximum(f, 1) / fc)) ** 2 / 0.5), 2 * hop)
    return _n(y) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
def parafuso(d=0.5):
    t = _t(d); cl = (np.sin(2 * np.pi * 26 * t) > 0.9).astype(float); return _n(_hp(_noise(len(t)), 2500) * cl * np.sin(np.pi * t / d))
def splash(d=0.5):
    t = _t(d); return _n(_hp(_lp(_noise(len(t)), 5000), 500) * _env(len(t), 0.01, 2.5))
def chuva(d=3.0):
    n = int(SR * d); return _fade(_n(_hp(_lp(_noise(n), 7000), 1200)) * 0.5, 0.5)
def agua(d=2.0):
    n = int(SR * d); t = _t(d); m = 0.6 + 0.4 * np.sin(2 * np.pi * 7 * t + 3 * np.sin(2 * np.pi * 1.3 * t)); return _fade(_n(_hp(_lp(_noise(n), 3500), 400) * m) * 0.55, 0.3)
def concreto(d=2.0):
    n = int(SR * d); t = _t(d); return _fade(_n(_lp(_noise(n), 420) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t))) * 0.8, 0.3)
def motor(d=2.0):
    t = _t(d); return _fade(_n(_lp(np.sign(np.sin(2 * np.pi * 42 * t)) + 0.4 * _noise(len(t)), 500)) * 0.6, 0.3)
def fanfarra(d=1.1):
    t = _t(d); out = np.zeros(len(t))
    for i, f in enumerate((523, 659, 784, 1047)):
        k = int(SR * 0.11 * i); tt = t[:len(t) - k]; out[k:] += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * _env(len(tt), 0.005, 2.2)
    return _n(out) * 0.8


def rebobina(d=0.8):
    t = _t(d); f = 300 + 900 * (t / d) ** 1.5; ph = 2 * np.pi * np.cumsum(f) / SR; w = np.sin(ph) * (0.6 + 0.4 * np.sin(2 * np.pi * 34 * t)); return _fade(_n(w + 0.5 * _hp(_noise(len(t)), 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 21 * t))) * 0.7, 0.06)
def acelera(d=1.5):
    t = _t(d); cl = (np.sin(2 * np.pi * 15 * t) > 0.82).astype(float); return _fade(_n(_hp(_noise(len(t)), 1800) * cl + 0.3 * np.sin(2 * np.pi * 1250 * t) * cl) * 0.5, 0.1)
def vento(d=2.5):
    n = int(SR * d); t = _t(d); m = 0.55 + 0.45 * np.sin(2 * np.pi * 0.7 * t + 1.0); return _fade(_n(_lp(_hp(_noise(n), 250), 1100) * m) * 0.8, 0.5)
def desaba(d=1.3):
    t = _t(d); n = len(t); r = _lp(_noise(n), 260) * _env(n, 0.02, 1.6); cr = np.zeros(n)
    for k in range(14):
        i = int(_rng.uniform(0, 0.75) * n); m = min(n - i, int(SR * 0.09)); cr[i:i + m] += _lp(_noise(m), 2400) * _env(m, 0.002, 5) * _rng.uniform(0.4, 1.0)
    return _n(r * 1.4 + cr)
def pinga(d=0.12):
    t = _t(d); return _n(np.sin(2 * np.pi * (900 + 1400 * t / d) * t) * _env(len(t), 0.004, 3))
def passo(d=0.07):
    t = _t(d); return _n(_lp(_noise(len(t)), 700) * _env(len(t), 0.002, 5) + 0.4 * np.sin(2 * np.pi * 120 * t) * _env(len(t), 0.002, 5))

def faisca(d=0.35):
    t = _t(d); n = len(t); x = _hp(_noise(n), 2500) * (np.abs(_noise(n)) > 1.6)
    return _n(x * _env(n, 0.001, 2) + 0.3 * np.sign(np.sin(2 * np.pi * 120 * t)) * _hp(_noise(n), 3000) * _env(n, 0.001, 4))
def clique(d=0.08):
    t = _t(d); return _n(_hp(_noise(len(t)), 900) * _env(len(t), 0.0005, 14) + 0.7 * np.sin(2 * np.pi * 620 * t) * _env(len(t), 0.0005, 10))
def fogo(d=2.0):
    n = int(SR * d); x = _lp(_noise(n), 900) * 0.5 + _hp(_noise(n), 2000) * (np.abs(_noise(n)) > 2.4) * 1.4; return _fade(_n(x) * 0.7, 0.3)
def zumbido(d=2.0):
    t = _t(d); return _fade(_n(np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120 * t) + 0.25 * np.sign(np.sin(2 * np.pi * 180 * t))) * 0.45, 0.3)


LOOPS = {"chuva": chuva, "agua": agua, "concreto": concreto, "motor": motor, "rebobina": rebobina, "acelera": acelera, "vento": vento, "fogo": fogo, "zumbido": zumbido}
SONS = {"tum": tum, "bloco": bloco, "pop": pop, "sobe": sobe, "encaixe": encaixe, "tick": tick, "brilho": brilho, "termo": termo, "ding": ding,
        "erro": erro, "whoosh": whoosh, "parafuso": parafuso, "splash": splash, "fanfarra": fanfarra, "desaba": desaba, "pinga": pinga, "passo": passo, "faisca": faisca, "clique": clique}
GANHO = {"faisca": 0.5, "clique": 0.45, "fogo": 0.4, "zumbido": 0.18, "tum": 0.55, "bloco": 0.35, "pop": 0.4, "sobe": 0.3, "encaixe": 0.45, "tick": 0.25, "brilho": 0.3, "termo": 0.32, "ding": 0.5, "erro": 0.45,
         "whoosh": 0.3, "parafuso": 0.35, "splash": 0.45, "fanfarra": 0.5, "chuva": 0.35, "agua": 0.4, "concreto": 0.45, "motor": 0.35,
         "rebobina": 0.4, "acelera": 0.22, "vento": 0.4, "desaba": 0.7, "pinga": 0.3, "passo": 0.18}


# ---------------------------------------------------------------- VOZ DO BILLY: barulhos de comunicação, SEM palavras
# Voz fininha de desenho: fonte glotal (dente de serra suave) com f0 variável + vibrato, filtrada por formantes que se movem (vogais).
VOGAIS = {"i": (300, 2500, 3300), "u": (320, 800, 2400), "a": (850, 1300, 2800), "o": (500, 900, 2600), "e": (480, 2000, 2900), "m": (250, 1100, 2200), "w": (310, 760, 2300)}


def _contorno(pontos, n):
    xs = np.linspace(0, 1, len(pontos)); return np.interp(np.linspace(0, 1, n), xs, pontos)


def _voz(d, f0, vogais, amp=None, vib=(6.0, 0.025), sopro=0.04, am=None):
    """f0 e vogais são listas de pontos (interpoladas ao longo de d). amp: lista de envoltória. am: (freq Hz, profundidade) de tremor."""
    n = int(SR * d); t = _t(d); f = _contorno(f0, n)
    f = f * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t) * np.minimum(1, t / 0.25))
    fase = np.cumsum(f) / SR; fonte = 2 * (fase % 1) - 1; fonte = fonte - np.mean(fonte)
    fonte = _lp(fonte, 7000) + sopro * _noise(n)
    F = np.array([VOGAIS[v] for v in vogais], float); F = np.stack([_contorno(F[:, k], n) for k in range(3)], 1)
    hop = 512; jan = np.hanning(2 * hop); y = np.zeros(n + 2 * hop)
    for st in range(0, n - 2 * hop, hop):
        X = np.fft.rfft(fonte[st:st + 2 * hop] * jan); fr = np.fft.rfftfreq(2 * hop, 1 / SR); lf = np.log(np.maximum(fr, 30)); env = np.zeros_like(fr)
        for k, (g, bw) in enumerate(((1.0, 0.16), (0.8, 0.14), (0.4, 0.12))):
            fc = F[min(n - 1, st + hop), k]; env += g * np.exp(-(lf - np.log(fc)) ** 2 / (2 * bw ** 2))
        y[st:st + 2 * hop] += np.fft.irfft(X * (0.04 + env), 2 * hop)
    y = y[:n]
    e = _contorno(amp or [0, 1, 1, 0.8, 0], n); e = e * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.06)
    if am: e = e * (1 - am[1] + am[1] * (0.5 + 0.5 * np.sin(2 * np.pi * am[0] * t)))
    return _n(y) * e


def v_wii(d=1.2):       # "wiiiiii" de escorregador: sobe rápido e desce longo, com vibrato
    return _voz(d, [620, 1050, 1000, 900, 760, 640], ["w", "i", "i", "i", "i", "i"], [0, 1, 1, 1, 0.9, 0.5, 0], vib=(7.0, 0.03))
def v_uhu(d=0.7):       # "uhuuu!" de alegria
    return _voz(d, [520, 640, 1000, 1150, 1000], ["u", "u", "u", "o", "u"], [0, 1, 0.9, 1, 0.5, 0], vib=(7.5, 0.035))
def v_hum(d=0.5):       # "hmm?" curioso, nasal subindo
    return _voz(d, [330, 340, 440], ["m", "m", "m"], [0, 1, 1, 0.3], vib=(5, 0.01), sopro=0.02)
def v_ops(d=0.35):      # "ops!" de susto leve, cai
    return _voz(d, [900, 620, 470], ["o", "o", "u"], [0, 1, 0.7, 0])
def v_ai(d=0.4):        # "aaai" de dor/susto
    return _voz(d, [700, 1000, 880], ["a", "a", "i"], [0, 1, 1, 0.4, 0], vib=(8, 0.04))
def v_uau(d=0.75):      # "uaaaau" de admiração
    return _voz(d, [500, 700, 950, 800, 600], ["u", "a", "a", "a", "u"], [0, 0.9, 1, 1, 0.8, 0], vib=(6, 0.03))
def v_brr(d=0.8):       # "brrrr" de frio: tremido
    return _voz(d, [380, 400, 390, 380], ["u", "u", "u", "u"], [0, 1, 1, 0.8, 0], vib=(2, 0.02), sopro=0.18, am=(22, 0.8))
def v_haha(d=0.8):      # risadinha "ha-ha-ha"
    return _voz(d, [620, 560, 640, 580, 520], ["a", "a", "a", "a", "a"], [0, 1, 1, 0.9, 0.7, 0], vib=(1, 0.01), sopro=0.1, am=(9, 0.9))
def v_ufa(d=0.7):       # "fuuuu" de alívio: sopro
    n = int(SR * d); t = _t(d); b = _hp(_lp(_noise(n), 2600), 600) * np.sin(np.pi * t / d) ** 1.5
    return _n(b) * 0.8 + 0.2 * _voz(d, [420, 360, 300], ["u", "u", "u"], [0, 1, 0.6, 0], sopro=0.3)
def v_eba(d=0.5):       # "êêba!" curto e subindo
    return _voz(d, [620, 900, 1050, 900], ["e", "e", "a", "a"], [0, 1, 1, 0.4, 0], vib=(7, 0.03))


VOZES = {"wii": v_wii, "uhu": v_uhu, "hum": v_hum, "ops": v_ops, "ai": v_ai, "uau": v_uau, "brr": v_brr, "haha": v_haha, "ufa": v_ufa, "eba": v_eba}
DUR_VOZ = {"wii": 1.2, "uhu": 0.7, "hum": 0.5, "ops": 0.35, "ai": 0.4, "uau": 0.75, "brr": 0.8, "haha": 0.8, "ufa": 0.7, "eba": 0.5}


def montar(sons, dur, saida):
    out = np.zeros(int(SR * (dur + 0.5))); desconhecidos = set()
    for s in sons:
        nome = s["nome"]
        if nome.startswith("v_") and nome[2:] in VOZES: nm = nome[2:]; sig = VOZES[nm](max(0.2, s.get("dur") or DUR_VOZ[nm]))
        elif nome in LOOPS: sig = LOOPS[nome](max(0.4, s.get("dur") or 1.5))
        elif nome in SONS: sig = SONS[nome]()
        else: desconhecidos.add(nome); continue
        i = int(max(0, s["t"]) * SR)
        if i >= len(out): continue
        e = min(len(out), i + len(sig)); out[i:e] += sig[:e - i] * GANHO.get(nome, 0.55 if nome.startswith("v_") else 0.4) * s.get("g", 1)
    out = np.tanh(out * 1.2) / 1.2
    w = wave.open(saida, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32000).astype(np.int16).tobytes()); w.close()
    return sorted(desconhecidos)
