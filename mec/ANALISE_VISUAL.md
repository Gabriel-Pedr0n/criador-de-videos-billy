# ANÁLISE VISUAL DAS REFERÊNCIAS (Desmontando o Mundo) — 16 vídeos, quadro a quadro (15/11/2026)

Método: 2.576 segundos analisados, 1 quadro por segundo + todos os 30 quadros/s para cortes e movimentos.
Medido por programa (brilho, sombra, saturação, cor, movimento de câmera por fluxo óptico, cortes, flashes)
e conferido com os olhos em folhas de 1 quadro/s de cada vídeo. Dados por segundo: por_segundo.csv.
Escala: brilho e saturação de 0 a 255; "sombra %" = parte da tela muito escura; "câmera parada %" =
segundos em que a imagem quase não se move.

| # | Vídeo | Duração | Brilho | Sombra % | Saturação | Câmera parada % | Cortes secos | Movimentos rápidos | Troca de plano a cada |
|---|---|---|---|---|---|---|---|---|---|
| V01 | Como um telhado funciona A engenharia por trás d | 2:45 | 133 | 7 | 114 | 74 | 6 | 30 | 4.6 s |
| V02 | Como uma casa fica de pé Da fundação ao telhado | 2:48 | 120 | 13 | 113 | 76 | 3 | 44 | 3.6 s |
| V03 | Como um paraquedas freia uma queda O poder do ar | 2:50 | 140 | 7 | 122 | 45 | 1 | 62 | 2.7 s |
| V04 | Como um para raios protege uma casa | 2:42 | 103 | 31 | 112 | 53 | 21 | 90 | 1.5 s |
| V05 | Como uma rua é construída Muito além do asfalto | 2:42 | 80 | 43 | 116 | 28 | 5 | 62 | 2.4 s |
| V06 | Como se constrói um estádio de futebol | 2:20 | 108 | 19 | 138 | 40 | 20 | 52 | 1.9 s |
| V07 | Como o bungee jump freia a queda e faz você subi | 2:54 | 112 | 19 | 136 | 29 | 15 | 80 | 1.8 s |
| V08 | Como uma grua levanta cargas e cresce junto com  | 2:57 | 152 | 8 | 88 | 74 | 40 | 38 | 2.3 s |
| V09 | Como uma lâmpada funciona Do filamento ao LED | 2:00 | 60 | 63 | 119 | 46 | 8 | 34 | 2.9 s |
| V10 | Como a fechadura reconhece a chave certa | 2:42 | 139 | 8 | 98 | 81 | 29 | 21 | 3.2 s |
| V11 | Como é feito o metrô | 2:29 | 120 | 16 | 87 | 46 | 9 | 48 | 2.6 s |
| V12 | Como o elevador funciona Cabos contrapeso e frei | 2:53 | 106 | 25 | 58 | 58 | 12 | 55 | 2.6 s |
| V13 | Como uma sacada fica de pé sem coluna embaixo | 2:18 | 124 | 18 | 96 | 72 | 16 | 37 | 2.6 s |
| V14 | Como o cinto de segurança trava na hora certa | 2:40 | 77 | 52 | 109 | 59 | 8 | 49 | 2.8 s |
| V15 | Como construir um MURO DE ARRIMO arrimo desmonta | 2:22 | 102 | 18 | 98 | 61 | 2 | 54 | 2.5 s |
| V16 | Como o micro ondas aquece a comida N_o _ de dent | 1:56 | 120 | 26 | 64 | 76 | 0 | 20 | 5.8 s |
| — | **NOSSO: asfaltar uma rua** | 1:38 | 107 | 28 | 96 | **22** | **0** | **7** | **14 s** |

## 1. ILUMINAÇÃO 💡
- Padrão (12 de 16 vídeos): DIA CLARO. Céu azul saturado com nuvens low-poly, sol alto vindo do lado/frente
  (3/4), luz ambiente forte (quase nada fica preto), tone mapping suave (nada estoura: altas luzes < 2% da tela).
  Brilho médio 100–150, saturação média ~105 (alta, cores "de brinquedo").
- A LUZ CONTA A HISTÓRIA: quando o roteiro muda o clima, a luz da cena inteira muda junto:
  noite/tempestade azul-escuro com relâmpago (para-raios), interior escuro com abajur e janela de lua (lâmpada),
  fogo laranja (calor), interior cinza com a luz apagando (elevador sem energia), túnel com vinheta escura (metrô).
  Nesses trechos o brilho cai para 40–70 e a sombra ocupa 40–60% da tela.
- Objetos que brilham são EMISSIVOS com halo (bloom): filamento, LED com feixes de luz cônicos (god rays),
  esfera de raio, refletores do estádio, ondas rosa do micro-ondas.

## 2. SOMBRAS 🌙
- Sombras SUAVES e curtas (sol alto + luz ambiente), sempre presentes: sombra de contato embaixo do
  personagem, dos carros e das peças — é ela que "cola" as coisas no chão.
- Nunca sombra dura e longa. Sombra escura de verdade só nas cenas de clima (noite, tempestade, sem energia).
- Oclusão de ambiente nos cantos (paredes, túnel, dentro de caixas) dá volume.

## 3. CÂMERA 🎥  — a maior diferença para os nossos vídeos
- Padrão "SEGURA E PULA": em 45–80% dos segundos a câmera fica QUASE PARADA, enquadramento fixo, só com
  um leve respiro, enquanto a ação acontece. Então, em 0,3–0,6 s, ela vai RÁPIDO e SUAVE (aceleração e freada
  fortes, sem embalo) para o próximo enquadramento: aproxima (push-in), desce/sobe (grua), dá meia volta (órbita).
- TROCA DE PLANO A CADA ~2,6 s (mediana; de 1,5 s a 5,8 s; 13 a 41 trocas por minuto).
- NOSSO vídeo da rua: câmera parada em só 22% do tempo (ela passeia devagar o tempo todo) e uma troca de plano a
  cada 14 s. Resultado: parece um passeio lento; as referências parecem uma sequência de "fotos" vivas.
- Enquadramentos que se alternam: (a) plano médio com o personagem na frente e a obra atrás; (b) CLOSE que enche a
  tela com a peça (telha, fechadura, retrator do cinto); (c) vista de cima; (d) corte/raio-X; (e) ponto de vista do
  personagem (paraquedas, bungee). Personagem quase sempre em primeiro plano, grande.

## 4. EFEITOS ✨
- ◀◀ REBOBINAR: imagem dessaturada/sépia + linhas horizontais de fita (VHS) + a ação voltando de trás para
  frente, 1–1,5 s; depois troca para a cena certa. ▶▶ ACELERAR: mesmas linhas + ícone ▶▶ amarelo.
- HUD de números em painéis no alto: altura e velocidade (paraquedas, bungee), corrente (chuveiro 25 A × raio
  30.000 A), termômetro, relógio, "1 MIN / 5 MIN", contador. Números mudando o tempo todo.
- Pílulas brancas com bolinha colorida (causa), etiqueta amarela inclinada (nome técnico), setas vermelhas/verdes
  animadas, X vermelho / check verde, medida com linha.
- BALÃO DE FALA do personagem ("Você chama isso de esquentar?") e expressões: suor, curativos, estrelinhas
  girando na cabeça, "UHUL!", "Aaah".
- Partículas com significado: bolinhas azuis (água/umidade), laranja (calor), pontilhado amarelo andando
  (corrente elétrica), fumaça, faíscas, poeira, chuva em riscos, confete no fim.
- Transparência/raio-X de paredes e peças; mapa de calor (azul → vermelho); ondas rosa onduladas.
- Flash branco curto (2–4 quadros) em relâmpago/explosão/impacto.
- Borrão de movimento nos movimentos rápidos de câmera.

## 5. CORTES ✂️
- Cortes SECOS existem (0 a 40 por vídeo, média ~13) e servem para: entrar (fora → dentro da parede/máquina),
  mudar de escala (casa → célula/peça), ir para interior, voltar depois do rebobinar.
- Transições rápidas de câmera (os "pulos" da seção 3): 20 a 90 por vídeo.
- Abertura: o PRIMEIRO QUADRO já é a ação (personagem já cavando, já pendurado, já no carro).
- Fim: plano geral da obra pronta + personagem comemorando + cartão "COMENTE X".

## 6. DURAÇÃO
- Os 16 vídeos têm de 1:56 a 2:58 (mediana ~2:42). Nenhum tem menos de 1:56.
  (Nossa regra atual é no máximo 1:40 — decisão do dono do canal se muda.)

## COMO O SISTEMA FAZ ISSO
- `E.plano(quando, pos, alvo, fov, {dur: 0.45})` — segura o enquadramento atual e pula rápido e suave para o novo.
- `E.corte(quando, pos, alvo, fov)` — corte seco (a inspeção aceita o salto).
- Regra de câmera: um `E.plano` ou `E.corte` a cada 2–3 s; entre eles, a câmera parada (só o respiro).
- Luz por clima: mudar sol/ambiente/céu junto com o roteiro (noite, tempestade, interior, fogo).
