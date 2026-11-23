# Billy Constrói · Gerador de vídeos (GitHub Actions + API)

Você abre uma página (GitHub Pages), escreve um tema (ou deixa em branco) e aperta **Gerar vídeo**. O GitHub roda o sistema `mec` por você:

```
tema (seu ou do Claude, sem repetir os já usados)
 → pesquisa na web (ficha técnica) → roteiro avaliado pela fórmula do canal
 → modelos 3D (.glb) buscados no Poly Pizza, só CC0/CC-BY, validados
 → narração direto na ElevenLabs (voz do Will) → alinhamento palavra a palavra
 → cena 3D escrita pelo Claude + inspeção automática (corrige sozinho até passar)
 → prévias → revisão visual (Claude olha os quadros) → vídeo final 1080x1920 + .srt
 → thumbnail + títulos, descrição e legendas (com o crédito dos modelos)
```
Tudo gasta **créditos da API** (Claude e ElevenLabs), não o seu chat. O resultado fica na aba **Releases** do repositório e aparece na página.

## Instalação (uma vez só)

1. **Repositório.** Crie um repositório no GitHub e envie esta pasta inteira (`git init`, `git add .`, `git commit`, `git push`). *Pages grátis exige repositório público; o código vai ficar visível, mas as chaves não (ficam em Secrets).*
2. **Secrets** (repositório → *Settings → Secrets and variables → Actions → New repository secret*):
   | Nome | Para quê |
   |---|---|
   | `ANTHROPIC_API_KEY` | chave da API do Claude (console.anthropic.com) |
   | `ELEVENLABS_API_KEY` | chave da ElevenLabs (precisa de permissão *Text to Speech* e *Models* de leitura) |
   | `POLY_PIZZA_KEY` | *(opcional)* chave grátis em poly.pizza/settings/api. Sem ela, os modelos ficam só no kit do sistema |

   *Variables* opcionais: `ELEVENLABS_VOICE_ID` (padrão: Will `CstacWqMhJQlnfLPxRG4`), `ELEVENLABS_MODEL` (padrão `eleven_v4`; se a conta não tiver, usa o melhor disponível), `MODELO_CLAUDE` e `MODELO_CLAUDE_FORTE`.
3. **Pages:** *Settings → Pages → Deploy from a branch → `main` / pasta `/docs`*. A página fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
4. **Token da página:** na própria página, abra "Como criar o token". É um token *fine-grained* só deste repositório (Actions: leitura e escrita; Contents: leitura). Ele fica só no seu navegador.
5. **Primeiro uso, nesta ordem:**
   1. **Teste do sistema** (grátis): ensaia o Chrome/WebGL, o ffmpeg e a composição com o projeto de exemplo.
   2. **Só tema + roteiro**: gasta só o Claude, em minutos.
   3. **Vídeo completo.**

   Pode disparar também pelo GitHub: *Actions → Gerar vídeo Billy Constrói → Run workflow*.

## O que sai

Em *Releases* (e nos *Artifacts* por 30 dias): `video.mp4`, `video.srt`, `thumbnail.png`, `publicacao.md` (3 títulos, descrição, legendas do Reels/TikTok, créditos CC-BY) e `relatorio.md` (o que cada etapa fez e quantos tokens usou). Nos *Artifacts* também vão `cena.js`, as folhas de revisão e as fotos de qualquer erro.

## Como ele se corrige sozinho

- **Roteiro:** o `mec.py roteiro` confere a fórmula; se reprovar, o Claude reescreve (até 4 vezes).
- **Duração:** passou do limite? Ele acelera até 8% e, se precisar, corta frases e regrava só o bloco afetado.
- **Cena:** antes de abrir o navegador, confere sintaxe e se cada chave de tempo (`"3:palavra#2"`) existe no bloco. Depois roda a inspeção do sistema (objeto atravessando, flutuando, câmera, Billy ≥ 50% em cena, limbo…) e devolve os erros ao Claude (4 tentativas; na 3ª sobe para o Opus).
- **Revisão visual:** o Claude olha as folhas de quadros e só reescreve se achar problema *alto* (uma rodada).
- **Memória:** o que ele aprende corrigindo cenas vai para `gerador/LICOES_AUTO.md`; temas usados em `gerador/estado/`; modelos baixados em `mec/modelos/` (reaproveitados). Sua `mec/LICOES.md` continua sendo só sua.

## Segurança

- Chaves só em *Secrets*; a página nunca as vê. Entradas do formulário vão para o script por variáveis de ambiente (sem injeção de comando).
- Modelos 3D: só CC0/CC-BY, HTTPS, host público, até 20 MB, `.glb` conferido (cabeçalho, sem referência externa, ≤ 60 mil triângulos). O arquivo só é lido como geometria.
- Só quem tem escrita no repositório consegue disparar o workflow.

## Ajustes

| Quero mudar… | Onde |
|---|---|
| fórmula do roteiro, tom, checklist da cena | `gerador/prompts.py` |
| regras do Billy e do cenário | `gerador/prompts/regras_billy.md` e `mec/LICOES.md` |
| limite de duração (hoje 1:40; opção 2:05) | campo "Duração máxima" |
| voz, modelo de voz | Variables `ELEVENLABS_VOICE_ID` / `ELEVENLABS_MODEL` |

## O que você precisa saber (sem enfeite)

- **A inspeção garante que não há bug físico, não que o vídeo está bonito.** Assista antes de postar; se algo ficar abaixo do que você aprovaria no chat, use *Instruções extras* ou edite `LICOES.md`.
- A cena é gerada **sem você aprovar prévia por bloco**. O modo *Rascunho* entrega o vídeo mesmo com erros de inspeção (marcado como pré-release).
- A integração com o Poly Pizza foi escrita pela documentação pública de terceiros e não foi testada ao vivo; se a API mudar, ela cai para o kit sem derrubar o vídeo (veja o aviso no relatório).
- Duração: a skill diz máx. 1:40, o prompt v2.8 do zip diz até 2:00. O padrão aqui é 1:40.
- GitHub Actions: repositório público tem minutos grátis; no privado, o render pesa na cota do plano.
