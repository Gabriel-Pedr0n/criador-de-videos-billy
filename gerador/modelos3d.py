"""Busca automática de modelos 3D (.glb) no Poly Pizza, com validação e crédito.

Segurança:
  - a chave (POLY_PIZZA_KEY) vem só de variável de ambiente (GitHub Secret) e só vai para api.poly.pizza;
  - só aceita licença CC0 ou CC-BY (nada de SA/NC/ND); o crédito CC-BY é gravado em CREDITOS.md;
  - download só por HTTPS, sem host local/privado, com limite de tamanho;
  - o arquivo é conferido ANTES de ir para a cena: cabeçalho glTF 2.0, JSON válido, sem referência externa
    (uri http/arquivo), limite de triângulos; arquivo suspeito é descartado;
  - o .glb nunca é executado: o motor só o lê como geometria.
  - sem chave ou sem resultado bom, a cena usa as peças do kit (o sistema continua funcionando).
Os detalhes da API (endpoint X-Auth-Token, campos Download/Licence/Creator) vêm da documentação de terceiros do Poly Pizza;
confira em https://poly.pizza/settings/api se algo mudar.
"""
import ipaddress, json, os, re, shutil, socket, struct, unicodedata
from urllib.parse import quote, urlparse

import requests

BASE = "https://api.poly.pizza/v1"
MAX_BYTES = 20 * 1024 * 1024
MAX_TRIS = 60000


def log(*a):
    print("[modelos3d]", *a, flush=True)


def slug(s):
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40] or "modelo"


def licenca_ok(lic):
    l = (lic or "").lower().replace(" ", "")
    if l.startswith("cc0") or "publicdomain" in l: return True
    return l.startswith("cc-by") and not any(x in l for x in ("-sa", "-nc", "-nd"))


def _host_publico(url):
    u = urlparse(url)
    if u.scheme != "https" or not u.hostname: return False
    try:
        for info in socket.getaddrinfo(u.hostname, 443):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved: return False
    except Exception:
        return False
    return True


def validar_glb(dados):
    """Confere a estrutura do .glb. Devolve (ok, motivo, info) com a caixa aproximada [x,y,z] em unidades do modelo."""
    if len(dados) < 28 or dados[:4] != b"glTF": return False, "sem cabeçalho glTF", {}
    versao, total = struct.unpack("<II", dados[4:12])
    if versao != 2 or total != len(dados): return False, "versão/tamanho inconsistente", {}
    tam, tipo = struct.unpack("<II", dados[12:20])
    if tipo != 0x4E4F534A: return False, "primeiro bloco não é JSON", {}
    try:
        j = json.loads(dados[20:20 + tam].decode("utf-8"))
    except Exception:
        return False, "JSON do glTF inválido", {}
    for lista in ("buffers", "images"):
        for item in j.get(lista, []):
            u = item.get("uri")
            if u and not u.startswith("data:"): return False, f"{lista} com referência externa ({u[:40]})", {}
    if not j.get("meshes"): return False, "sem malhas", {}
    tris = 0; mn = [1e9] * 3; mx = [-1e9] * 3
    acc = j.get("accessors", [])
    for m in j["meshes"]:
        for p in m.get("primitives", []):
            ia = p.get("indices")
            if ia is not None and ia < len(acc): tris += acc[ia].get("count", 0) // 3
            pa = p.get("attributes", {}).get("POSITION")
            if pa is not None and pa < len(acc) and "min" in acc[pa] and "max" in acc[pa]:
                for k in range(3): mn[k] = min(mn[k], acc[pa]["min"][k]); mx[k] = max(mx[k], acc[pa]["max"][k])
    if tris > MAX_TRIS: return False, f"{tris} triângulos (limite {MAX_TRIS})", {}
    caixa = [round(mx[k] - mn[k], 3) for k in range(3)] if mx[0] > -1e8 else None
    return True, "ok", {"triangulos": tris, "caixa": caixa}


class PolyPizza:
    def __init__(self, repo_modelos, claude=None):
        self.chave = os.environ.get("POLY_PIZZA_KEY") or os.environ.get("POLYPIZZA_AUTH_TOKEN")
        self.dir = repo_modelos                                  # cache compartilhado: mec/modelos/
        os.makedirs(self.dir, exist_ok=True)
        self.indice_arq = os.path.join(self.dir, "indice.json")
        self.indice = json.load(open(self.indice_arq)) if os.path.exists(self.indice_arq) else {}
        self.claude = claude

    @property
    def ativo(self):
        return bool(self.chave)

    def _salvar_indice(self):
        json.dump(self.indice, open(self.indice_arq, "w"), ensure_ascii=False, indent=1)

    def buscar(self, termo, limite=12):
        r = requests.get(f"{BASE}/search/{quote(termo)}", headers={"X-Auth-Token": self.chave},
                         params={"limit": limite, "format": "glb"}, timeout=30)
        if r.status_code in (401, 403):
            log("Poly Pizza recusou a chave (POLY_PIZZA_KEY); seguindo só com o kit")
            self.chave = None; return []
        if r.status_code == 429:
            import time; time.sleep(2); return []
        r.raise_for_status()
        out = []
        for m in r.json().get("results", []):
            if not m.get("Download") or not licenca_ok(m.get("Licence")): continue
            if m.get("Animated"): continue
            if (m.get("TriangleCount") or 0) > MAX_TRIS: continue
            out.append(m)
        return out

    def escolher(self, objeto, candidatos):
        """o Claude escolhe o candidato que mais combina com a cena (texto apenas, barato); sem Claude, o primeiro CC0."""
        if not candidatos: return None
        if self.claude is None or len(candidatos) == 1:
            return sorted(candidatos, key=lambda m: 0 if (m.get("Licence") or "").lower().startswith("cc0") else 1)[0]
        linhas = [f'{i}: "{m.get("Title")}" | {m.get("TriangleCount")} tri | {m.get("Licence")} | tags: {", ".join((m.get("Tags") or [])[:6])}' for i, m in enumerate(candidatos)]
        r = self.claude.json([("Você escolhe modelos 3D low-poly para um vídeo de desenho animado infantil-técnico. Prefira o objeto CERTO, simples, limpo, de um objeto só (nada de cena inteira, personagem ou várias peças soltas), poucos triângulos. Responda JSON: {\"indice\": N} ou {\"indice\": null} se nenhum serve.", False)],
                             [{"role": "user", "content": f'Preciso de: {objeto}\n\nCandidatos:\n' + "\n".join(linhas)}], max_tokens=200, nome="escolha-modelo")
        i = r.get("indice")
        return candidatos[i] if isinstance(i, int) and 0 <= i < len(candidatos) else None

    def baixar(self, m):
        url = m["Download"]
        if not _host_publico(url):
            log("download recusado (URL não-HTTPS ou host interno):", url[:60]); return None
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            dados = bytearray()
            for pedaco in r.iter_content(65536):
                dados += pedaco
                if len(dados) > MAX_BYTES: log("modelo grande demais; descartado"); return None
        ok, motivo, info = validar_glb(bytes(dados))
        if not ok:
            log(f'modelo "{m.get("Title")}" descartado: {motivo}'); return None
        arq = f'{slug(m.get("Title"))}-{str(m.get("ID"))[:6]}.glb'
        open(os.path.join(self.dir, arq), "wb").write(dados)
        cr = m.get("Creator") or {}
        self.indice[str(m["ID"])] = {"arquivo": arq, "titulo": m.get("Title"), "licenca": m.get("Licence"), "autor": cr.get("Username"),
                                     "url_autor": cr.get("PURL"), "triangulos": info["triangulos"], "caixa": info["caixa"], "termos": []}
        return str(m["ID"])

    def obter(self, objeto, busca_en):
        """Devolve o registro do índice para um objeto (do cache ou baixando). None se nada serviu."""
        chave_termo = slug(busca_en)
        for id_, reg in self.indice.items():                       # já temos? reaproveita (poupa API e tempo)
            if chave_termo in reg.get("termos", []) and os.path.exists(os.path.join(self.dir, reg["arquivo"])):
                return id_, reg
        if not self.ativo: return None
        try:
            cand = self.buscar(busca_en)
            if not cand and " " in busca_en.strip():
                cand = self.buscar(busca_en.split()[-1])
            esc = self.escolher(objeto, cand)
            if not esc: return None
            id_ = str(esc["ID"])
            if id_ not in self.indice or not os.path.exists(os.path.join(self.dir, self.indice[id_]["arquivo"])):
                id_ = self.baixar(esc)
                if not id_: return None
            self.indice[id_]["termos"] = sorted(set(self.indice[id_].get("termos", []) + [chave_termo]))
            self._salvar_indice()
            return id_, self.indice[id_]
        except Exception as e:
            log(f'falha ao buscar "{busca_en}": {str(e)[:160]}')
            return None


def preparar(lista, pasta_projeto, poly):
    """lista: [{objeto, busca_en, essencial}]. Copia os modelos achados para projetos/<slug>/modelos/ e devolve o catálogo para a cena."""
    cat = []; creditos = []
    os.makedirs(os.path.join(pasta_projeto, "modelos"), exist_ok=True)
    for item in lista[:6]:
        r = poly.obter(item["objeto"], item["busca_en"])
        if not r:
            log(f'sem modelo para "{item["objeto"]}" -> a cena usa o kit'); continue
        id_, reg = r
        shutil.copy(os.path.join(poly.dir, reg["arquivo"]), os.path.join(pasta_projeto, "modelos", reg["arquivo"]))
        cat.append({"objeto": item["objeto"], "arquivo": reg["arquivo"], "titulo": reg["titulo"], "caixa_aprox": reg["caixa"], "triangulos": reg["triangulos"]})
        if reg not in creditos: creditos.append(reg)
    if creditos:
        linhas = ["# Créditos dos modelos 3D (Poly Pizza)", ""]
        for r in creditos:
            linhas.append(f'- "{r["titulo"]}" por {r["autor"]} ({r["url_autor"] or "poly.pizza"}) — {r["licenca"]}')
        open(os.path.join(pasta_projeto, "CREDITOS.md"), "w", encoding="utf-8").write("\n".join(linhas) + "\n")
    return cat, creditos
