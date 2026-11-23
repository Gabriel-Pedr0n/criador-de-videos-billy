"""Alinhamento palavra a palavra (sem depender de reconhecimento de fala):
usa as pausas reais do áudio + pontuação do texto + contagem de sílabas."""
import re, wave, bisect
import numpy as np

FR = 0.01


def silabas(w):
    w = re.sub(r'[^a-zà-ú\-]', '', w.lower())
    n = 0
    for x in re.findall(r'[aeiouáéíóúâêôãõàü]+', w):
        n += 1
        if len(x) >= 2 and re.search(r'[aeoáéóâêô][aeoáéóâêô]', x):
            n += 1
    return max(1, n)


def palavras(texto):
    out = []
    for tok in texto.split():
        if re.search(r'[0-9A-Za-zÀ-ú]', tok):
            out.append(tok)
        elif out:
            out[-1] += tok          # pontuação solta gruda na palavra anterior
    return out


def energia(wav):
    w = wave.open(wav); sr = w.getframerate(); ch = w.getnchannels()
    a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    if ch > 1:
        a = a.reshape(-1, ch).mean(1)
    hop = int(sr * FR); n = len(a) // hop
    e = np.sqrt(np.mean(a[:n * hop].reshape(n, hop) ** 2, axis=1))
    return 20 * np.log10(e + 1e-9), a, sr


def estimar(texto, taxa=5.0, vel=1.0):
    """Sem áudio: estima tempos (sílabas/s + pausas na pontuação). vel = velocidade da narração (1.15 = 15% mais rápida)."""
    W = palavras(texto); t = 0.08; out = []
    for w in W:
        d = silabas(w) / (taxa * 1.18 * vel)
        out.append([w, round(t, 3), round(t + d, 3)]); t += d
        if re.search(r'[.?!:…]$', w): t += 0.38 / vel
        elif w.endswith((',', ';')): t += 0.16 / vel
    return out, round(t + 0.05, 3)


def alinhar(wav, texto, thr=-40.0):
    W = palavras(texto)
    db, _, _ = energia(wav)
    try:
        return _dp(W, db, thr)
    except Exception:
        return _uniforme(W, db, thr)


def _uniforme(W, db, thr):
    sp = db >= thr; idx = np.nonzero(sp)[0]
    S = np.array([silabas(w) for w in W], float); cs = np.concatenate([[0], np.cumsum(S)]); out = []
    for i, w in enumerate(W):
        a = idx[min(len(idx) - 1, int(cs[i] / cs[-1] * len(idx)))]; b = idx[min(len(idx) - 1, max(0, int(cs[i + 1] / cs[-1] * len(idx)) - 1))] + 1
        out.append([w, round(a * FR, 3), round(b * FR, 3)])
    return out


def _dp(words, db, thr):
    S = np.array([silabas(w) for w in words], float)
    brk = [2 if re.search(r'[.?!:…]$', w) else 1 if w.endswith((',', ';')) else 0 for w in words]
    sp = db >= thr; n = len(db)
    P = []; i = 0
    while i < n:
        if not sp[i]:
            j = i
            while j < n and not sp[j]: j += 1
            if (j - i) * FR >= 0.12: P.append((i, j))
            i = j
        else: i += 1
    start = int(np.argmax(sp)); end = n - int(np.argmax(sp[::-1]))
    P = [(a, b) for a, b in P if a > start and b < end]
    B = [k for k in range(len(words) - 1) if brk[k] > 0]
    cs = np.concatenate([[0], np.cumsum(S)]); spc = np.concatenate([[0], np.cumsum(sp)])
    rate = cs[-1] / max(1, spc[end] - spc[start]); INF = 1e18

    def cost(w0, w1, f0, f1, skipped):
        s = cs[w1] - cs[w0]; t = spc[f1] - spc[f0]
        if t <= 5: return INF
        c = (np.log((s / t) / rate)) ** 2 * s
        for (a, b) in P:
            if a > f0 + 2 and b < f1 - 2: c += max(0, (b - a) * FR - 0.18) * 40
        for k in skipped: c += 8 if brk[k] == 2 else 0.5
        return c
    nb = len(B); npz = len(P); pmid = [(a + b) // 2 for a, b in P]
    best = {(-1, -1): (0, None)}

    def exp_pj(k):
        return bisect.bisect_left(pmid, start + (cs[k + 1] / cs[-1]) * (end - start))
    for bi in range(nb):
        k = B[bi]; e = exp_pj(k)
        for pj in range(max(0, e - 45), min(npz, e + 45)):
            f = pmid[pj]; bc = INF; arg = None
            for pb in range(max(-1, bi - 4), bi):
                for pp in ([-1] if pb == -1 else range(max(0, pj - 14), pj)):
                    if (pb, pp) not in best: continue
                    w0 = 0 if pb == -1 else B[pb] + 1; f0 = start if pp == -1 else pmid[pp]
                    if f - f0 > 1500 or f <= f0: continue
                    c = best[(pb, pp)][0] + cost(w0, k + 1, f0, f, [B[x] for x in range(pb + 1, bi)])
                    if c < bc: bc = c; arg = (pb, pp)
            if arg is not None: best[(bi, pj)] = (bc, arg)
    bc = INF; arg = None
    for (pb, pp), (v, _) in best.items():
        if nb - 1 - pb > 4: continue
        w0 = 0 if pb == -1 else B[pb] + 1; f0 = start if pp == -1 else pmid[pp]
        c = v + cost(w0, len(words), f0, end, [B[x] for x in range(pb + 1, nb)])
        if c < bc: bc = c; arg = (pb, pp)
    if arg is None: raise RuntimeError('sem caminho')
    path = []; cur = arg
    while cur != (-1, -1): path.append(cur); cur = best[cur][1]
    path = path[::-1]
    out = []; w0 = 0; fprev = start
    for (w1, (pa, pb)) in [(B[b] + 1, P[p]) for b, p in path] + [(len(words), (end, end))]:
        fe = pa if w1 < len(words) else end
        idx = [i for i in range(fprev, fe) if sp[i]] or [fprev]
        tot = cs[w1] - cs[w0]
        for w in range(w0, w1):
            a = (cs[w] - cs[w0]) / tot; b = (cs[w + 1] - cs[w0]) / tot
            ia = idx[min(len(idx) - 1, int(a * len(idx)))]; ib = idx[min(len(idx) - 1, max(0, int(b * len(idx)) - 1))] + 1
            out.append([words[w], round(ia * FR, 3), round(ib * FR, 3)])
        w0 = w1; fprev = pb
    return out
