#!/usr/bin/env python3
"""GERADOR DE VÍDEOS DO BILLY CONSTRÓI — roda no GitHub Actions (ou local) e usa os créditos da API.

  tema (seu ou escolhido pelo Claude) -> pesquisa -> roteiro (avaliado pela fórmula) -> modelos 3D (Poly Pizza)
  -> narração (ElevenLabs, voz do Will) -> cena 3D (Claude escreve; inspeção automática corrige) -> prévias
  -> revisão visual -> vídeo final 1080x1920 + .srt + thumbnail + textos de publicação.

Modos:  completo | so_roteiro (só Claude: tema, pesquisa, roteiro, lista de modelos) | teste_infra (sem API: ensaia o render com o projeto de exemplo)
"""
import argparse, datetime, json, os, re, shutil, subprocess, sys, time, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MEC = RAIZ / "mec"
GER = RAIZ / "gerador"
sys.path.insert(0, str(GER))
import digest_api, prompts as PR  # noqa: E402

FPS = 30


# ============================================================== utilidades
def titulo(txt):
    print(f"\n{'=' * 72}\n== {txt}\n{'=' * 72}", flush=True)


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


def slugar(s, n=36):
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:n].strip("-") or "video"


def ler(p, padrao=""):
    p = Path(p)
    return p.read_text(encoding="utf-8") if p.exists() else padrao


def mec(*args):
    """roda o mec.py mostrando a saída ao vivo; devolve (código, texto)"""
    cmd = [sys.executable, str(MEC / "mec.py"), *map(str, args)]
    print("$ mec.py", *args, flush=True)
    p = subprocess.Popen(cmd, cwd=MEC, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    linhas = []
    for l in p.stdout:
        linhas.append(l); print(l, end="", flush=True)
    p.wait()
    return p.returncode, "".join(linhas)


class Relatorio:
    def __init__(self):
        self.linhas = []; self.t0 = time.time(); self.status = "em andamento"; self.avisos = []

    def etapa(self, nome, detalhe=""):
        self.linhas.append(f"- ✅ **{nome}** {detalhe}".rstrip()); print(f"[ok] {nome} {detalhe}", flush=True)

    def aviso(self, txt):
        self.avisos.append(txt); print(f"[aviso] {txt}", flush=True)

    def falha(self, nome, detalhe=""):
        self.linhas.append(f"- ❌ **{nome}** {detalhe}".rstrip()); self.status = "falhou"; print(f"[FALHA] {nome} {detalhe}", flush=True)

    def md(self, cab):
        mins = (time.time() - self.t0) / 60
        out = [f"# {cab}", "", f"Status: **{self.status}** — {mins:.0f} min", ""] + self.linhas
        if self.avisos: out += ["", "## Avisos"] + [f"- {a}" for a in self.avisos]
        return "\n".join(out) + "\n"


# ============================================================== backends (trocáveis nos testes)
def novo_claude(args):
    from claude_api import Claude, MODELO_FORTE, MODELO_PADRAO
    c = Claude(); c.modelo = MODELO_FORTE if args.modelo == "opus" else MODELO_PADRAO
    return c


def novo_eleven():
    from eleven import Eleven
    return Eleven()


# ============================================================== estado (temas usados, lições automáticas)
ARQ_TEMAS = GER / "estado" / "temas_usados.json"
ARQ_LICOES_AUTO = GER / "LICOES_AUTO.md"


def temas_usados():
    try: return json.loads(ler(ARQ_TEMAS, "[]"))
    except Exception: return []


def registrar_tema(slug, tit, tipo):
    t = temas_usados(); t.append({"slug": slug, "titulo": tit, "tipo": tipo, "data": datetime.date.today().isoformat()})
    ARQ_TEMAS.parent.mkdir(parents=True, exist_ok=True); ARQ_TEMAS.write_text(json.dumps(t, ensure_ascii=False, indent=1), encoding="utf-8")


# ============================================================== 1. TEMA e PESQUISA
def etapa_tema(args, claude, rel):
    if args.tema.strip():
        tema = {"titulo": args.tema.strip(), "tipo": "tema do dono", "gancho": ""}
        rel.etapa("Tema", f"(seu): {tema['titulo']}"); return tema
    usados = "; ".join(t["titulo"] for t in temas_usados()[-40:]) or "nenhum ainda"
    pref = "" if args.emocao in ("", "qualquer") else f"\nPREFERÊNCIA DE EMOÇÃO DESTA VEZ: {args.emocao}."
    r = claude.json([(PR.SYS_TEMAS, False)], [{"role": "user", "content": f"Temas JÁ USADOS (não repita nem chegue perto): {usados}.{pref}\nSe tiver pesquisa na web, olhe o que está em alta/assunto da semana no Brasil antes de propor."}],
                    busca=True, max_tokens=4000, nome="temas")
    lista = r["temas"]; i = r.get("escolhido", 0)
    tema = lista[i if isinstance(i, int) and 0 <= i < len(lista) else 0]
    rel.etapa("Tema", f"(Claude escolheu, {tema.get('tipo', '?')}): {tema['titulo']}")
    rel.linhas.append("  - outras ideias: " + " | ".join(t["titulo"] for j, t in enumerate(lista) if t is not tema))
    return tema


def etapa_pesquisa(tema, claude, rel):
    ficha = claude.pedir([(PR.SYS_PESQUISA, False)], [{"role": "user", "content": f"TEMA: {tema['titulo']}\nGANCHO: {tema.get('gancho', '')}"}],
                         busca=True, max_tokens=4000, nome="pesquisa")
    rel.etapa("Ficha técnica", f"({len(ficha.split())} palavras)")
    return ficha


# ============================================================== 2. ROTEIRO
def falhas_do_roteiro(texto_mec):
    graves = [m.group(1).strip() for m in re.finditer(r"^\s+✗ (.+)$", texto_mec, re.M)]
    leves = [m.group(1).strip() for m in re.finditer(r"^\s+! (.+)$", texto_mec, re.M)]
    if "PASSOU DO LIMITE" in texto_mec:
        graves.append("DURAÇÃO: o vídeo estimado passa do limite de tempo; corte palavras")
    return graves, leves


def etapa_roteiro(args, tema, ficha, claude, rel, limite, saida):
    nb = int(args.blocos); pmin, pmax = int(limite * 2.8), int(limite * 3.3)
    sis = PR.SYS_ROTEIRO.format(limite=limite, blocos=nb, pmin=pmin, pmax=pmax)
    user = f"TEMA: {tema['titulo']}\nGANCHO PROPOSTO: {tema.get('gancho', '')}\n\nFICHA TÉCNICA (use só estes fatos):\n{ficha}\n"
    if args.instrucoes.strip(): user += f"\nINSTRUÇÕES EXTRAS DO DONO DO CANAL (obedeça):\n{args.instrucoes.strip()}\n"
    msgs = [{"role": "user", "content": user}]; slug = None; r = None; graves = ["(ainda não avaliado)"]
    for tent in range(1, 5):
        r = claude.json([(sis, False)], msgs, max_tokens=8000, nome=f"roteiro-{tent}")
        blocos = r.get("blocos") or []
        if not 3 <= len(blocos) <= 7:
            msgs += [{"role": "assistant", "content": json.dumps(r, ensure_ascii=False)}, {"role": "user", "content": f"Devolva exatamente {nb} blocos."}]; continue
        if slug is None:
            slug = f"{datetime.date.today():%y%m%d}-{slugar(r.get('titulo') or tema['titulo'])}"
            if (MEC / "projetos" / slug).exists(): slug += f"-{int(time.time()) % 1000}"
            mec("novo", slug, r.get("titulo") or tema["titulo"], "--blocos", len(blocos))
        proj = {"slug": slug, "titulo": r.get("titulo") or tema["titulo"], "formula": "construcao", "fecho": "parabens", "canal": "Billy Constrói",
                "voz": "Will – Deep Smooth and Affectionate (ElevenLabs)", "limite_s": limite, "velocidade": 1.15, "tipo_emocao": r.get("tipo_emocao", tema.get("tipo", "")),
                "blocos": [{"id": i + 1, "nome": b.get("nome", f"Bloco {i + 1}"), "texto": " ".join(str(b["texto"]).split()), "termos": [str(x) for x in b.get("termos", [])], "cenas": b.get("cenas", "")} for i, b in enumerate(blocos)]}
        (MEC / "projetos" / slug / "projeto.json").write_text(json.dumps(proj, ensure_ascii=False, indent=1), encoding="utf-8")
        rc, out = mec("roteiro", slug)
        graves, leves = falhas_do_roteiro(out)
        if rc == 0 and not graves: break
        msg = "A avaliação automática do roteiro reprovou:\n" + "\n".join(f"- {g}" for g in graves[:12])
        if leves: msg += "\nMelhorias opcionais:\n" + "\n".join(f"- {l}" for l in leves[:6])
        msg += "\n\nReescreva o roteiro corrigindo isso (mantendo o que já está certo) e devolva o JSON COMPLETO."
        msgs += [{"role": "assistant", "content": json.dumps(r, ensure_ascii=False)}, {"role": "user", "content": msg}]
    if slug is None: raise RuntimeError("o Claude não devolveu um roteiro válido")
    if graves and not args.rascunho:
        rel.falha("Roteiro", "reprovado na fórmula depois de 4 tentativas: " + "; ".join(graves[:4]))
        copiar_roteiro(slug, saida); raise Parar("roteiro reprovado (rode de novo, ou marque 'rascunho' para seguir mesmo assim)")
    if graves: rel.aviso("roteiro com pontos fora da fórmula (modo rascunho): " + "; ".join(graves[:4]))
    rel.etapa("Roteiro", f"({len(proj['blocos'])} blocos, {sum(len(b['texto'].split()) for b in proj['blocos'])} palavras)")
    copiar_roteiro(slug, saida)
    return slug, proj, r


def copiar_roteiro(slug, saida):
    saida.mkdir(parents=True, exist_ok=True)
    for f in ("ROTEIRO.md", "projeto.json"):
        if (MEC / "projetos" / slug / f).exists(): shutil.copy(MEC / "projetos" / slug / f, saida / f)


class Parar(Exception):
    pass


# ============================================================== 3. MODELOS 3D
def etapa_modelos(slug, r, claude, rel):
    from modelos3d import PolyPizza, preparar
    lista = [m for m in (r.get("modelos_3d") or []) if m.get("objeto") and m.get("busca_en")]
    if not lista: rel.etapa("Modelos 3D", "(nenhum pedido: a cena usa só o kit)"); return []
    poly = PolyPizza(MEC / "modelos", claude)
    if not poly.ativo: rel.aviso("sem POLY_PIZZA_KEY: modelos 3D só do cache; o resto sai do kit do sistema")
    cat, cred = preparar(lista, MEC / "projetos" / slug, poly)
    rel.etapa("Modelos 3D", f"({len(cat)} de {len(lista)} encontrados" + (": " + ", ".join(c['objeto'] for c in cat) if cat else "") + ")")
    return cat


# ============================================================== 4. NARRAÇÃO
def etapa_audio(slug, proj, eleven, claude, rel):
    pasta = MEC / "projetos" / slug; blocos = proj["blocos"]
    chars = sum(len(b["texto"]) for b in blocos); resto = eleven.creditos()
    if resto is not None and resto < chars: raise Parar(f"ElevenLabs: só {resto} caracteres de crédito e o vídeo precisa de {chars}")
    for tent in range(3):
        for i, b in enumerate(blocos):
            mp3 = pasta / "audio" / f"bloco_{b['id']}.mp3"
            if mp3.exists(): continue
            eleven.gerar(b["texto"], str(mp3), anterior=blocos[i - 1]["texto"] if i else "", seguinte=blocos[i + 1]["texto"] if i + 1 < len(blocos) else "")
        rc, out = mec("audio", slug, "--velocidade", "1.15", "--acelerar")
        if rc != 0: raise RuntimeError("mec.py audio falhou")
        if "acima do limite" not in out: break
        m = re.search(r"\*\*\* ([\d.]+) s acima do limite", out); exc = float(m.group(1)) if m else 5.0
        if tent == 2: rel.aviso(f"narração ainda {exc:.1f}s acima do limite depois de 2 cortes"); break
        # corta o roteiro nos blocos mais longos e regrava só eles
        tempo = json.loads(ler(pasta / "tempo.json")); dur = sorted(tempo["blocos"], key=lambda b: b["fim"] - b["ini"], reverse=True)[:2]
        ids = [str(b["id"]) for b in dur]; cortar = int(exc * 3.2) + 6
        r = claude.json([(PR.SYS_REDUZIR, False)], [{"role": "user", "content": f"Corte cerca de {cortar} palavras no total, nos blocos {', '.join(ids)}.\n\nROTEIRO ATUAL:\n" + json.dumps({"blocos": {str(b['id']): b['texto'] for b in blocos}}, ensure_ascii=False)}], max_tokens=4000, nome="reduzir")
        for b in blocos:
            novo = (r.get("blocos") or {}).get(str(b["id"]))
            if novo and str(b["id"]) in ids:
                b["texto"] = " ".join(novo.split()); (pasta / "audio" / f"bloco_{b['id']}.mp3").unlink(missing_ok=True)
        (pasta / "projeto.json").write_text(json.dumps(proj, ensure_ascii=False, indent=1), encoding="utf-8")
        mec("roteiro", slug)
    rel.etapa("Narração", f"(ElevenLabs, modelo {eleven.modelo}, {eleven.chars} caracteres)")
    return json.loads(ler(pasta / "tempo.json"))


# ============================================================== 5. CENA
def chaves_de_tempo(tempo):
    out = []
    for b in tempo["blocos"]:
        cont = {}; itens = []
        for w, s, e in b["palavras"]:
            n = norm(w)
            if not n: continue
            cont[n] = cont.get(n, 0) + 1
            itens.append(f"{s - b['ini']:.1f}s {n}" + (f"#{cont[n]}" if cont[n] > 1 else ""))
        out.append(f"BLOCO {b['id']} — {b['nome']} — {b['fim'] - b['ini']:.1f}s (começa em {b['ini']:.1f}s no vídeo)\n" + " | ".join(itens))
    return "\n\n".join(out)


def sistema_cena():
    topo = PR.SYS_CENA
    base = "\n\n".join([ler(GER / "prompts" / "regras_billy.md"), "# MANUAL DO SISTEMA\n" + ler(MEC / "MANUAL.md"),
                        "# LIÇÕES APRENDIDAS (obrigatórias)\n" + ler(MEC / "LICOES.md"),
                        ("# LIÇÕES AUTOMÁTICAS DOS ÚLTIMOS VÍDEOS\n" + ler(ARQ_LICOES_AUTO)) if ler(ARQ_LICOES_AUTO).strip() else "",
                        digest_api.gerar(str(MEC / "engine"))])
    exemplo = ("# CENA DE REFERÊNCIA (ar-condicionado, 6 blocos): copie a ESTRUTURA e o nível de capricho, não as peças.\n"
               "# ATENÇÃO: esta referência é do final ANTIGO com 'comente'. No SEU vídeo isso NÃO existe: ignore E.cta e as chaves '6:Se#2', '6:Se#3', '6:frigorista', '6:ventilador'. Seu vídeo termina no 'Parabéns, você construiu X.' (ancore confete, cheer e a vista final nas palavras de 'Parabéns').\n```js\n") + ler(MEC / "projetos" / "arcondicionado" / "cena.js") + "\n```"
    return [(topo, False), (base, True), (exemplo, True)]


def pedido_cena(proj, tempo, catalogo, ficha, extras):
    blocos = "\n\n".join(f"BLOCO {b['id']} — {b['nome']}\nTermos técnicos: {', '.join(b['termos']) or '(nenhum)'}\nO que aparece: {b['cenas']}\nNarração: {b['texto']}" for b in proj["blocos"])
    cat = "\n".join(f"- {c['arquivo']}  ({c['objeto']}; caixa ≈ {c['caixa_aprox']} em unidades do modelo; {c['triangulos']} triângulos)" for c in catalogo) or "(nenhum modelo baixado: monte tudo com o kit)"
    return (f"VÍDEO: {proj['titulo']}  —  duração total {tempo['total']:.1f}s  —  {len(proj['blocos'])} blocos\n\n=== ROTEIRO E DIREÇÃO POR BLOCO ===\n{blocos}\n\n"
            f"=== FICHA TÉCNICA (fatos para as etiquetas e números) ===\n{ficha[:3500]}\n\n=== MODELOS 3D DISPONÍVEIS em projetos/{proj['slug']}/modelos/ ===\n{cat}\n\n"
            f"=== TEMPO REAL DAS PALAVRAS (segundos desde o início do bloco; use como chave 'N:palavra' ou 'N:palavra#2') ===\n{chaves_de_tempo(tempo)}\n\n"
            + (f"=== INSTRUÇÕES EXTRAS DO DONO DO CANAL ===\n{extras}\n\n" if extras.strip() else "") + PR.CHECKLIST_CENA.replace("{{", "{").replace("}}", "}") +
            "\n\nEscreva agora a cena completa (um único bloco ```js).")


def validar_chaves(codigo, tempo):
    """confere, SEM abrir o navegador, se todas as chaves de tempo existem no bloco (a mesma regra do motor)"""
    blocos = {str(b["id"]): b for b in tempo["blocos"]}; erros = []
    for lit in sorted(set(re.findall(r"""["'`](\d+\s*[:@][^"'`\n]{1,40}?)["'`]""", codigo))):
        m = re.match(r"^(\d+)\s*([:@])\s*(.+?)(?:#(\d+))?(>)?$", lit.strip())
        if not m or "${" in lit: continue
        b = blocos.get(m.group(1))
        if not b: erros.append(f'chave "{lit}": o bloco {m.group(1)} não existe (blocos: {", ".join(blocos)})'); continue
        if m.group(2) == "@" or m.group(3) in ("ini", "fim"): continue
        alvo = norm(m.group(3)); n = int(m.group(4) or 1)
        achou = sum(1 for w, _, _ in b["palavras"] if norm(w) == alvo)
        if achou < n:
            erros.append(f'chave "{lit}": o bloco {m.group(1)} tem {achou} ocorrência(s) da palavra "{m.group(3)}"' + ("" if achou else f" — palavras do bloco: {' '.join(w for w, _, _ in b['palavras'])[:240]}"))
    return erros[:25]


def checar_sintaxe(codigo, pasta):
    tmp = pasta / "_sintaxe.mjs"; tmp.write_text(codigo, encoding="utf-8")
    p = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True); tmp.unlink(missing_ok=True)
    return [] if p.returncode == 0 else ["SINTAXE JS inválida:\n" + p.stderr.strip()[-600:]]


def erros_da_inspecao(rc, out):
    if rc != 0: return ["ERRO AO EXECUTAR A CENA:\n" + "\n".join(out.strip().splitlines()[-40:])]
    erros = []; bloco = "?"
    for l in out.splitlines():
        m = re.match(r"INSPEÇÃO DO SISTEMA — bloco (\d+)", l)
        if m: bloco = m.group(1)
        if l.strip().startswith("ERRO "): erros.append(f"[bloco {bloco}] " + l.strip()[5:].strip())
    return erros[:40]


def ciclo_cena(slug, proj, tempo, claude, sis, msgs_base, codigo, rel, historico, tentativas, tag):
    """grava a cena, valida (chaves + sintaxe + inspeção) e pede correção ao Claude até passar"""
    from claude_api import MODELO_FORTE, extrair_codigo
    pasta = MEC / "projetos" / slug
    for tent in range(1, tentativas + 1):
        (pasta / "cena.js").write_text(codigo, encoding="utf-8")
        erros = checar_sintaxe(codigo, pasta) or validar_chaves(codigo, tempo)
        if not erros:
            rc, out = mec("inspecionar", slug, "todos", "--sem-fotos"); erros = erros_da_inspecao(rc, out)
        if not erros:
            rel.etapa("Cena" + (f" ({tag.strip('-')})" if tag else ""), f"(passou na inspeção na tentativa {tent})"); return codigo, True
        historico.append({"tentativa": f"{tag}{tent}", "erros": erros[:12]})
        print(f"[cena] tentativa {tent}: {len(erros)} erro(s)", flush=True)
        if tent == tentativas: break
        pedido = "A VALIDAÇÃO AUTOMÁTICA reprovou a cena. Corrija TODOS estes erros (sem quebrar o que já está certo; chaves de tempo só da lista) e devolva o arquivo INTEIRO em um único bloco ```js:\n\n" + "\n".join(f"- {e}" for e in erros)
        msgs = list(msgs_base) + [{"role": "assistant", "content": "```js\n" + codigo + "```"}, {"role": "user", "content": pedido}]
        codigo = extrair_codigo(claude.pedir(sis, msgs, max_tokens=32000, modelo=MODELO_FORTE if tent >= 2 else None, nome=f"cena-correcao-{tent}"))
    return codigo, False


def etapa_cena(args, slug, proj, tempo, catalogo, ficha, claude, rel, historico):
    from claude_api import extrair_codigo
    sis = sistema_cena(); pedido = pedido_cena(proj, tempo, catalogo, ficha, args.instrucoes)
    msgs = [{"role": "user", "content": pedido}]
    codigo = extrair_codigo(claude.pedir(sis, msgs, max_tokens=32000, nome="cena-1"))
    codigo, ok = ciclo_cena(slug, proj, tempo, claude, sis, msgs, codigo, rel, historico, args.tentativas_cena, "")
    return sis, msgs, codigo, ok


# ============================================================== 6. REVISÃO VISUAL
def etapa_revisao(slug, proj, claude, rel):
    from claude_api import imagem
    prev = MEC / "projetos" / slug / "previas"; conteudo = []
    for b in proj["blocos"]:
        for nome, rot in (("revisao_bloco_%d.jpg", "quadros (2 por segundo)"), ("acoes_bloco_%d.jpg", "um quadro por ação")):
            arq = prev / (nome % b["id"])
            if arq.exists():
                conteudo += [{"type": "text", "text": f"BLOCO {b['id']} — {b['nome']} — {rot}. O que deveria aparecer: {b['cenas']}"}, imagem(str(arq), 1000)]
    if not conteudo: return None
    conteudo.append({"type": "text", "text": "Faça a revisão visual."})
    r = claude.json([(PR.SYS_REVISAO_VISUAL, False)], [{"role": "user", "content": conteudo}], max_tokens=3000, nome="revisao-visual")
    altas = [p for p in r.get("problemas", []) if p.get("gravidade") == "alta"]
    rel.etapa("Revisão visual", f"(nota {r.get('nota', '?')}/10, {len(altas)} problema(s) altos, {len(r.get('problemas', [])) - len(altas)} menores) — {r.get('resumo', '')}")
    for p in r.get("problemas", []):
        if p.get("gravidade") != "alta": rel.aviso(f"revisão visual, bloco {p.get('bloco')}: {p.get('descricao')}")
    return r


# ============================================================== 7. THUMBNAIL e PUBLICAÇÃO
def montar_thumb(quadro, l1, l2, destino):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.open(quadro).convert("RGB").resize((1080, 1920), Image.LANCZOS)
    sombra = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0)); d = ImageDraw.Draw(sombra)
    for y in range(0, 700):
        d.line([(0, y), (1080, y)], fill=(0, 0, 0, int(150 * (1 - y / 700))))
    im = Image.alpha_composite(im.convert("RGBA"), sombra).convert("RGB"); d = ImageDraw.Draw(im)
    fonte = str(MEC / "fonts" / "PoppinsXB.ttf"); y = 120
    for linha, cor in ((l1, (255, 210, 63)), (l2, (255, 255, 255))):
        linha = (linha or "").strip().upper()
        if not linha: continue
        tam = 190
        while tam > 60:
            f = ImageFont.truetype(fonte, tam)
            if d.textlength(linha, font=f) <= 940: break
            tam -= 6
        w = d.textlength(linha, font=f)
        d.text(((1080 - w) / 2, y), linha, font=f, fill=cor, stroke_width=max(8, tam // 14), stroke_fill=(0, 0, 0)); y += int(tam * 1.18)
    im.save(destino, "PNG")


def etapa_thumb(slug, proj, tempo, claude, rel, saida, capa_padrao):
    from claude_api import imagem
    q = MEC / "projetos" / slug / "quadros"; ev = json.loads(ler(MEC / "projetos" / slug / "eventos.json", "{}")); total = tempo["total"]
    tempos = [tempo["blocos"][0]["ini"] + 1.5]
    tempos += [s["t"] + 0.35 for s in ev.get("sons", []) if s["nome"] in ("desaba", "tomba", "erro", "tum")][:4]
    tempos += [total * 0.3, total * 0.55, total - 3.0]
    cand = []
    for t in tempos:
        f0 = int(max(0, min(total - 0.3, t)) * FPS); arq = None
        for d in range(0, 16):                                   # quadro mais próximo que exista (prévia rápida pula quadros)
            for f in (f0 + d, f0 - d):
                if (q / f"f_{f:05d}.jpg").exists(): arq = q / f"f_{f:05d}.jpg"; break
            if arq: break
        if arq and arq not in [c[1] for c in cand]: cand.append((t, arq))
    cand = cand[:8]
    if not cand: rel.aviso("thumbnail: nenhum quadro disponível"); return
    conteudo = []
    for i, (t, arq) in enumerate(cand): conteudo += [{"type": "text", "text": f"Candidato {i} (t={t:.1f}s)"}, imagem(str(arq), 420)]
    conteudo.append({"type": "text", "text": f"Tema: {proj['titulo']}. Sugestão de texto do roteirista: {capa_padrao or '(nenhuma)'}."})
    try:
        r = claude.json([(PR.SYS_THUMB, False)], [{"role": "user", "content": conteudo}], max_tokens=500, nome="thumbnail")
        i = r.get("indice", 0); i = i if isinstance(i, int) and 0 <= i < len(cand) else 0; l1, l2 = r.get("linha1") or capa_padrao, r.get("linha2", "")
    except Exception as e:
        rel.aviso(f"thumbnail: escolha automática falhou ({str(e)[:80]}); usando o 1º candidato"); i, l1, l2 = 0, capa_padrao or proj["titulo"][:24], ""
    montar_thumb(cand[i][1], l1, l2, saida / "thumbnail.png"); rel.etapa("Thumbnail", f"(quadro de {cand[i][0]:.1f}s)")


def etapa_publicacao(proj, creditos, claude, rel, saida):
    roteiro = "\n\n".join(f"Bloco {b['id']} ({b['nome']}): {b['texto']}" for b in proj["blocos"])
    r = claude.json([(PR.SYS_PUBLICACAO, False)], [{"role": "user", "content": f"VÍDEO: {proj['titulo']}\n\nROTEIRO:\n{roteiro}"}], max_tokens=3000, nome="publicacao")
    md = [f"# Publicação — {proj['titulo']}", "", "## Títulos (YouTube Shorts)"] + [f"- {t}" for t in r.get("titulos", [])]
    md += ["", "## Descrição (YouTube Shorts)", r.get("descricao_shorts", ""), "", " ".join(r.get("hashtags_shorts", []))]
    md += ["", "## Legendas (Instagram Reels)"] + [f"{i + 1}. {t}\n" for i, t in enumerate(r.get("reels", []))] + [" ".join(r.get("hashtags_reels", []))]
    md += ["", "## Legenda (TikTok)", r.get("legenda_tiktok", "")]
    if creditos:
        md += ["", "## Créditos dos modelos 3D (colar na descrição)"] + [f'- "{c["titulo"]}" por {c["autor"]} (poly.pizza) — {c["licenca"]}' for c in creditos]
    (saida / "publicacao.md").write_text("\n".join(md) + "\n", encoding="utf-8"); rel.etapa("Textos de publicação")


# ============================================================== 8. APRENDER
def aprender(claude, historico, rel):
    if not historico: return
    resumo = "\n".join(f"tentativa {h['tentativa']}: " + " | ".join(h["erros"][:5])[:700] for h in historico[:8])
    r = claude.json([(PR.SYS_APRENDER, False)], [{"role": "user", "content": f"ERROS CORRIGIDOS:\n{resumo}\n\nLIÇÕES AUTOMÁTICAS QUE JÁ EXISTEM:\n{ler(ARQ_LICOES_AUTO)[-3000:]}"}], max_tokens=800, nome="aprender")
    novas = [re.sub(r"[`#\n\r]+", " ", str(x)).strip()[:360] for x in r.get("licoes", []) if str(x).strip()][:3]
    if novas:
        cab = "" if ARQ_LICOES_AUTO.exists() else "# Lições automáticas (o gerador acrescenta aqui o que aprendeu corrigindo cenas)\n\n"
        with open(ARQ_LICOES_AUTO, "a", encoding="utf-8") as f: f.write(cab + "".join(f"- ({datetime.date.today()}) {l}\n" for l in novas))
        rel.etapa("Aprendizado", f"({len(novas)} lição(ões) nova(s) guardada(s) para os próximos vídeos)")


# ============================================================== MODO TESTE DE INFRAESTRUTURA (sem API)
def modo_teste_infra(args, rel, saida):
    slug = "arcondicionado"; pasta = MEC / "projetos" / slug
    titulo("TESTE DE INFRAESTRUTURA (sem gastar créditos): áudio já gravado + cena de exemplo")
    rc, out = mec("roteiro", slug); rel.etapa("Roteiro de exemplo avaliado")
    rc, out = mec("audio", slug, "--velocidade", "1.15")
    if rc != 0: rel.falha("Alinhamento do áudio"); return False
    rel.etapa("Áudio alinhado palavra a palavra")
    rc, out = mec("inspecionar", slug, "1", "--sem-fotos")
    if rc != 0 or "REPROVADO" in out: rel.falha("Inspeção no Chrome headless", out[-300:]); return False
    rel.etapa("Inspeção (Chrome + WebGL + motor)")
    rc, out = mec("previa", slug, "1", "--rapida")
    mp4 = pasta / "previas" / "bloco_1.mp4"
    if rc != 0 or not mp4.exists(): rel.falha("Prévia (render + ffmpeg + cairo)", out[-300:]); return False
    saida.mkdir(parents=True, exist_ok=True); shutil.copy(mp4, saida / "teste_infra_bloco1.mp4")
    rel.etapa("Prévia do bloco 1 renderizada", "(veja teste_infra_bloco1.mp4 nos artefatos)"); return True


# ============================================================== PRINCIPAL
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tema", default=""); ap.add_argument("--emocao", default="qualquer")
    ap.add_argument("--modo", default="completo", choices=["completo", "so_roteiro", "teste_infra"])
    ap.add_argument("--blocos", default="5"); ap.add_argument("--duracao-max", dest="duracao_max", default="100")
    ap.add_argument("--modelo", default="sonnet", choices=["sonnet", "opus"]); ap.add_argument("--instrucoes", default="")
    ap.add_argument("--rascunho", action="store_true"); ap.add_argument("--tentativas-cena", dest="tentativas_cena", type=int, default=4)
    ap.add_argument("--sem-revisao-visual", dest="sem_revisao", action="store_true")
    ap.add_argument("--saida", default=str(RAIZ / "saida"))
    args = ap.parse_args()
    raiz_saida = Path(args.saida).resolve(); raiz_saida.mkdir(parents=True, exist_ok=True)      # caminho absoluto: o mec.py roda em outra pasta
    rel = Relatorio(); limite = float(args.duracao_max); slug = None; saida = raiz_saida / "execucao"; historico = []; claude = None
    try:
        if args.modo == "teste_infra":
            ok = modo_teste_infra(args, rel, saida); rel.status = "ok" if ok else "falhou"
            return fim(rel, saida, "teste de infraestrutura", slug, ok)
        claude = novo_claude(args); eleven = novo_eleven() if args.modo == "completo" else None      # falha cedo se faltar chave
        titulo("1. TEMA"); tema = etapa_tema(args, claude, rel)
        titulo("2. PESQUISA"); ficha = etapa_pesquisa(tema, claude, rel)
        titulo("3. ROTEIRO"); slug, proj, r = etapa_roteiro(args, tema, ficha, claude, rel, limite, saida)
        saida = raiz_saida / slug; saida.mkdir(parents=True, exist_ok=True)
        if (raiz_saida / "execucao").exists(): shutil.copytree(raiz_saida / "execucao", saida, dirs_exist_ok=True); shutil.rmtree(raiz_saida / "execucao")
        registrar_tema(slug, proj["titulo"], proj.get("tipo_emocao", ""))
        if args.modo == "so_roteiro":
            rel.linhas.append("- ℹ️ modo só roteiro: sem narração, modelos nem render"); rel.status = "ok"
            rel.linhas.append("- modelos 3D que o Claude pediria: " + "; ".join(f"{m.get('objeto')} ({m.get('busca_en')})" for m in r.get("modelos_3d", [])))
            return fim(rel, saida, proj["titulo"], slug, True)
        titulo("4. MODELOS 3D"); catalogo = etapa_modelos(slug, r, claude, rel)
        titulo("5. NARRAÇÃO"); tempo = etapa_audio(slug, proj, eleven, claude, rel)
        proj = json.loads(ler(MEC / "projetos" / slug / "projeto.json")); proj["slug"] = slug
        titulo("6. CENA 3D"); sis, msgs, codigo, ok = etapa_cena(args, slug, proj, tempo, catalogo, ficha, claude, rel, historico)
        if not ok and not args.rascunho:
            rel.falha("Cena", f"não passou na inspeção em {args.tentativas_cena} tentativas (veja inspecao_*.txt e cena.js nos artefatos)")
            guardar_extras(slug, saida); raise Parar("a cena não passou na inspeção automática")
        if not ok: rel.aviso("cena com erros de inspeção (modo rascunho): o vídeo sai mesmo assim")
        titulo("7. PRÉVIAS"); rc, out = mec("previa", slug, "todos", *(["--mesmo-assim"] if not ok else []))
        if rc != 0: raise RuntimeError("mec.py previa falhou")
        rel.etapa("Prévias dos blocos renderizadas")
        if ok and not args.sem_revisao:
            titulo("8. REVISÃO VISUAL"); rev = etapa_revisao(slug, proj, claude, rel)
            altas = [p for p in (rev or {}).get("problemas", []) if p.get("gravidade") == "alta"]
            if altas:
                from claude_api import extrair_codigo
                pedido = "A REVISÃO VISUAL (olhando os quadros renderizados) achou problemas ALTOS. Corrija na cena e devolva o arquivo INTEIRO em um bloco ```js:\n\n" + "\n".join(f"- bloco {p.get('bloco')} ({p.get('onde')}): {p.get('descricao')} → {p.get('como_corrigir')}" for p in altas)
                historico.append({"tentativa": "visual", "erros": [f"[bloco {p.get('bloco')}] {p.get('descricao')}" for p in altas]})
                novo = extrair_codigo(claude.pedir(sis, msgs + [{"role": "assistant", "content": "```js\n" + codigo + "```"}, {"role": "user", "content": pedido}], max_tokens=32000, nome="cena-revisao-visual"))
                novo, ok2 = ciclo_cena(slug, proj, tempo, claude, sis, msgs, novo, rel, historico, 3, "visual-")
                if ok2:
                    rc, out = mec("previa", slug, "todos"); rel.etapa("Cena refeita depois da revisão visual")
                else:
                    (MEC / "projetos" / slug / "cena.js").write_text(codigo, encoding="utf-8"); rel.aviso("a correção da revisão visual não passou na inspeção; mantive a cena anterior")
        titulo("9. VÍDEO FINAL")
        if ok:
            rc, out = mec("aprovar", slug, *[b["id"] for b in proj["blocos"]])
            rc, out = mec("final", slug, "--saida", saida)
        else:
            rc, out = mec("final", slug, "--saida", saida, "--forcar")
        mp4 = saida / f"{slug}.mp4"
        if rc != 0 or not mp4.exists(): raise RuntimeError("mec.py final falhou")
        shutil.move(str(mp4), str(saida / "video.mp4")); (saida / f"{slug}.srt").rename(saida / "video.srt")
        rel.etapa("Vídeo final", "(1080x1920 com legenda, narração e efeitos)" + ("" if ok else " — RASCUNHO com erros de inspeção"))
        titulo("10. THUMBNAIL e PUBLICAÇÃO")
        etapa_thumb(slug, proj, tempo, claude, rel, saida, (r.get("capa") or {}).get("texto", ""))
        cred = []
        idx = ler(MEC / "projetos" / slug / "CREDITOS.md")
        etapa_publicacao(proj, [dict(titulo=m.group(1), autor=m.group(2), licenca=m.group(3)) for m in re.finditer(r'- "(.+?)" por (.+?) \(.*?\) — (.+)', idx)], claude, rel, saida)
        try: aprender(claude, historico, rel)
        except Exception as e: rel.aviso(f"aprendizado automático falhou: {str(e)[:80]}")
        guardar_extras(slug, saida); rel.status = "ok" if ok else "rascunho"
        return fim(rel, saida, proj["titulo"], slug, True, claude)
    except Parar as e:
        rel.status = "parou"; rel.aviso(str(e)); return fim(rel, saida, slug or "execução", slug, False, claude)
    except SystemExit as e:
        rel.falha("Erro", str(e.code)); return fim(rel, saida, slug or "execução", slug, False, claude)
    except Exception as e:
        import traceback; traceback.print_exc(); rel.falha("Erro inesperado", f"{type(e).__name__}: {str(e)[:300]}")
        try:
            if slug: guardar_extras(slug, saida)
        except Exception: pass
        return fim(rel, saida, slug or "execução", slug, False, claude)


def guardar_extras(slug, saida):
    pasta = MEC / "projetos" / slug; ex = saida / "extras"; ex.mkdir(parents=True, exist_ok=True)
    for f in ("cena.js", "projeto.json", "ROTEIRO.md", "AVALIACAO.md", "CREDITOS.md", "tempo.json"):
        if (pasta / f).exists(): shutil.copy(pasta / f, ex / f)
    for f in list((pasta / "previas").glob("*.txt")) + list((pasta / "previas").glob("*.jpg")) + list((pasta / "previas").glob("bloco_*.mp4")):
        shutil.copy(f, ex / f.name)
    if (pasta / "previas" / "problemas").exists():
        for f in (pasta / "previas" / "problemas").glob("*.png"): shutil.copy(f, ex / f.name)


def fim(rel, saida, cab, slug, ok, claude=None):
    saida.mkdir(parents=True, exist_ok=True)
    md = rel.md(f"Relatório — {cab}")
    if claude is not None:
        u = claude.uso; md += f"\n## Uso da API do Claude\n{u['chamadas']} chamadas · {u['entrada']} tokens de entrada · {u['saida']} de saída · {u['cache_leitura']} lidos do cache · {u['cache_escrita']} gravados no cache\n"
    (saida / "relatorio.md").write_text(md, encoding="utf-8")
    json.dump({"slug": slug, "titulo": cab, "status": rel.status, "ok": ok}, open(saida / "resumo.json", "w"), ensure_ascii=False)
    for var, val in (("GITHUB_STEP_SUMMARY", md),):
        if os.environ.get(var): open(os.environ[var], "a", encoding="utf-8").write(val)
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f: f.write(f"slug={slug or ''}\nstatus={rel.status}\npasta={saida}\n")
    print("\n" + md, flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
