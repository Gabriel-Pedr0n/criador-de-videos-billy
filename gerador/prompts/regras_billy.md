# Gerar vídeo do Billy Constrói (parâmetros da skill analise-video-referencia)

Esta skill NÃO analisa vídeos de referência. A análise já foi feita; o resultado está nos parâmetros abaixo.

## Formato do canal
- Canal Billy Constrói (YouTube Shorts, Instagram, TikTok). Antes se chamava Mundo em Camadas.
- Formato: "E se você [construísse / instalasse / montasse] X?". O Billy faz do jeito errado, dá desastre, aparece ◀◀ (rebobina), e então constrói camada por camada do jeito certo.
- Informação séria e correta; humor leve; o erro é da ideia, nunca humilha o Billy.
- Vertical 9:16. Duração: máx. 1:40 (regra atual do dono; só mudar se ele pedir; o limite em segundos de cada vídeo vem no pedido).
- Termina no "Parabéns, você construiu X." com a obra pronta e confete. SEM "comente", SEM "segue/se inscreva".
- 1º quadro já é a ação (Billy já fazendo/errando), sem intro.

## Billy (aparência fixa)
- Jovem construtor de desenho, ~1,70 m, cabeça grande e redonda. Capacete branco fosco com faixa refletiva laranja, inclinado para trás (aparece testa e franja castanha).
- Olhos castanhos grandes com brilho, sobrancelhas grossas expressivas, sardas leves, bochechas rosadas, sorriso aberto padrão. Lápis amarelo atrás da orelha direita.
- Moletom amarelo #F2B820 com capuz caído, bolso canguru, cordões brancos. Short azul-marinho #22305E com faixa branca, meia branca, tênis azul #2F6FD8 com solado branco.
- ÓCULOS (aparência fixa e aprovada, implementada em `engine/chars.js`): óculos de sol largos, armação laranja GROSSA (#F2761C), lentes quase pretas com dois riscos de reflexo. O Billy usa os óculos em TODOS os blocos, no vídeo final e na thumbnail, em qualquer pose. Nunca desenhar os óculos com primitivas soltas: usar sempre o Billy real do sistema (`E.mascote`).
  - Como os olhos ficam atrás das lentes, a expressão passa pelas sobrancelhas (acima da armação), boca, bochechas e gestos.
- PROIBIDO: bandeirinha/emblema colorido no capacete ou peito. Mãos de 3 dedos + polegar. Materiais foscos, luz suave.

## Billy (direção de atuação)
- Curioso, otimista, mão na massa. Fala com quem assiste: vira para a câmera ao explicar, vira para a peça ao mexer nela.
- Um gesto ligado a cada fala: `explica` (mãos), `aponta` (peça no nome técnico), `mexe` (monta), `abana`/`calor`, `frio` (treme), `hatUp` (coça o capacete no erro), `joinha` (acerto de camada).
- Trocar de gesto a cada 1,5–3 s. Nada de `idle` parado por mais de 3 s.
- Comemorar (`cheer`, `jump`) SÓ no "Parabéns" final. Nunca no meio.
- VOZ DO BILLY (barulhos, SEM palavras): `E.voz(billy, nome, quando)` com nome = `wii`, `uhu`, `hum`, `ops`, `ai`, `uau`, `brr`, `haha`, `ufa`, `eba`. 1 a 3 por bloco, ligados à ação (desastre = `ops`/`ai`; camada pronta = `uhu`/`eba`; descendo = `wii`). Colocar nos vãos entre palavras, nunca por cima da narração. Nunca falar palavras reais: só barulhos.
- Pose nova: derivar de pose que já passa na auditoria (`{ ...POSES.shrug, ... }`).
- Nenhum objeto ou personagem atravessa outro (cabeça na escada, mão dentro da peça = bug).

## Câmera (padrão "segura e pula")
- 45–80% do tempo a câmera fica quase parada (só um leve respiro) enquanto a ação acontece. Depois pula em 0,3–0,6 s, rápido e suave, para o próximo enquadramento: push-in, grua sobe/desce, meia órbita.
- Trocar de plano a cada ~2,6 s (faixa 1,5–5,8 s; 13 a 41 trocas por minuto). Nunca passear devagar o tempo todo.
- Funções: `E.plano(quando, pos, alvo, fov, {dur: 0.45})` segura e pula; `E.corte(quando, pos, alvo, fov)` corte seco.
- Alternar enquadramentos: (a) plano médio, Billy na frente e obra atrás; (b) close que enche a tela com a peça; (c) vista de cima; (d) corte/raio-X; (e) ponto de vista do Billy.
- Billy quase sempre em primeiro plano, grande.

## Cenário: realismo, detalhe e distribuição
- Grama e terra REALISTAS e DETALHADAS em todo cenário externo (textura pintada + tufos 3D instanciados, flores, pedrinhas; terra com torrões, cascalho, caminhos de terra batida). Nada de chão verde liso.
- Terreno grande e murado (muro alto), numa clareira de floresta. As partes da operação do tema ficam ESPALHADAS pelo lote, cada uma em uma zona própria, nunca amontoadas na casa; ligar as zonas por caminhos.
- Cada etiqueta/rótulo só aparece enquanto a câmera enquadra a peça; câmera nunca atravessa casa/muro e o Billy continua visível (≥50%) quando se desloca.

## Luz e sombra
- Padrão: dia claro, céu azul saturado, nuvens low-poly, sol alto 3/4, ambiente forte (quase nada preto). Cores saturadas de brinquedo.
- A luz conta a história: quando o roteiro muda o clima, a luz muda junto (noite/tempestade azul-escuro, interior com abajur, fogo laranja, túnel com vinheta).
- Objetos que brilham são emissivos com halo (bloom). Sombras suaves e curtas, sempre com sombra de contato sob Billy e peças.

## Efeitos
- ◀◀ rebobinar: sépia + linhas de fita + ação voltando, 1–1,5 s, depois cena certa. ▶▶ acelerar: mesmas linhas + ícone ▶▶.
- HUD de números em painéis (kWh, litros, °C, contador) mudando o tempo todo.
- Pílulas brancas com bolinha colorida (causa), etiqueta amarela inclinada (nome técnico), setas vermelhas/verdes, X vermelho e check verde, medida com linha.
- Partículas com significado: bolinhas azuis (água), laranja (calor), pontilhado amarelo (corrente), fumaça, faíscas, poeira, chuva, confete no fim.
- Raio-X/transparência; mapa de calor; flash branco curto em impacto.

## Cortes
- Cortes secos (média ~13 por vídeo) servem para entrar na parede/máquina, mudar de escala e voltar depois do rebobinar. Transições rápidas de câmera: 20 a 90 por vídeo.
