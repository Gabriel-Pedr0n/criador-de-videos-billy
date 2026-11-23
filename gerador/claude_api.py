"""Cliente fino da API da Anthropic: streaming, cache de prompt, pesquisa na web, imagens e extração de JSON/código.

A chave vem SÓ da variável de ambiente ANTHROPIC_API_KEY (GitHub Secret). Nunca é impressa.
"""
import base64, json, os, re, sys, time

import anthropic

MODELO_PADRAO = os.environ.get("MODELO_CLAUDE") or "claude-sonnet-5-5"
MODELO_FORTE = os.environ.get("MODELO_CLAUDE_FORTE") or "claude-opus-5-5"
FERRAMENTA_BUSCA = {"type": "web_search_20250305", "name": "web_search", "max_uses": 6}


def log(*a):
    print("[claude]", *a, flush=True)


def texto_de(msg):
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")


def extrair_json(txt):
    """Primeiro objeto/array JSON do texto (aceita cerca ```json)."""
    m = re.search(r"```(?:json)?\s*(.+?)```", txt, re.S)
    cand = m.group(1) if m else txt
    ini = min([i for i in (cand.find("{"), cand.find("[")) if i >= 0], default=-1)
    if ini < 0:
        raise ValueError("resposta sem JSON")
    abre = cand[ini]; fecha = "}" if abre == "{" else "]"
    prof = 0; dentro = False; esc = False
    for i in range(ini, len(cand)):
        c = cand[i]
        if dentro:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': dentro = False
            continue
        if c == '"': dentro = True
        elif c == abre: prof += 1
        elif c == fecha:
            prof -= 1
            if prof == 0:
                return json.loads(cand[ini:i + 1])
    raise ValueError("JSON incompleto na resposta")


def extrair_codigo(txt, linguagem="js"):
    """Maior bloco ```js ... ``` da resposta (a cena inteira)."""
    blocos = re.findall(r"```(?:%s|javascript)?\s*\n(.*?)```" % linguagem, txt, re.S)
    if not blocos:
        # resposta cortada sem fechar a cerca
        m = re.search(r"```(?:%s|javascript)?\s*\n(.*)" % linguagem, txt, re.S)
        if m: blocos = [m.group(1)]
    if not blocos:
        raise ValueError("resposta sem bloco de código")
    return max(blocos, key=len).strip() + "\n"


def imagem(caminho, largura_max=1100):
    """bloco de imagem (jpeg) para a API, reduzido para não gastar tokens à toa"""
    from PIL import Image
    import io
    im = Image.open(caminho).convert("RGB")
    if im.width > largura_max:
        im = im.resize((largura_max, int(im.height * largura_max / im.width)))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82)
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(buf.getvalue()).decode()}}


class Claude:
    def __init__(self):
        if not os.environ.get("ANTHROPIC_API_KEY"):
            sys.exit("faltou o secret ANTHROPIC_API_KEY (Settings > Secrets and variables > Actions)")
        self.c = anthropic.Anthropic(max_retries=5, timeout=900.0)
        self.uso = {"entrada": 0, "saida": 0, "cache_leitura": 0, "cache_escrita": 0, "chamadas": 0}
        self.modelo = MODELO_PADRAO

    # ------------------------------------------------------------------
    def _soma(self, msg):
        u = msg.usage
        self.uso["entrada"] += getattr(u, "input_tokens", 0) or 0
        self.uso["saida"] += getattr(u, "output_tokens", 0) or 0
        self.uso["cache_leitura"] += getattr(u, "cache_read_input_tokens", 0) or 0
        self.uso["cache_escrita"] += getattr(u, "cache_creation_input_tokens", 0) or 0
        self.uso["chamadas"] += 1

    def _sistema(self, partes):
        """partes: lista de (texto, cacheavel). Só o prefixo estável vai para o cache."""
        out = []
        for txt, cache in partes:
            b = {"type": "text", "text": txt}
            if cache: b["cache_control"] = {"type": "ephemeral"}
            out.append(b)
        return out

    def pedir(self, sistema, mensagens, modelo=None, max_tokens=16000, busca=False, nome="chamada"):
        """Devolve o texto da resposta. busca=True liga a pesquisa na web (cai para sem pesquisa se a conta não permitir)."""
        modelo = modelo or self.modelo
        kw = dict(model=modelo, max_tokens=max_tokens, system=self._sistema(sistema), messages=list(mensagens))
        if busca:
            kw["tools"] = [FERRAMENTA_BUSCA]
        t0 = time.time(); texto = ""
        for _ in range(5):                                     # pause_turn: a pesquisa pode continuar em outra chamada
            try:
                with self.c.messages.stream(**kw) as s:
                    msg = s.get_final_message()
            except anthropic.BadRequestError as e:
                if busca and "tools" in kw:
                    log(f"{nome}: pesquisa na web indisponível nesta conta/modelo ({str(e)[:140]}); seguindo SEM pesquisa")
                    kw.pop("tools", None); busca = False; continue
                raise
            self._soma(msg); texto += texto_de(msg)
            if msg.stop_reason == "pause_turn":
                kw["messages"] = list(kw["messages"]) + [{"role": "assistant", "content": msg.content}]
                continue
            if msg.stop_reason == "max_tokens":
                log(f"{nome}: resposta cortada em max_tokens ({max_tokens})")
            break
        log(f"{nome}: {modelo} em {time.time() - t0:.0f}s (tokens: {self.uso['entrada']} ent / {self.uso['saida']} saída / {self.uso['cache_leitura']} cache)")
        return texto

    def json(self, sistema, mensagens, **kw):
        txt = self.pedir(sistema, mensagens, **kw)
        try:
            return extrair_json(txt)
        except Exception:
            # uma segunda chance: pede só o JSON
            txt2 = self.pedir(sistema, list(mensagens) + [{"role": "assistant", "content": txt[:6000]}, {"role": "user", "content": "Responda SOMENTE com o JSON válido, sem comentários."}], **kw)
            return extrair_json(txt2)
