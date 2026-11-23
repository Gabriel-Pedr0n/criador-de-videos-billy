# BILLY CONSTRÓI — Sistema "VOCÊ CONSTRÓI" (v2.2)

Sistema completo para produzir os vídeos do canal: roteiro avaliado pela
fórmula, narração por blocos, mundo 3D com o mascote como protagonista,
inspeção automática de bugs, prévia por bloco, aprovação e vídeo final.

As regras de conteúdo estão em `REGRAS.md`. Este manual explica a máquina.

## 1. O que mudou da v1 para a v2

Vindo da análise de dois vídeos muito virais do formato (arranha-céu e casa de tijolos):

| Novo | Onde |
|---|---|
| Avaliação automática do ROTEIRO pela fórmula (gancho, ciclos, nomes, "é por isso que", humor, fecho, comente, ritmo) | `mec.py roteiro` |
| Ritmo de fala medido e ajustável (referências: 3,6 palavras/s) | `mec.py audio --velocidade 1.15` |
| Desastre de verdade: parede desaba tijolo por tijolo, objeto tomba | `E.desaba`, `E.tomba` |
| Rebobinar o erro (◀◀ + riscos de fita) e obra acelerada (▶▶) | `E.rebobina`, `E.acelera` |
| Pílula branca com a causa do problema, linha de medida, cartão "comente" | `E.nota`, `E.medida`, `E.cta` |
| Objeto acende em amarelo quando o nome é falado | `E.destaca` (automático no `E.rotulo`) |
| Raio-X, setas de peso/aperto/puxão | `E.raioX`, `E.peso`, `E.par`, `E.setas` |
| Umidade subindo, goteira, vento, confete | `E.umidade`, `E.gotas`, `E.vento`, `E.confete` |
| Mascote protagonista: anda sozinho, vira, põe óculos | `E.anda`, `E.vira`, `E.oculos` |
| Bairro inteiro de cenário, tijolo à vista, parede com vão, telhado, janela, porta | `K.mundoBairro`, `K.parede`, `K.telhado`… |
| Inspeção: presença do personagem, pés patinando, quadro vazio | `mec.py inspecionar` / `previa` |

## 2. O que tem dentro

| Pasta/arquivo | O que faz |
|---|---|
| `mec.py` | Os comandos do sistema |
| `engine/engine.js` | Motor 3D: tempo sincronizado com a fala, ações, câmera contínua, mascote |
| `engine/extras.js` | Ações v2 (desabar, rebobinar, nota, medida, partículas, andar, comente…) |
| `engine/kit.js`, `engine/kit2.js` | Peças e mundos prontos |
| `engine/inspetor.js` | Inspetor automático de bugs de cena |
| `engine/chars.js` | Mascote do canal |
| `lib/alinhar.py` | Sincroniza cada palavra do texto com o áudio |
| `lib/comp.py` | Legenda de 1 palavra, etiquetas, pílulas, medidas, ícones, cartão final |
| `lib/sfx.py` | Efeitos sonoros gerados pelo próprio sistema |
| `lib/shoot.py` | Renderiza os quadros 3D (Chromium + Playwright) |
| `lib/thumb_modelo_antigo.py` | Base das thumbnails no modelo antigo |
| `projetos/<nome>/` | Um vídeo: `projeto.json`, `cena.js`, áudios, prévias, final |
| `projetos/demo/` | Exemplo que roda e usa as ações novas |

Requisitos: Python 3 com `playwright` (Chromium), `pycairo`, `numpy`, `Pillow`, e `ffmpeg`.

## 3. Fluxo de um vídeo (sempre nesta ordem)

```
python3 mec.py novo chuveiro "Você instala um chuveiro elétrico" --blocos 5
   -> preencher projetos/chuveiro/projeto.json (texto, termos e cenas de cada bloco)
python3 mec.py roteiro chuveiro        # AVALIA o roteiro + gera os textos por bloco + duração estimada
python3 mec.py audio chuveiro b1.mp3 b2.mp3 b3.mp3 b4.mp3 b5.mp3 [--velocidade 1.15]
   -> escrever projetos/chuveiro/cena.js usando os tempos reais das palavras
python3 mec.py previa chuveiro 1       # INSPEÇÃO -> render -> prévia do bloco 1 + folhas de revisão
python3 mec.py form chuveiro           # formulário de avaliação (com o parecer do sistema)
python3 mec.py alterar chuveiro 2 "a câmera está longe do disjuntor"
python3 mec.py aprovar chuveiro 1 3
python3 mec.py status chuveiro
python3 mec.py final chuveiro --saida /mnt/user-data/outputs      # só com TODOS os blocos aprovados
```

Travas:
- `roteiro` mostra ✓/✗ para cada ponto da fórmula. Com ✗, reescrever antes de gravar.
- `audio` mede duração e ritmo. Acima de 1:40 avisa e não deixa seguir calado.
- `previa` roda a inspeção ANTES de renderizar. Bloco com ERRO não vira prévia.
- `aprovar` só aceita bloco que passou na inspeção.
- `final` recusa bloco não aprovado, sem áudio real, reprovado ou acima do limite.
- Se a cena ou o áudio mudarem, os quadros antigos são refeitos sozinhos.

## 4. As duas avaliações automáticas

### Roteiro (`mec.py roteiro`)
Gancho "Se você… não vai ter… Vai ter… Porque…" · 4 a 9 ciclos "Então você" · um "Mas" antes de cada ·
nome técnico só depois de "Esse é / Essa é" · "É por isso que" · humor "Coloque…" · fecho "Agora é só… Parabéns, você…" ·
dois "comente" (e nada de "segue o Billy Constrói" no fim) · ritmo 3,0–3,8 palavras/s · frases curtas · palavras por ciclo.

### Cena (`mec.py inspecionar` e dentro de `previa` / `final`)
| Reprova (ERRO) | Só avisa |
|---|---|
| objeto dentro de outro | peça sem apoio (flutuando) |
| personagem dentro de objeto, deslizando sem andar, flutuando ou afundado | personagem entre 50% e 70% do bloco |
| parte do corpo do personagem dentro dele mesmo (mão na cabeça, braço no tronco) ou dentro de outro objeto | |
| personagem em menos de 50% do bloco | |
| salto de movimento (teleporte) | personagem andando rápido demais (pés patinam) |
| câmera atravessando objeto ou o chão, tranco de câmera |
| LIMBO: vazio do fundo do mundo aparecendo (vão sem preencher, borda de corte) | peça pequena demais na tela |
| ação fora do quadro ou escondida atrás de algo | tela parada, quadro quase vazio, 3,6 s sem ação nova, termo sem etiqueta |

As poses do personagem passam por auditoria (`window.auditarPoses()` no motor): nenhuma pode ter parte do corpo dentro de outra.
Para cada erro sai uma foto em `previas/problemas/`. O que é de propósito precisa ser declarado:
`E.permite(a, b)` (um dentro do outro) e `E.fixo(obj)` (preso na parede/teto).
Depois da inspeção ainda se olham `revisao_bloco_N.jpg` (2 quadros/s) e `acoes_bloco_N.jpg` (1 quadro por ação).

## 5. Como escrever a cena (`cena.js`)

```js
export default async function (E, K) {
  K.mundoBairro({ lote: { x0: -6, x1: 6, z0: -5, z1: 5 } });
  const m = E.mascote({ pos: [-1.2, 0, 3.4], rotY: 0.2 });
  const errada = K.em(K.blocos({ cols: 12, fiadas: 7, cor: K.COR.tijolo }), 0, 0, 0, "parede sem fundação");
  E.acelera("1:ini", "1:quadrado");  E.constroi(errada, "1:ini", "1:quadrado");
  E.nota("TERRA FOFA", [0, 0, 0.8], "1:porque");  E.peso(errada, "1:peso", "1:tomba");
  E.desaba(errada, "1:entulho");  E.errado(errada, "1:entulho", "1:entao");
  E.rebobina(errada, "1:entao", ["1:entao", 0.8]);
  E.camera("1:ini", [-0.5, 1.45, 5.7], [-1.2, 1.0, 3.4], 40);     // abre perto do personagem
  E.camera("1:fim", [3, 2.5, 8], [-1, 0.8, 0.8], 48);
}
```

### Tempo (sincronizado com a narração)
`"2:brocas"` começo da palavra no bloco 2 · `"2:brocas>"` fim · `"2:brocas#2"` segunda vez ·
`"2:ini"` / `"2:fim"` · `"2@3.5"` 3,5 s após o início do bloco · `["2:brocas", 0.4]` com atraso · número = segundos globais.

### Ações (E)
| Ação | Uso |
|---|---|
| `E.entra(obj, quando, {modo})` | `cai`, `cresce`, `pop`, `desliza`, `surge`, `nada` |
| `E.sai(obj, quando, {modo})` | `some`, `pop`, `desliza` |
| `E.move(obj, quando, {para, por, rot, gira, escala, dur})` | movimento, rotação, escala |
| `E.constroi(muro, de, ate)` | muro/piso de `K.blocos` sobe peça por peça |
| `E.acelera(de, ate)` | ícone ▶▶ de obra em câmera rápida |
| `E.desaba(muro, quando, {dir})` · `E.tomba(obj, quando, {dir})` | o desastre: desmorona tijolo a tijolo / tomba inteiro, com poeira |
| `E.rebobina(objs, de, ate, {para})` | ◀◀ o erro volta no tempo e some (ou para em `para`) |
| `E.errado(obj, de, ate)` · `E.certo(ponto, quando)` | vermelho + X · check verde |
| `E.rotulo("TERMO", obj, de, ate, desloc)` | etiqueta amarela; o objeto acende sozinho |
| `E.nota("CAUSA", ponto, de, ate, {cor})` | pílula branca com bolinha (vermelha padrão; `'#2F6FE0'` para água) |
| `E.medida(a, b, "2,60 m", de, ate)` | linha de medida com valor |
| `E.destaca(obj, de, ate)` · `E.raioX(objs, de, ate, opacidade)` | acender em amarelo · ver por dentro |
| `E.peso(obj, de, ate)` · `E.par(a, b, 'aperto'|'puxao', de, ate)` · `E.setas([[a,b]…], de, ate, {cor})` | forças |
| `E.umidade(região, de, ate)` · `E.gotas(ponto, de, ate)` · `E.vento(de, ate, {area})` · `E.chuva(de, ate)` · `E.poeira(ponto, quando)` | partículas |
| `E.confete(ponto, quando)` · `E.cta("SABIA", "NAOSABIA", quando)` | final |
| `E.camera(quando, posição, alvo, fov)` | pontos da câmera; um plano contínuo, nunca parada |
| `E.mascote({pos, rotY})` · `E.anima(m, [[quando, 'pose', dur]])` | poses: idle, wave, cheer, jump, reach, scared, worried, shrug, ache, dizzy… + gestos do Billy: explica, aponta, mexe, abana, joinha, calor, frio (lição 43: comemorar só no Parabéns) |
| `E.voz(m, nome, quando, {ganho, dur})` | barulho de voz fininha SEM palavras: wii, uhu, hum, ops, ai, uau, brr, haha, ufa, eba (boca abre junto) |
| `E.anda(m, de, ate, [x, z], {vira})` · `E.vira(m, quando, ângulo)` · `E.oculos(m, quando)` | personagem anda com a pose certa |
| `E.segura(m, E.pa(), 'direita')` · `E.monta(m, veiculo, [x,y,z], rotY)` (pose `drive`) · `E.janelas(obj, [[de, ate]…])` | segura ferramenta · dirige veículo · aparece só em certos trechos |
| `E.modelo('x.glb', {comprimento, giraY, apaga})` | `apaga` cobre marcas escritas na textura do modelo |
| `tools/limpa_glb.py modelo.glb [--principal NOME --tira-fora --saida limpo.glb]` | ANTES de usar um .glb: lista as peças e tira as soltas (2ª versão, parafusos, textos) que fazem o modelo FLUTUAR (lição 42). Depois, foto de perto do apoio |
| `E.modelo('arquivo.glb', {altura})` | modelo 3D de `projetos/<nome>/modelos/` ou `modelos/` |
| `E.som('nome', quando)` · `E.cada(t => {...})` | som extra · animação própria |
| `E.permite(a, b)` · `E.fixo(obj)` · `E.nome(obj, "nome")` | informações para a inspeção |

Regras de uso: posicione o objeto ANTES de chamar ações nele. Depois de `E.rebobina` o objeto fica congelado
(para o jeito certo, crie outro objeto). Sons das ações entram sozinhos.

### Kit (K) — a origem de toda peça é a BASE
Primitivas: `caixa` `cilindro` `esfera` `cone` `anel` `tubo` `cano` `parafuso` `agua` `vergalhoes`
Alvenaria: `blocos` (peça a peça) · `parede(larg, alt, esp, {tipo:'tijolo'|'tijolinho'|'bloco'|'reboco'|'concreto', vaos})` · `oitao` · `revestido`
Cobertura e esquadrias: `madeiramento` `telhado` `janela` `porta`
Terreno: `terreno({…, camadas, buracos})` (solo em corte)
Cenário: `casa` `rua` `predioFundo` `pinheiro` `arvore` `nuvem`
Mundos: `mundoBairro({lote})` · `mundoCampo()` · `mundoInterno({w, d, h})`
`K.em(peça, x, y, z, pai?, "nome")` coloca no mundo · cores em `K.COR`.

## 6. Regras para quem opera o sistema (Claude)
1. Seguir `REGRAS.md`. Não entregar roteiro com ✗ na avaliação.
2. Nunca mandar prévia reprovada na inspeção. Corrigir a cena; declarar com `permite`/`fixo` só o que for de propósito.
3. Depois da inspeção, abrir as duas folhas e conferir com os olhos.
4. Mandar as prévias com o formulário (`mec.py form`). Registrar cada resposta com `alterar` / `aprovar`.
5. Refazer só os blocos marcados ALTERAR. Vídeo final apenas com tudo aprovado.
6. Thumbnail no modelo antigo (`lib/thumb_modelo_antigo.py`).
7. Ler `LICOES.md` antes de cada cena e acrescentar nele toda correção pedida pelo dono do canal.

### Veículos: `E.rota(obj, t0, dur, pontos, {eixo, ry, som})`
Anda por uma lista de pontos com velocidade constante; as rodas (distância `eixo`) seguem o chão dado pelos pontos e o corpo inclina entre elas. Use com uma rampa de acesso de perfil em S para entrar/sair de valas. Para roda redonda, dê ao objeto `userData._cx` com quadrados inscritos + faixa de apoio (ver `projetos/rua/cena.js`).


### Câmera em planos (v2.3): `E.plano` e `E.corte`
- `E.plano(quando, pos, alvo, fov = 45, {dur: 0.45})`: segura o enquadramento atual até `quando` e vai rápido e
  suave (sem embalo) para o novo em `dur` segundos; depois segura de novo. A inspeção aceita esse movimento rápido.
- `E.corte(quando, pos, alvo, fov = 45)`: corte seco; a inspeção aceita o salto.
- Ritmo das referências: um plano ou corte a cada 2–3 s; entre eles, câmera parada (só o respiro). Ver ANALISE_VISUAL.md.
