"""Resumo da API do motor (E) e do kit (K), extraído do código REAL do sistema a cada execução.
Assim o Claude sempre vê os nomes e parâmetros certos, mesmo depois de você mexer no motor."""
import os, re

ARQ_E = ["engine.js", "extras.js"]
ARQ_K = ["kit.js", "kit2.js", "kit3.js"]


def _comentarios_acima(linhas, i, maximo=3):
    out = []
    j = i - 1
    while j >= 0 and linhas[j].strip().startswith("//") and len(out) < maximo:
        out.append(linhas[j].strip().lstrip("/ ").strip()); j -= 1
    return list(reversed(out))


def _extrair(caminho, prefixo):
    linhas = open(caminho, encoding="utf-8").read().splitlines(); res = []
    for i, l in enumerate(linhas):
        m = re.match(r"^\s*(?:%s)\.(\w+)\s*=\s*(?:async\s*)?(\([^)]*\)|\w+)\s*=>" % prefixo, l)
        nome = params = None
        if m:
            nome, params = m.group(1), m.group(2)
        elif prefixo == "E":
            m2 = re.match(r"^  (?:async\s+)?([a-zA-Z]\w*)\(([^)]*)\)\s*\{", l)       # método de classe (engine.js)
            if m2 and m2.group(1) not in ("constructor", "if", "for", "while", "switch"):
                nome, params = m2.group(1), "(" + m2.group(2) + ")"
        if not nome or nome.startswith("_"): continue
        if not params.startswith("("): params = "(" + params + ")"
        cm = re.search(r"//\s*(.{4,200})$", l)
        doc = " ".join(_comentarios_acima(linhas, i)) or (cm.group(1).strip() if cm else "")
        doc = re.sub(r"[-=]{4,}\s*", "", doc).strip()
        res.append(f"{prefixo}.{nome}{params}" + (f"   — {doc[:260]}" if doc else ""))
    return res


def gerar(pasta_engine):
    saida = ["# API REAL do motor (extraída do código; use exatamente estes nomes)", "", "## E (motor: tempo, ações, câmera, personagem)"]
    vistos = set()
    for a in ARQ_E:
        p = os.path.join(pasta_engine, a)
        if os.path.exists(p):
            for l in _extrair(p, "E"):
                k = l.split("(")[0]
                if k not in vistos: vistos.add(k); saida.append("- " + l)
    saida += ["", "## K (kit de peças e mundos)"]
    for a in ARQ_K:
        p = os.path.join(pasta_engine, a)
        if os.path.exists(p):
            for l in _extrair(p, "K"):
                k = l.split("(")[0]
                if k not in vistos: vistos.add(k); saida.append("- " + l)
    ch = os.path.join(pasta_engine, "chars.js")
    if os.path.exists(ch):
        txt = open(ch, encoding="utf-8").read()
        poses = sorted(set(re.findall(r"^\s{2}(\w+):\s*\{", txt[txt.find("const POSES"):], re.M)) | set(re.findall(r"^POSES\.(\w+)\s*=", txt, re.M)))
        saida += ["", "## Poses do Billy (E.anima(m, [[quando, 'pose', dur], ...]))", ", ".join(poses)]
    return "\n".join(saida) + "\n"


if __name__ == "__main__":
    import sys
    print(gerar(sys.argv[1] if len(sys.argv) > 1 else "mec/engine"))
