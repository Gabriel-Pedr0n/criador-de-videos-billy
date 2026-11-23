"""Narração direto pela API da ElevenLabs (voz do Will). A chave vem SÓ de ELEVENLABS_API_KEY (GitHub Secret)."""
import os, sys, time

import requests

BASE = "https://api.elevenlabs.io/v1"
VOZ_PADRAO = "CstacWqMhJQlnfLPxRG4"          # Will – Deep, Smooth and Affectionate (a voz do canal)
MODELO_PADRAO = "eleven_v4"                   # o que o canal usa hoje; se a conta não tiver, cai para o melhor disponível
ORDEM_MODELOS = ["eleven_v4", "eleven_v3", "eleven_multilingual_v2"]


def log(*a):
    print("[eleven]", *a, flush=True)


class Eleven:
    def __init__(self):
        self.chave = os.environ.get("ELEVENLABS_API_KEY")
        if not self.chave:
            sys.exit("faltou o secret ELEVENLABS_API_KEY (Settings > Secrets and variables > Actions)")
        self.voz = os.environ.get("ELEVENLABS_VOICE_ID") or VOZ_PADRAO
        self.h = {"xi-api-key": self.chave}
        self.modelo = self._modelo(os.environ.get("ELEVENLABS_MODEL") or MODELO_PADRAO)
        self.chars = 0

    def _modelo(self, desejado):
        try:
            r = requests.get(f"{BASE}/models", headers=self.h, timeout=30)
            if r.status_code in (401, 403):
                sys.exit("ElevenLabs recusou o secret ELEVENLABS_API_KEY (chave inválida ou sem permissão de leitura de modelos)")
            r.raise_for_status()
            ids = [m["model_id"] for m in r.json() if m.get("can_do_text_to_speech")]
        except Exception as e:
            log("não consegui listar os modelos (", str(e)[:100], ") — usando", desejado)
            return desejado
        if desejado in ids:
            return desejado
        for m in ORDEM_MODELOS:
            if m in ids:
                log(f"modelo {desejado} não existe nesta conta; usando {m}")
                return m
        log(f"modelo {desejado} não existe nesta conta; usando {ids[0]}")
        return ids[0]

    def creditos(self):
        """caracteres restantes no plano (None se a chave não tiver permissão de leitura)"""
        try:
            r = requests.get(f"{BASE}/user/subscription", headers=self.h, timeout=30)
            r.raise_for_status(); j = r.json()
            return int(j["character_limit"]) - int(j["character_count"])
        except Exception:
            return None

    def gerar(self, texto, destino, anterior="", seguinte=""):
        """TTS de um bloco -> mp3. Usa o contexto dos blocos vizinhos (entonação contínua) quando o modelo aceita."""
        corpo = {"text": texto, "model_id": self.modelo}
        if anterior: corpo["previous_text"] = anterior[-400:]
        if seguinte: corpo["next_text"] = seguinte[:400]
        url = f"{BASE}/text-to-speech/{self.voz}?output_format=mp3_44100_128"
        ultimo = ""
        for tent in range(5):
            r = requests.post(url, headers={**self.h, "Content-Type": "application/json", "Accept": "audio/mpeg"}, json=corpo, timeout=300)
            if r.status_code == 200 and len(r.content) > 4000:
                os.makedirs(os.path.dirname(destino), exist_ok=True)
                open(destino, "wb").write(r.content); self.chars += len(texto)
                return destino
            ultimo = f"HTTP {r.status_code}: {r.text[:300]}"
            if r.status_code in (400, 422) and ("previous_text" in corpo or "next_text" in corpo):
                log("o modelo não aceita contexto de texto; repetindo sem ele")
                corpo.pop("previous_text", None); corpo.pop("next_text", None); continue
            if r.status_code in (401, 403):
                sys.exit(f"ElevenLabs recusou a chave/permissão ({ultimo})")
            if r.status_code == 402 or "quota" in r.text.lower():
                sys.exit(f"ElevenLabs sem créditos suficientes: {ultimo}")
            time.sleep(2 ** tent)
        sys.exit(f"ElevenLabs falhou depois de várias tentativas: {ultimo}")
