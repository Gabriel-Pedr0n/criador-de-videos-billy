#!/usr/bin/env python3
"""MUNDO EM CAMADAS — sistema "VOCÊ CONSTRÓI" (v2)

  mec.py novo <slug> "<título>" [--blocos 5]   cria o projeto (projeto.json + cena.js modelo)
  mec.py roteiro <slug>                        AVALIA o roteiro pela fórmula viral + gera os textos por bloco p/ ElevenLabs + duração
  mec.py audio <slug> [mp3 ...] [--velocidade 1.15] [--acelerar]   recebe os mp3 (na ordem dos blocos), ajusta o ritmo, alinha palavra a palavra
  mec.py previa <slug> <N|todos> [--rapida]    renderiza a PRÉVIA de um bloco (com legenda, etiquetas e sons) + revisão
  mec.py inspecionar <slug> <N|todos>          só a inspeção automática (objetos atravessando, flutuando, câmera, personagem, ações)
  mec.py form <slug>                           gera o formulário de avaliação (APROVADO / ALTERAR por bloco)
  mec.py aprovar <slug> <N ...>                marca blocos como aprovados
  mec.py alterar <slug> <N> "<o que mudar>"    registra um pedido de alteração do bloco
  mec.py status <slug>                         mostra a situação de cada bloco
  mec.py final <slug> [--saida DIR]            junta os blocos aprovados: mp4 1080x1920 + .srt + revisão
  mec.py foto <slug> <t ...>                   quadros soltos (com legenda) para conferência / thumbnail
"""
import argparse, datetime, glob, hashlib, json, os, shutil, socket, subprocess, sys, time, wave
import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__)); LIB = os.path.join(BASE, "lib"); sys.path.insert(0, LIB)
import alinhar as AL, sfx as SFX

FPS = 30; GAP = 0.22; CAUDA = 0.7; ENTRADA = 0.12; LIMITE = 100.0
PY = sys.executable


_PASTAS_OK = set()
def P(slug, *a):
    if slug not in _PASTAS_OK:
        _PASTAS_OK.add(slug)
        if os.path.isdir(os.path.join(BASE, "projetos", slug)):
            for sub in ("narracao", "audio", "previas", "quadros", "final", "modelos"): os.makedirs(os.path.join(BASE, "projetos", slug, sub), exist_ok=True)
    return os.path.join(BASE, "projetos", slug, *a)
def jl(p, d=None): return json.load(open(p)) if os.path.exists(p) else d
def jd(o, p): json.dump(o, open(p, "w"), ensure_ascii=False, indent=1)
def mmss(s): return f"{int(s // 60)}:{s % 60:04.1f}"
def sh(cmd, **k): return subprocess.run(cmd, check=True, **k)
def dur_de(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).strip())


def fontes():
    d = os.path.expanduser("~/.fonts"); os.makedirs(d, exist_ok=True); novo = False
    for f in glob.glob(os.path.join(BASE, "fonts", "*.ttf")):
        if not os.path.exists(os.path.join(d, os.path.basename(f))): shutil.copy(f, d); novo = True
    if novo: subprocess.run(["fc-cache", "-f"], capture_output=True)


def estado(slug):
    e = jl(P(slug, "estado.json"), {"blocos": {}, "historico": []})
    for b in jl(P(slug, "projeto.json"))["blocos"]: e["blocos"].setdefault(str(b["id"]), {"status": "sem prévia", "pedidos": []})
    return e


def log(slug, e, txt):
    e["historico"].append({"quando": datetime.datetime.now().strftime("%d/%m %H:%M"), "o_que": txt}); jd(e, P(slug, "estado.json"))


# ====================================================================== NOVO
CENA_MODELO = '''// CENA do projeto "{titulo}"
// E = motor (tempo, ações, câmera, personagem)   K = kit de peças.   Lista completa no MANUAL.md.
// Tempos: "2:palavra" = instante em que a palavra é falada no bloco 2.  ["2:palavra", 0.3] = 0,3 s depois.
export default async function (E, K) {{
  const C = K.COR;
  K.mundoBairro({{ lote: {{ x0: -6, x1: 6, z0: -5, z1: 5 }} }});       // ou K.mundoCampo() / K.mundoInterno()
  const m = E.mascote({{ pos: [-2, 0, 2], rotY: 0.4 }});               // o "você" do vídeo: aparece do começo ao fim

  // ---------------- BLOCO 1: GANCHO (jeito óbvio -> desastre -> ◀◀) + 1º ciclo ----------------
  // const muro = K.em(K.blocos({{ cols: 10, fiadas: 8, cor: C.tijolo }}), 0, 0, 0, "parede errada");
  // E.acelera("1:ini", "1:palavra");  E.constroi(muro, "1:ini", "1:palavra");
  // E.nota("TERRA FOFA", [0, 0, 0.5], "1:porque");  E.desaba(muro, "1:desastre");  E.errado(muro, "1:desastre", ["1:desastre", 1.2]);
  // E.rebobina(muro, "1:entao", ["1:entao", 0.8]);
  // ... jeito certo: E.entra(...), E.constroi(...);  nome: E.rotulo("FUNDAÇÃO", peca, "1:fundacao");  E.certo(peca, "1:fundacao>");

  // ---------------- ÚLTIMO BLOCO: humor + parabéns + comente ----------------
  // E.oculos(m, "5:parabens");  E.confete([0, 3, 0], "5:parabens");  E.cta("PEDREIRO", "SERVENTE", "5:comente");

  // ---------------- CÂMERA (um único plano contínuo; começa PERTO do personagem) ----------------
  E.camera("1:ini", [-1.2, 1.5, 4.2], [-2, 1.0, 2], 42);
  E.camera("1:fim", [5, 3, 8], [0, 0.8, 0], 46);
}}
'''


def cmd_novo(a):
    d = P(a.slug)
    if os.path.exists(d): sys.exit(f"já existe: {d}")
    for s in ("narracao", "audio", "previas", "quadros", "final", "modelos"): os.makedirs(os.path.join(d, s))
    jd({"slug": a.slug, "titulo": a.titulo, "formula": a.formula, "canal": a.canal, "voz": "Will – Deep Smooth and Affectionate (ElevenLabs v4)", "limite_s": LIMITE, "velocidade": 1.15,
        "blocos": [{"id": i + 1, "nome": f"Bloco {i + 1}", "texto": "", "termos": [], "cenas": ""} for i in range(a.blocos)]}, P(a.slug, "projeto.json"))
    open(P(a.slug, "cena.js"), "w").write(CENA_MODELO.format(titulo=a.titulo))
    print(f"projeto criado em {d}\n1) preencha projeto.json (texto, termos e cenas de cada bloco)\n2) rode: mec.py roteiro {a.slug}")


# ====================================================================== ROTEIRO / TEMPO
def montar_tempo(slug):
    proj = jl(P(slug, "projeto.json")); al = jl(P(slug, "audio", "alinhado.json"), {}); t = ENTRADA; blocos = []; est = False
    for b in proj["blocos"]:
        a = al.get(str(b["id"]))
        if a and a["texto"] == b["texto"]: pal, d = a["palavras"], a["dur"]; real = True
        else: pal, d = AL.estimar(b["texto"], vel=proj.get("velocidade", 1.0)); real = False; est = True
        blocos.append({"id": b["id"], "nome": b["nome"], "ini": round(t, 3), "fim": round(t + d, 3), "real": real,
                       "palavras": [[w, round(t + s, 3), round(t + e, 3)] for w, s, e in pal]})
        t += d + GAP
    total = round(t - GAP + CAUDA, 3)
    tempo = {"fps": FPS, "total": total, "estimado": est, "blocos": blocos}; jd(tempo, P(slug, "tempo.json")); return tempo


def tabela_tempo(proj, tempo):
    lim = proj.get("limite_s", LIMITE); out = []
    for b in tempo["blocos"]:
        d = b["fim"] - b["ini"]; n = len(b["palavras"]); aviso = "" if 12 <= d <= 24 else "  <- fora de 15–22 s"
        out.append(f"  bloco {b['id']}  {b['nome'][:28]:28s} {n:3d} palavras  {d:5.1f} s  ({'áudio real' if b['real'] else 'estimado'}){aviso}")
    out.append(f"  TOTAL: {mmss(tempo['total'])}  (limite {mmss(lim)})" + ("   *** PASSOU DO LIMITE ***" if tempo["total"] > lim else "   ok"))
    return "\n".join(out)

# ====================================================================== AVALIAÇÃO DO ROTEIRO (fórmula dos vídeos mais virais do formato)
def avaliar_roteiro(proj, tempo):
    """Confere o texto contra a fórmula: gancho "Se você… não vai ter… vai ter…", ciclos Mas → Então você → Esse é o NOME,
    "É por isso que…", toque de humor, fecho "Agora é só… Parabéns, você…", comente X / comente Y."""
    import re, unicodedata
    def nz(x): return "".join(c for c in unicodedata.normalize("NFD", x.lower()) if unicodedata.category(c) != "Mn")
    txt = " ".join(b["texto"].strip() for b in proj["blocos"]); n = nz(txt); frases = [f.strip() for f in re.split(r"(?<=[.!?…])\s+", txt) if f.strip()]
    npal = len(AL.palavras(txt)); dur = tempo["total"]; wps = npal / max(1, dur); L = []
    def item(ok, msg, grave=True): L.append((ok, grave, msg))
    ini = nz(" ".join(AL.palavras(txt)[:45]))
    if proj.get("formula") == "animal":      # fórmula "VOCÊ É UM [ANIMAL]" (canal de animais)
        item(re.match(r"voce e (um|uma)\b", ini) is not None, 'ABERTURA: "Você é um [animal]."')
        nums = len(re.findall(r"\b(\d+|meio|meia|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|cem|mil|milhao|milhoes|dobro|metade)\b", nz(" ".join(AL.palavras(txt)[3:40]))))
        item(nums >= 2, f"FICHA: 2 ou 3 números impressionantes logo na 2ª frase (tamanho, quantidade, recorde): {nums} encontrados")
        mas = len(re.findall(r"(?:^|[.!?…]\s+)mas\b", n)); pori = len(re.findall(r"(?:^|[.!?…]\s+)por isso\b", n)); nomes = len(re.findall(r"\bess[ea]s?\s+(?:e|sao)\s+(?:[oa]s?\s+)?(?:seu|sua)s?\b", n))
        item(4 <= mas <= 8, f'PROBLEMAS "Mas você / Mas basta…": {mas} (ideal 4 a 6 para 1:30)')
        item(pori >= max(1, mas - 1), f'ADAPTAÇÕES "Por isso você / Por isso cada…": {pori} (uma depois de cada "Mas")')
        item(nomes >= max(1, mas - 1), f'NOMES no fim do ciclo ("Esse é o seu…", "Essa é a sua…"): {nomes}')
        for b in proj["blocos"]:
            nb = nz(b["texto"])
            for termo in b.get("termos", []):
                mt = re.search(r"\b" + re.escape(nz(termo)) + r"\b", nb); k = mt.start() if mt else -1; antes = nb[max(0, k - 70):k] if k >= 0 else ""
                item(k >= 0 and re.search(r"\bess[ea]s?\s+(?:e|sao)\b", antes) is not None, f'bloco {b["id"]}: o termo "{termo}" vem como revelação, logo depois de "Esse é o seu / Essa é a sua"', grave=False)
        fim = nz(" ".join(AL.palavras(txt)[-45:]))
        item("nao e so" in fim, 'FECHO, 1ª parte: "[Animal] não é só [o que todo mundo acha]."')
        item(re.search(r"construid[oa] para|feit[oa] para", fim) is not None, 'FECHO, 2ª parte: "É um corpo inteiro construído para [3 verbos]."')
        item(re.search(r"\bcomente\b", n) is None, "SEM pedido de comentário na narração (as referências terminam no fecho; o pedido vai na legenda)", grave=False)
        item(2.8 <= wps <= 3.6, f"RITMO: {npal} palavras em {mmss(dur)} = {wps:.1f} palavras/s (ideal 2,8 a 3,6)", grave=False)
        longas = [f for f in frases if len(f.split()) > 30]
        item(not longas, f"FRASES CURTAS: {len(longas)} frase(s) com mais de 30 palavras" + (f' — ex.: "{longas[0][:60]}…"' if longas else ""), grave=False)
        if mas: item(30 <= (npal - 50) / mas <= 60, f"TAMANHO DO CICLO: ~{(npal - 50) / mas:.0f} palavras por ciclo (referências: 40 a 50)", grave=False)
        return L
    item(ini.startswith("se voce"), 'GANCHO começa com "Se você [fizer o óbvio]…"')
    item("nao vai ter" in ini and re.search(r"\bvai ter\b", ini.split("nao vai ter", 1)[-1] if "nao vai ter" in ini else "") is not None, 'GANCHO promete o desastre: "…você não vai ter X. Vai ter [desastre]."')
    item("porque" in ini, 'GANCHO explica a causa logo em seguida ("Porque…")')
    ciclos = len(re.findall(r"(?:^|[.!?…]\s+)entao\b", n)); mas = len(re.findall(r"(?:^|[.!?…]\s+)mas\b", n)); nomes = len(re.findall(r"\bess[ea]s?\s+(?:e|sao)\b", n))
    item(4 <= ciclos <= 9, f'CICLOS "Então você…": {ciclos} (ideal 5 a 7 para 1:40)')
    item(mas >= max(1, ciclos - 1), f'PROBLEMAS "Mas…": {mas} (um antes de cada "Então")')
    item(nomes >= max(1, ciclos - 1), f'NOMES TÉCNICOS no fim do ciclo ("Esse é o…", "Essa é a…"): {nomes}')
    for b in proj["blocos"]:
        nb = nz(b["texto"])
        for termo in b.get("termos", []):
            mt = re.search(r"\b" + re.escape(nz(termo)) + r"\b", nb); k = mt.start() if mt else -1; antes = nb[max(0, k - 70):k] if k >= 0 else ""
            item(k >= 0 and re.search(r"\bess[ea]s?\s+(?:e|sao)\b", antes) is not None, f'bloco {b["id"]}: o termo "{termo}" vem como revelação, logo depois de "Esse é / Essa é"', grave=False)
    pi = len(re.findall(r"e por isso que", n)); item(pi >= 1, f'"É POR ISSO QUE…" (liga com o dia a dia de quem assiste): {pi} (ideal 2 ou 3)')
    item(re.search(r"(?:^|[.!?…]\s+)coloque\b", n) is not None, 'TOQUE DE HUMOR antes do fim ("Coloque… e um vizinho que…")', grave=False)
    item("agora e so" in n and "parabens, voce" in n, 'FECHO: "Agora é só… Parabéns, você [construiu/instalou]…"')
    if proj.get("fecho") == "parabens":      # Billy Constrói: o vídeo TERMINA no "Parabéns, você construiu X." (sem comente, sem segue)
        item(re.search(r"\bcomente\b", n) is None, 'SEM pedido de comentário na narração (o vídeo termina no "Parabéns, você construiu…")')
        item(" ".join(AL.palavras(txt)[-8:]).lower().find("parab") >= 0, 'O ÚLTIMO trecho é o "Parabéns, você construiu X." (nada depois dele)')
    else:
        item(len(re.findall(r"\bcomente\b", n)) >= 2, 'COMENTÁRIO de duas palavras: "Se você já sabia, comente X. Se não sabia, comente Y."')
    item("mundo em camadas" not in n and "se inscreva" not in n and "siga o" not in n, 'SEM CHAMADA no fim (nada de "segue / se inscreva no Mundo em Camadas" — pedido do dono do canal): o vídeo termina no "comente"')
    item(3.0 <= wps <= 3.8, f"RITMO: {npal} palavras em {mmss(dur)} = {wps:.1f} palavras/s (referências: 3,6; ideal 3,0 a 3,8)", grave=False)
    longas = [f for f in frases if len(f.split()) > 30]
    item(not longas, f"FRASES CURTAS: {len(longas)} frase(s) com mais de 30 palavras" + (f' — ex.: "{longas[0][:60]}…"' if longas else ""), grave=False)
    if ciclos: item(30 <= (npal - 70) / ciclos <= 55, f"TAMANHO DO CICLO: ~{(npal - 70) / ciclos:.0f} palavras por ciclo (referências: 40 a 45)", grave=False)
    return L


def texto_avaliacao(L):
    out = ["AVALIAÇÃO DO ROTEIRO (fórmula viral):"] + [f"  {'✓' if ok else ('✗' if grave else '!')} {msg}" for ok, grave, msg in L]
    nf = sum(1 for ok, grave, _ in L if not ok and grave)
    out.append("  -> roteiro dentro da fórmula" if nf == 0 else f"  -> {nf} ponto(s) obrigatório(s) faltando: reescreva antes de gravar a narração")
    return "\n".join(out)


def cmd_roteiro(a):
    proj = jl(P(a.slug, "projeto.json")); tempo = montar_tempo(a.slug); md = [f"# {proj['titulo']}", "", f"Voz: {proj['voz']}", "", "| Bloco | Nome | O que aparece | Termos técnicos | Duração |", "|---|---|---|---|---|"]
    for b, tb in zip(proj["blocos"], tempo["blocos"]):
        md.append(f"| {b['id']} | {b['nome']} | {b.get('cenas', '')} | {', '.join(b.get('termos', []))} | ~{tb['fim'] - tb['ini']:.0f} s |")
    md += ["", f"**Total estimado: {mmss(tempo['total'])}** (limite {mmss(proj.get('limite_s', LIMITE))})", ""]
    for b, tb in zip(proj["blocos"], tempo["blocos"]):
        open(P(a.slug, "narracao", f"bloco_{b['id']}.txt"), "w").write(b["texto"].strip() + "\n")
        md += [f"## Bloco {b['id']} — {b['nome']}  ({len(tb['palavras'])} palavras, ~{tb['fim'] - tb['ini']:.0f} s)", "", "```", b["texto"].strip(), "```", ""]
    av = texto_avaliacao(avaliar_roteiro(proj, tempo)); md += ["## Avaliação do sistema", "", "```", av, "```", ""]
    open(P(a.slug, "ROTEIRO.md"), "w").write("\n".join(md)); print(av); print(tabela_tempo(proj, tempo)); print("textos em", P(a.slug, "narracao"), "| roteiro em", P(a.slug, "ROTEIRO.md"))


# ====================================================================== ÁUDIO
def cmd_audio(a):
    proj = jl(P(a.slug, "projeto.json")); ad = P(a.slug, "audio")
    for i, f in enumerate(a.arquivos):
        if i < len(proj["blocos"]): shutil.copy(f, os.path.join(ad, f"bloco_{proj['blocos'][i]['id']}.mp3"))
    al = {}; brutos = {}
    for b in proj["blocos"]:
        src = os.path.join(ad, f"bloco_{b['id']}.mp3")
        if not os.path.exists(src): continue
        raw = os.path.join(ad, f"bruto_{b['id']}.wav"); sh(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "48000", raw]); brutos[b["id"]] = raw
    if not brutos: sys.exit("nenhum mp3 em " + ad + "  (esperado: bloco_1.mp3, bloco_2.mp3, ...)")
    fator = min(1.3, max(1.0, a.velocidade or proj.get("velocidade_audio", 1.0)))
    if a.velocidade: proj["velocidade_audio"] = fator; jd(proj, P(a.slug, "projeto.json"))
    for tentativa in range(2):
        al = {}
        for b in proj["blocos"]:
            if b["id"] not in brutos: continue
            db, x, sr = AL.energia(brutos[b["id"]]); fala = np.nonzero(db >= -40)[0]
            i0 = max(0, int((fala[0] * 0.01 - 0.06) * sr)); i1 = min(len(x), int((fala[-1] * 0.01 + 0.16) * sr))
            wav = os.path.join(ad, f"bloco_{b['id']}.wav"); tmp = wav + ".cut.wav"
            w = wave.open(tmp, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x[i0:i1] * 32767).astype(np.int16).tobytes()); w.close()
            if fator > 1.001: sh(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"atempo={fator:.4f}", wav]); os.remove(tmp)
            else: os.replace(tmp, wav)
            al[str(b["id"])] = {"texto": b["texto"], "dur": round(dur_de(wav), 3), "palavras": AL.alinhar(wav, b["texto"])}
        jd(al, os.path.join(ad, "alinhado.json")); tempo = montar_tempo(a.slug); lim = proj.get("limite_s", LIMITE)
        if tempo["total"] > lim and a.acelerar and tentativa == 0:
            fator = fator * min(1.08, tempo["total"] / (lim - 0.5)); print(f"passou do limite: narração {100 * (fator - 1):.1f}% mais rápida que o arquivo original"); continue
        break
    # trilha única de narração
    out = np.zeros(int(48000 * (tempo["total"] + 0.5)))
    for tb in tempo["blocos"]:
        f = os.path.join(ad, f"bloco_{tb['id']}.wav")
        if not os.path.exists(f) or not tb["real"]: continue
        _, x, sr = AL.energia(f); i = int(tb["ini"] * 48000); out[i:i + len(x)] += x[:len(out) - i]
    w = wave.open(os.path.join(ad, "narracao.wav"), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    print(tabela_tempo(proj, tempo))
    npal = sum(len(b["palavras"]) for b in tempo["blocos"]); wps = npal / tempo["total"]
    print(f"  ritmo: {wps:.1f} palavras/s" + (f"  (narração acelerada {100 * (fator - 1):.0f}%)" if fator > 1.001 else "") + ("   <- lento para o formato (referências: 3,6). Use --velocidade 1.15 ou aumente a velocidade no ElevenLabs." if wps < 3.0 else ""))
    if tempo["total"] > lim:
        exc = tempo["total"] - lim
        print(f"\n*** {exc:.1f} s acima do limite. NÃO renderize ainda. Opções: (a) rodar de novo com --acelerar (até 8% mais rápido, ganha ~{tempo['total'] * 0.074:.1f} s);"
              f" (b) cortar ~{int(exc * 2.7) + 1} palavras do roteiro e regravar o bloco mais longo.")
    faltam = [b["id"] for b in proj["blocos"] if str(b["id"]) not in al]
    if faltam: print("blocos ainda sem áudio (usando estimativa):", faltam)


# ====================================================================== RENDER
class Servidor:
    def __enter__(self):
        s = socket.socket(); s.bind(("127.0.0.1", 0)); self.porta = s.getsockname()[1]; s.close()
        self.p = subprocess.Popen([PY, "-m", "http.server", str(self.porta), "--bind", "127.0.0.1", "--directory", BASE], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.8); return self
    def __exit__(self, *a): self.p.terminate()


def faixa(tempo, bid):
    """quadros [f0, f1) de um bloco: os blocos cobrem a linha do tempo inteira, sem buracos"""
    B = tempo["blocos"]; i = next(k for k, b in enumerate(B) if b["id"] == bid)
    f0 = 0 if i == 0 else round((B[i - 1]["fim"] + B[i]["ini"]) / 2 * FPS)
    f1 = round(tempo["total"] * FPS) if i == len(B) - 1 else round((B[i]["fim"] + B[i + 1]["ini"]) / 2 * FPS)
    return f0, f1


def assinatura(slug):
    h = hashlib.md5()
    for f in [P(slug, "cena.js"), P(slug, "tempo.json"), os.path.join(BASE, "engine", "engine.js"), os.path.join(BASE, "engine", "kit.js"), os.path.join(BASE, "engine", "chars.js")]: h.update(open(f, "rb").read())
    return h.hexdigest()[:12]


def renderizar(slug, blocos, passo=1, refazer=False):
    """garante os quadros 3D dos blocos pedidos. Quadros antigos (cena/tempo mudaram) são refeitos sozinhos."""
    tempo = jl(P(slug, "tempo.json")); Q = P(slug, "quadros"); os.makedirs(Q, exist_ok=True); sig = assinatura(slug); H = jl(os.path.join(Q, "assinaturas.json"), {})
    lista = []
    for b in blocos:
        f0, f1 = faixa(tempo, b)
        if refazer or H.get(str(b)) != sig:
            for f in range(f0, f1):
                for ext in ("jpg", "json"):
                    fn = f"{Q}/f_{f:05d}.{ext}"
                    if os.path.exists(fn): os.remove(fn)
        lista += [f for f in range(f0, f1, 1) if (f - f0) % passo == 0 and not os.path.exists(f"{Q}/f_{f:05d}.jpg")]
    with Servidor() as s:
        r = subprocess.run([PY, os.path.join(LIB, "shoot.py"), "eventos", str(s.porta), slug, P(slug, "eventos.json")], capture_output=True, text=True)
        if r.returncode != 0: sys.exit("ERRO NA CENA:\n" + r.stdout + r.stderr)
        if lista:
            lf = os.path.join(Q, "lista.txt"); open(lf, "w").write(" ".join(map(str, lista))); n = max(1, min(os.cpu_count() or 2, 4)); t0 = time.time()
            print(f"renderizando {len(lista)} quadros 3D com {n} processos...", flush=True)
            ps = [subprocess.Popen([PY, os.path.join(LIB, "shoot.py"), "quadros", str(s.porta), slug, Q, lf, str(i), str(n)]) for i in range(n)]
            if any(p.wait() != 0 for p in ps): sys.exit("falha ao renderizar quadros")
            print(f"  pronto em {time.time() - t0:.0f} s ({(time.time() - t0) / len(lista):.2f} s/quadro)")
    for b in blocos:
        f0, f1 = faixa(tempo, b)
        H[str(b)] = sig
    jd(H, os.path.join(Q, "assinaturas.json"))


def compor(slug, f0, f1, out, escala, previa, passo):
    n = max(1, min(os.cpu_count() or 2, 4)); tam = -(-(f1 - f0) // n); partes = []; ps = []
    for i in range(n):
        a, b = f0 + i * tam, min(f1, f0 + (i + 1) * tam)
        if a >= b: break
        pf = f"{out}.parte{i}.mp4"; partes.append(pf)
        ps.append(subprocess.Popen([PY, os.path.join(LIB, "comp.py"), P(slug), str(escala), "-" if previa is None else str(previa), str(passo), str(a), str(b), pf]))
    if any(p.wait() != 0 for p in ps): sys.exit("falha na composição")
    lst = out + ".lista.txt"; open(lst, "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in partes))
    sh(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    for p in partes + [lst]: os.remove(p)


def trilhas(slug):
    tempo = jl(P(slug, "tempo.json")); ev = jl(P(slug, "eventos.json")); sfx = P(slug, "audio", "sfx.wav")
    desc = SFX.montar(ev["sons"], tempo["total"], sfx)
    if desc: print("aviso: sons desconhecidos ignorados:", desc)
    narr = P(slug, "audio", "narracao.wav"); return (narr if os.path.exists(narr) else None), sfx


def mixar(video, narr, sfx, t0, d, out):
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", video]
    if narr:
        cmd += ["-ss", f"{t0:.3f}", "-t", f"{d:.3f}", "-i", narr, "-ss", f"{t0:.3f}", "-t", f"{d:.3f}", "-i", sfx,
                "-filter_complex", "[1:a]apad[n];[2:a]volume=0.5[s];[n][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[a]", "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-ss", f"{t0:.3f}", "-t", f"{d:.3f}", "-i", sfx, "-map", "0:v", "-map", "1:a"]
    sh(cmd + ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{d:.3f}", out])


# ====================================================================== REVISÃO AUTOMÁTICA
def revisar(slug, blocos, folha, video):
    from PIL import Image
    proj = jl(P(slug, "projeto.json")); tempo = jl(P(slug, "tempo.json")); ev = jl(P(slug, "eventos.json")); Q = P(slug, "quadros"); avisos = []
    for b in blocos:
        tb = next(x for x in tempo["blocos"] if x["id"] == b); pb = next(x for x in proj["blocos"] if x["id"] == b); f0, f1 = faixa(tempo, b)
        # 1) tela parada / quadro quase vazio (só chão, só céu, só parede)
        ant = None; ini = None; vazios = []
        for f in range(f0, f1, 3):
            fn = f"{Q}/f_{f:05d}.jpg"
            if not os.path.exists(fn): continue
            im = np.asarray(Image.open(fn).convert("L").resize((36, 64)), float)
            g = np.asarray(Image.open(fn).convert("RGB").resize((9, 16), Image.BOX), float)
            if ((np.abs(np.diff(g, axis=0)).max(2) > 18).mean() + (np.abs(np.diff(g, axis=1)).max(2) > 18).mean()) / 2 < 0.17: vazios.append(f / FPS)
            if ant is not None:
                if np.abs(im - ant).mean() < 0.35: ini = f if ini is None else ini
                else:
                    if ini is not None and (f - ini) / FPS >= 1.5: avisos.append(f"bloco {b}: tela quase parada de {ini / FPS - tb['ini']:.1f}s a {f / FPS - tb['ini']:.1f}s")
                    ini = None
            ant = im
        for t0, t1 in _intervalos(vazios, 0.11):
            if t1 - t0 >= 0.3: avisos.append(f"bloco {b}: quadro quase vazio (sem nada para olhar) de {t0 - tb['ini']:.1f}s a {t1 - tb['ini']:.1f}s — ajuste a câmera")
        # 2) termos sem etiqueta / etiquetas fora da tela
        rot = [r for r in ev["rotulos"] if tb["ini"] - 0.3 <= r["t0"] <= tb["fim"] + 0.3]
        for termo in pb.get("termos", []):
            if not any(termo.upper() in r["txt"] or r["txt"] in termo.upper() for r in rot): avisos.append(f"bloco {b}: termo técnico \"{termo}\" sem etiqueta amarela na cena")
        for r in rot + [m for m in ev["marcas"] if tb["ini"] <= m["t0"] <= tb["fim"]]:
            f = int((r["t0"] + min(0.5, (r["t1"] - r["t0"]) / 2)) * FPS); j = jl(f"{Q}/f_{f - f % 1:05d}.json")
            if j and r["id"] in j["P"]:
                x, y, vis = j["P"][r["id"]]
                if not vis or x < 20 or x > 700 or y < 100 or y > 900: avisos.append(f"bloco {b}: {r.get('txt', 'marca ' + r.get('tipo', ''))} aponta para fora da área visível em {r['t0'] - tb['ini']:.1f}s")
        cta = ev.get("cta")
        if cta and tb["ini"] <= cta["t0"] <= tb["fim"] + 1:
            for r in rot + [n for n in ev.get("notas", []) if n["t1"] > cta["t0"]]:
                if r["t1"] > cta["t0"] + 0.1 and r["t0"] < cta["t0"] + 3: avisos.append(f"bloco {b}: o cartão final \"comente\" aparece por cima de {r['txt']} — termine a etiqueta antes")
        # 3) ritmo: algo novo a cada ~3 s
        ts = sorted([s["t"] for s in ev["sons"] if tb["ini"] <= s["t"] <= tb["fim"] and s["nome"] not in ("chuva", "agua", "vento", "passo", "pinga", "acelera")] + [tb["ini"], tb["fim"]])
        for x, y in zip(ts, ts[1:]):
            if y - x > 3.6: avisos.append(f"bloco {b}: {y - x:.1f}s sem nenhuma ação nova (de {x - tb['ini']:.1f}s a {y - tb['ini']:.1f}s)")
        d = tb["fim"] - tb["ini"]
        if not (12 <= d <= 24): avisos.append(f"bloco {b}: duração {d:.1f}s (ideal 15–22 s)")
    if tempo["total"] > proj.get("limite_s", LIMITE): avisos.append(f"VÍDEO COM {mmss(tempo['total'])} — acima do limite de {mmss(proj.get('limite_s', LIMITE))}")
    d = dur_de(video); cols = 8; rows = max(1, -(-int(d * 2) // cols))
    sh(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", f"fps=2,scale=180:-1,tile={cols}x{rows}", "-frames:v", "1", folha])
    return avisos


# ====================================================================== INSPEÇÃO AUTOMÁTICA DA CENA
def _intervalos(ts, folga=0.11):
    out = []
    for t in sorted(ts):
        if out and t - out[-1][1] <= folga: out[-1][1] = t
        else: out.append([t, t])
    return out


def inspecionar(slug, blocos):
    """Roda o inspetor do motor quadro a quadro (sem renderizar) e devolve {bloco: {"erros": [...], "avisos": [...], "provas": [t, ...]}}"""
    tempo = jl(P(slug, "tempo.json")); res = {}
    with Servidor() as srv:
        for b in blocos:
            f0, f1 = faixa(tempo, b); tb = next(x for x in tempo["blocos"] if x["id"] == b); arq = P(slug, "previas", f"_inspecao_{b}.json")
            r = subprocess.run([PY, os.path.join(LIB, "shoot.py"), "inspecao", str(srv.porta), slug, arq, str(f0), str(f1)], capture_output=True, text=True)
            if r.returncode != 0: sys.exit("ERRO NA CENA:\n" + r.stdout + r.stderr)
            D = jl(arq); Q = D["quadros"]; E = []; A = []; provas = []
            rel = lambda t: max(0.0, t - tb["ini"])
            def add(lista, t, msg): lista.append(msg); provas.append(round(t, 2)) if lista is E else None
            # 1) objetos um dentro do outro
            col = {}
            for q in Q:
                for a, c, prof, masc in q["col"]: col.setdefault((a, c, masc), []).append((q["t"], prof))
            for (a, c, masc), L in col.items():
                for t0, t1 in _intervalos([t for t, _ in L]):
                    pm = max(pr for t, pr in L if t0 <= t <= t1)
                    if t1 - t0 >= 0.12 or pm > 0.06:
                        quem = f'PERSONAGEM dentro de "{c if a.startswith("personagem") else a}"' if masc else f'"{a}" atravessa "{c}"'
                        add(E, (t0 + t1) / 2, f"{quem} — até {pm * 100:.0f} cm, de {rel(t0):.1f}s a {rel(t1):.1f}s")
            # 2) peças / personagem flutuando
            fl = {}
            for q in Q:
                for n, gap, masc in q["flut"]: fl.setdefault((n, masc), []).append((q["t"], gap))
            for (n, masc), L in fl.items():
                for t0, t1 in _intervalos([t for t, _ in L]):
                    g = max(abs(x) for t, x in L if t0 <= t <= t1)
                    if t1 - t0 >= 0.5 and g > 0.03:
                        msg = f'"{n}" sem apoio ({"flutuando" if [x for t, x in L if t0 <= t <= t1][0] > 0 else "afundado"} {g * 100:.0f} cm) de {rel(t0):.1f}s a {rel(t1):.1f}s'
                        add(E, (t0 + t1) / 2, "PERSONAGEM: " + msg) if masc else A.append(msg + "  [se for preso na parede/teto de propósito, use E.fixo()]")
            # 3) saltos de movimento (teleporte)
            for q0, q1 in zip(Q, Q[1:]):
                for sid, (n, x, y, z, entrando) in q1["objs"].items():
                    if sid in q0["objs"]:
                        _, x0, y0, z0, e0 = q0["objs"][sid]; d = ((x - x0) ** 2 + (y - y0) ** 2 + (z - z0) ** 2) ** 0.5
                        if d > 0.45 and not entrando and not e0: add(E, q1["t"], f'"{n}" salta {d:.1f} m de um quadro para o outro em {rel(q1["t"]):.1f}s (movimento quebrado)')
            # 4) câmera
            for t0, t1 in _intervalos([q["t"] for q in Q if q["cam"]["dentro"]]):
                n = next(q["cam"]["dentro"] for q in Q if q["t"] >= t0 and q["cam"]["dentro"]); add(E, (t0 + t1) / 2, f'CÂMERA atravessa "{n}" de {rel(t0):.1f}s a {rel(t1):.1f}s')
            for t0, t1 in _intervalos([q["t"] for q in Q if q["cam"]["abaixo"]]):
                add(E, (t0 + t1) / 2, f"CÂMERA passa por baixo do chão (fora de um corte do terreno) de {rel(t0):.1f}s a {rel(t1):.1f}s")
            for t0, t1 in _intervalos([q["t"] for q in Q if q["cam"].get("limbo", 0) >= 3]):
                add(E, (t0 + t1) / 2, f"LIMBO: aparece vazio/fundo do mundo (algo sem preencher, ex.: borda de corte, vão embaixo do chão) de {rel(t0):.1f}s a {rel(t1):.1f}s")
            vel = []
            for q0, q1 in zip(Q, Q[1:]):
                p0, p1, a0, a1 = np.array(q0["cam"]["p"]), np.array(q1["cam"]["p"]), np.array(q0["cam"]["a"]), np.array(q1["cam"]["a"])
                dist = max(0.3, np.linalg.norm(a1 - p1)); d0 = (a0 - p0) / max(1e-6, np.linalg.norm(a0 - p0)); d1 = (a1 - p1) / max(1e-6, np.linalg.norm(a1 - p1))
                ang = np.degrees(np.arccos(np.clip(d0 @ d1, -1, 1))); passo = np.linalg.norm(p1 - p0); vel.append(passo)
                if (ang > 9 or passo > max(0.4, 0.22 * dist)) and not (q1["cam"].get("corte") or q0["cam"].get("corte")): add(E, q1["t"], f"CÂMERA dá um tranco em {rel(q1['t']):.1f}s (gira {ang:.0f}° / anda {passo:.2f} m em 1 quadro)")
            # 5) personagem deslizando sem andar
            esc = {}
            for q0, q1 in zip(Q, Q[1:]):
                m0 = {m[0]: m for m in q0["masc"]}
                for m in q1["masc"]:
                    if m[0] in m0:
                        v = ((m[1] - m0[m[0]][1]) ** 2 + (m[3] - m0[m[0]][3]) ** 2) ** 0.5 * FPS
                        if v > 0.25 and m[4] < 0.4 and m[5] < 0.02 and not (len(m) > 7 and m[7]): esc.setdefault(m[0], []).append(q1["t"])
            for n, L in esc.items():
                for t0, t1 in _intervalos(L):
                    if t1 - t0 >= 0.25: add(E, (t0 + t1) / 2, f'PERSONAGEM "{n}" desliza sem andar de {rel(t0):.1f}s a {rel(t1):.1f}s (falta a pose walk)')
            # 5b) o personagem é o protagonista: precisa aparecer; e não pode patinar andando rápido demais
            na_tela = sum(1 for q in Q if any(len(m) > 6 and m[6] for m in q["masc"])); frac = na_tela / max(1, len(Q))
            if frac < 0.5: add(E, tb["ini"] + 1, f"PERSONAGEM aparece em só {100 * frac:.0f}% do bloco (mínimo 50%; ele é o protagonista: faz, opera, reage e mostra)")
            elif frac < 0.7: A.append(f"personagem aparece em {100 * frac:.0f}% do bloco (ideal: 70% ou mais)")
            # 5c) o corpo do personagem não pode entrar nele mesmo nem em outros objetos
            cp = {}
            for q in Q:
                for n, pa, pb, d in q.get("corpo", []): cp.setdefault((n, pa, pb), []).append((q["t"], d))
            for (n, pa, pb), L2 in cp.items():
                for t0, t1 in _intervalos([t for t, _ in L2]):
                    pm = max(d for t, d in L2 if t0 <= t <= t1)
                    if t1 - t0 >= 0.1 or pm > 0.04: add(E, (t0 + t1) / 2, f"PERSONAGEM: {pa} entra em {pb} ({pm * 100:.0f} cm) de {rel(t0):.1f}s a {rel(t1):.1f}s")
            rapido = []
            for q0, q1 in zip(Q, Q[1:]):
                m0 = {m[0]: m for m in q0["masc"]}
                for m in q1["masc"]:
                    if m[0] in m0 and m[4] >= 0.4 and not (len(m) > 7 and m[7]) and ((m[1] - m0[m[0]][1]) ** 2 + (m[3] - m0[m[0]][3]) ** 2) ** 0.5 * FPS > 2.4: rapido.append(q1["t"])
            for t0, t1 in _intervalos(rapido):
                if t1 - t0 >= 0.3: A.append(f"personagem anda rápido demais de {rel(t0):.1f}s a {rel(t1):.1f}s (os pés patinam): dê mais tempo ou encurte o caminho")
            # 6) ações fora do quadro / escondidas / pequenas
            for a in D["acoes"]:
                add(E, a["t"], a["msg"] + f" — em {rel(a['t']):.1f}s") if a["nivel"] == "erro" else A.append(a["msg"] + f" — em {rel(a['t']):.1f}s")
            E = list(dict.fromkeys(E)); A = list(dict.fromkeys(A))
            res[b] = {"erros": E, "avisos": A, "provas": sorted(set(provas))[:8]}; os.remove(arq)
    return res


def fotos_prova(slug, b, tempos):
    """quadros compostos nos instantes dos problemas, para conferir com os olhos"""
    if not tempos: return []
    fontes(); Q = P(slug, "quadros"); out = P(slug, "previas", "problemas"); os.makedirs(out, exist_ok=True)
    fs = sorted({int(t * FPS) for t in tempos}); falta = [f for f in fs if not os.path.exists(f"{Q}/f_{f:05d}.jpg")]
    with Servidor() as s:
        sh([PY, os.path.join(LIB, "shoot.py"), "eventos", str(s.porta), slug, P(slug, "eventos.json")])
        if falta:
            lf = os.path.join(Q, "lista_prova.txt"); open(lf, "w").write(" ".join(map(str, falta))); sh([PY, os.path.join(LIB, "shoot.py"), "quadros", str(s.porta), slug, Q, lf, "0", "1"])
    from comp import Comp
    c = Comp(P(slug), 1.0, b, 1); res = []
    for f in fs: fn = f"{out}/bloco{b}_{f / FPS:06.2f}s.png"; c.foto(f, fn); res.append(fn)
    for f in falta:                                     # quadros soltos não contam como bloco renderizado
        for ext in ("jpg", "json"): os.remove(f"{Q}/f_{f:05d}.{ext}")
    return res


def relatorio(slug, b, r, visuais=()):
    L = [f"INSPEÇÃO DO SISTEMA — bloco {b}: " + ("REPROVADO" if r["erros"] else "aprovado" + (" com avisos" if r["avisos"] or visuais else ""))]
    L += [f"  ERRO  {x}" for x in r["erros"]] + [f"  aviso {x}" for x in list(r["avisos"]) + list(visuais)]
    if not (r["erros"] or r["avisos"] or visuais): L.append("  nenhum objeto atravessando outro, nada flutuando, câmera e personagem ok, todas as ações visíveis")
    open(P(slug, "previas", f"inspecao_bloco_{b}.txt"), "w").write("\n".join(L)); return "\n".join(L)


def cmd_inspecionar(a):
    proj = jl(P(a.slug, "projeto.json")); montar_tempo(a.slug); ids = [b["id"] for b in proj["blocos"]] if a.bloco == "todos" else [int(a.bloco)]
    for b, r in inspecionar(a.slug, ids).items():
        print(relatorio(a.slug, b, r))
        if r["erros"] and not a.sem_fotos: print("  provas:", *fotos_prova(a.slug, b, r["provas"]), sep="\n    ")


def folha_acoes(slug, b):
    """um quadro no meio de cada ação do bloco (entrada de peça, X, check, etiqueta) — é o que mais precisa ser olhado"""
    from PIL import Image
    from comp import Comp
    tempo = jl(P(slug, "tempo.json")); ev = jl(P(slug, "eventos.json")); f0, f1 = faixa(tempo, b)
    ts = sorted({round(x["t0"] + 0.35, 2) for x in ev["rotulos"] + ev["marcas"] + ev.get("notas", []) + ev.get("medidas", [])} | {round((x["t0"] + x["t1"]) / 2, 2) for x in ev.get("icones", [])} | ({round(ev["cta"]["t0"] + 1.5, 2)} if ev.get("cta") else set()) | {round(s["t"] + 0.25, 2) for s in ev["sons"] if s["nome"] in ("tum", "pop", "sobe", "encaixe", "brilho", "concreto", "desaba", "fanfarra")})
    fs = sorted({int(t * FPS) for t in ts if f0 <= int(t * FPS) < f1}); fs = fs[::max(1, -(-len(fs) // 24))]
    if not fs: return "(sem ações)"
    c = Comp(P(slug), 1.0, b, 1); tmp = P(slug, "previas", "_a.png"); cols = min(8, len(fs)); rows = -(-len(fs) // cols); folha = Image.new("RGB", (cols * 180, rows * 320))
    for i, f in enumerate(fs): c.foto(f, tmp); folha.paste(Image.open(tmp).convert("RGB").resize((180, 320)), ((i % cols) * 180, (i // cols) * 320))
    os.remove(tmp); out = P(slug, "previas", f"acoes_bloco_{b}.jpg"); folha.save(out, quality=88); return out


# ====================================================================== PRÉVIA
def cmd_previa(a):
    fontes(); proj = jl(P(a.slug, "projeto.json")); tempo = montar_tempo(a.slug); e = estado(a.slug)
    ids = [b["id"] for b in proj["blocos"]] if a.bloco == "todos" else [int(a.bloco)]
    passo = 2 if a.rapida else 1
    # 1º a inspeção automática (rápida, sem renderizar). Bloco com ERRO não vira prévia: corrige-se a cena antes.
    insp = inspecionar(a.slug, ids); ruins = [b for b in ids if insp[b]["erros"]]
    if ruins and not a.mesmo_assim:
        for b in ruins:
            print(relatorio(a.slug, b, insp[b])); print("  provas:", *fotos_prova(a.slug, b, insp[b]["provas"]), sep="\n    ")
            st = e["blocos"][str(b)]; st["status"] = "reprovado na inspeção"; st["inspecao"] = insp[b]; log(a.slug, e, f"bloco {b} REPROVADO na inspeção automática ({len(insp[b]['erros'])} erros)")
        sys.exit(f"\nblocos {ruins} reprovados na inspeção automática: corrija a cena e rode a prévia de novo (não enviar para avaliação).")
    renderizar(a.slug, ids, passo, a.refazer); narr, sfx = trilhas(a.slug)
    for b in ids:
        f0, f1 = faixa(tempo, b); mudo = P(a.slug, "previas", f"_mudo_{b}.mp4"); out = P(a.slug, "previas", f"bloco_{b}.mp4")
        compor(a.slug, f0, f1, mudo, 1.0, b, passo); mixar(mudo, narr, sfx, f0 / FPS, (f1 - f0) / FPS, out); os.remove(mudo)
        av = revisar(a.slug, [b], P(a.slug, "previas", f"revisao_bloco_{b}.jpg"), out)
        st = e["blocos"][str(b)]; st["status"] = "aguardando avaliação" if not insp[b]["erros"] else "reprovado na inspeção"; st["avisos"] = av; st["inspecao"] = insp[b]
        log(a.slug, e, f"prévia do bloco {b} gerada" + (" (rápida)" if a.rapida else ""))
        print(f"\nPRÉVIA bloco {b}: {out}  ({(f1 - f0) / FPS:.1f} s)" + ("" if narr else "  [sem narração ainda]"))
        print(relatorio(a.slug, b, insp[b], av))
        print("  folha de quadros (2 por segundo):", P(a.slug, "previas", f"revisao_bloco_{b}.jpg"))
        print("  folha das ações (1 quadro por ação):", folha_acoes(a.slug, b))
    cmd_form(a, quieto=True)


# ====================================================================== AVALIAÇÃO
def cmd_form(a, quieto=False):
    proj = jl(P(a.slug, "projeto.json")); e = estado(a.slug); L = [f"AVALIAÇÃO — {proj['titulo']}", ""]
    for b in proj["blocos"]:
        st = e["blocos"][str(b["id"])]
        if st["status"] == "aprovado": L += [f"BLOCO {b['id']} — {b['nome']}: ✅ já aprovado", ""]; continue
        i = st.get("inspecao"); av = (i["avisos"] if i else []) + st.get("avisos", [])
        sis = "ainda sem prévia" if not i else ("❌ REPROVADO pelo sistema (não avaliar ainda)" if i["erros"] else "✅ aprovado pelo sistema" + (f" — {len(av)} aviso(s)" if av else " — sem problemas"))
        L += [f"BLOCO {b['id']} — {b['nome']}   [ ] APROVADO   [ ] ALTERAR", f"Avaliação do sistema: {sis}"] + [f"   · {x}" for x in (i["erros"] if i else []) + av] + ["Alterações: ______________________________", ""]
    L += ["GERAL (ritmo, cores, legenda, personagem, som): ______________________________"]
    open(P(a.slug, "AVALIACAO.md"), "w").write("\n".join(L)); jd(e, P(a.slug, "estado.json"))
    if not quieto: print("\n".join(L))


def cmd_aprovar(a):
    e = estado(a.slug)
    for b in a.blocos:
        st = e["blocos"][str(b)]
        if st.get("inspecao") is None or st["inspecao"]["erros"]: sys.exit(f"bloco {b}: só dá para aprovar depois de uma prévia que passou na inspeção automática.")
        st["status"] = "aprovado"
        for p in st["pedidos"]: p["feito"] = True
        log(a.slug, e, f"bloco {b} APROVADO")
    cmd_status(a)


def cmd_alterar(a):
    e = estado(a.slug); st = e["blocos"][str(a.bloco)]; st["status"] = "alterar"; st["pedidos"].append({"pedido": a.texto, "feito": False})
    log(a.slug, e, f"bloco {a.bloco}: ALTERAR — {a.texto}"); cmd_status(a)


def cmd_status(a):
    proj = jl(P(a.slug, "projeto.json")); e = estado(a.slug); tempo = jl(P(a.slug, "tempo.json")) or montar_tempo(a.slug)
    print(f"{proj['titulo']}  —  {mmss(tempo['total'])}" + (" (estimado)" if tempo.get("estimado") else ""))
    for b in proj["blocos"]:
        st = e["blocos"][str(b["id"])]; print(f"  bloco {b['id']}  {b['nome'][:30]:30s} {st['status']}")
        for p in st["pedidos"]: print(f"      {'✓' if p['feito'] else '•'} {p['pedido']}")
    falta = [k for k, v in e["blocos"].items() if v["status"] != "aprovado"]
    print("  -> pronto para o vídeo final" if not falta else f"  -> faltam aprovar: blocos {', '.join(falta)}")


# ====================================================================== FINAL
def srt(slug, out):
    tempo = jl(P(slug, "tempo.json")); cues = []; cur = []
    for b in tempo["blocos"]:
        for w, s, e in b["palavras"]:
            cur.append((w, s, e))
            if w[-1] in ".?!…:" or (w[-1] in ",;" and len(cur) >= 4) or len(cur) >= 7: cues.append(cur); cur = []
        if cur: cues.append(cur); cur = []
    def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
    with open(out, "w") as f:
        for i, c in enumerate(cues): f.write(f"{i + 1}\n{ts(c[0][1])} --> {ts(c[-1][2] + 0.15)}\n{' '.join(w for w, _, _ in c)}\n\n")


def cmd_final(a):
    fontes(); proj = jl(P(a.slug, "projeto.json")); e = estado(a.slug); tempo = montar_tempo(a.slug); lim = proj.get("limite_s", LIMITE)
    falta = [k for k, v in e["blocos"].items() if v["status"] != "aprovado"]
    if falta and not a.forcar: sys.exit(f"ainda não: blocos {', '.join(falta)} não estão aprovados. (use --forcar só para teste)")
    if tempo.get("estimado") and not a.forcar: sys.exit("ainda não: há blocos sem áudio real.")
    if tempo["total"] > lim and not a.forcar: sys.exit(f"ainda não: vídeo com {mmss(tempo['total'])}, acima do limite de {mmss(lim)}.")
    ids = [b["id"] for b in proj["blocos"]]
    insp = inspecionar(a.slug, ids); ruins = [b for b in ids if insp[b]["erros"]]
    for b in ruins: print(relatorio(a.slug, b, insp[b]))
    if ruins and not a.forcar: sys.exit(f"ainda não: blocos {ruins} reprovados na inspeção automática.")
    renderizar(a.slug, ids, 1, False); narr, sfx = trilhas(a.slug)
    nf = round(tempo["total"] * FPS); mudo = P(a.slug, "final", "_mudo.mp4"); out = P(a.slug, "final", f"{a.slug}.mp4")
    compor(a.slug, 0, nf, mudo, 1.5, None, 1); mixar(mudo, narr, sfx, 0, nf / FPS, out); os.remove(mudo)
    srt(a.slug, P(a.slug, "final", f"{a.slug}.srt"))
    av = revisar(a.slug, ids, P(a.slug, "final", "revisao_final.jpg"), out)
    print(f"\nVÍDEO FINAL: {out}  ({mmss(dur_de(out))}, 1080x1920)"); print("revisão automática:", "nenhum problema encontrado" if not av else ""); [print("  -", x) for x in av]
    if a.saida:
        os.makedirs(a.saida, exist_ok=True)
        for f in (out, P(a.slug, "final", f"{a.slug}.srt")): shutil.copy(f, a.saida)
        print("copiado para", a.saida)
    log(a.slug, e, "vídeo final gerado")


def cmd_foto(a):
    fontes(); montar_tempo(a.slug); out = P(a.slug, "previas", "fotos"); os.makedirs(out, exist_ok=True); Q = P(a.slug, "quadros"); os.makedirs(Q, exist_ok=True)
    fs = [int(float(t) * FPS) for t in a.tempos]; lf = os.path.join(Q, "lista_foto.txt"); open(lf, "w").write(" ".join(map(str, fs)))
    for f in fs:
        for ext in ("jpg", "json"):
            if os.path.exists(f"{Q}/f_{f:05d}.{ext}"): os.remove(f"{Q}/f_{f:05d}.{ext}")
    with Servidor() as s:
        r = subprocess.run([PY, os.path.join(LIB, "shoot.py"), "eventos", str(s.porta), a.slug, P(a.slug, "eventos.json")], capture_output=True, text=True)
        if r.returncode != 0: sys.exit("ERRO NA CENA:\n" + r.stdout + r.stderr)
        sh([PY, os.path.join(LIB, "shoot.py"), "quadros", str(s.porta), a.slug, Q, lf, "0", "1"])
    from comp import Comp
    c = Comp(P(a.slug), 1.0, None, 1)
    for f in fs: c.foto(f, f"{out}/t_{f / FPS:07.2f}.png"); print(f"{out}/t_{f / FPS:07.2f}.png")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("novo"); s.add_argument("slug"); s.add_argument("titulo"); s.add_argument("--blocos", type=int, default=5); s.add_argument("--formula", default="construcao", choices=["construcao", "animal"]); s.add_argument("--canal", default="Billy Constrói"); s.set_defaults(f=cmd_novo)
    s = sub.add_parser("roteiro"); s.add_argument("slug"); s.set_defaults(f=cmd_roteiro)
    s = sub.add_parser("audio"); s.add_argument("slug"); s.add_argument("arquivos", nargs="*"); s.add_argument("--acelerar", action="store_true"); s.add_argument("--velocidade", type=float); s.set_defaults(f=cmd_audio)
    s = sub.add_parser("previa"); s.add_argument("slug"); s.add_argument("bloco"); s.add_argument("--rapida", action="store_true"); s.add_argument("--refazer", action="store_true"); s.add_argument("--mesmo-assim", dest="mesmo_assim", action="store_true"); s.set_defaults(f=cmd_previa)
    s = sub.add_parser("inspecionar"); s.add_argument("slug"); s.add_argument("bloco"); s.add_argument("--sem-fotos", dest="sem_fotos", action="store_true"); s.set_defaults(f=cmd_inspecionar)
    s = sub.add_parser("form"); s.add_argument("slug"); s.set_defaults(f=cmd_form)
    s = sub.add_parser("aprovar"); s.add_argument("slug"); s.add_argument("blocos", nargs="+", type=int); s.set_defaults(f=cmd_aprovar)
    s = sub.add_parser("alterar"); s.add_argument("slug"); s.add_argument("bloco", type=int); s.add_argument("texto"); s.set_defaults(f=cmd_alterar)
    s = sub.add_parser("status"); s.add_argument("slug"); s.set_defaults(f=cmd_status)
    s = sub.add_parser("final"); s.add_argument("slug"); s.add_argument("--saida"); s.add_argument("--forcar", action="store_true"); s.set_defaults(f=cmd_final)
    s = sub.add_parser("foto"); s.add_argument("slug"); s.add_argument("tempos", nargs="+"); s.set_defaults(f=cmd_foto)
    a = ap.parse_args(); a.f(a)


if __name__ == "__main__":
    main()
