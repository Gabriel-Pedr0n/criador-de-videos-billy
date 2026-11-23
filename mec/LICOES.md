# LIÇÕES APRENDIDAS — Mundo em Camadas (memória do sistema)

Leia ANTES de escrever qualquer cena. Cada lição veio de um pedido do dono do canal.
Toda lição nova entra aqui no fim de cada vídeo, com o vídeo de origem.

## Personagem
1. NUNCA TELEPORTA. Para onde ele precisa ir, vai andando com passos rapidinhos (`E.anda`).
   Se a distância não cabe no tempo da fala, a cena muda (aproxima o lugar), não o personagem pula. (rua)
2. Nada entra em nada: mão na cabeça/capacete, braço no tronco, pé dentro do chão. Poses auditadas. (demo)
3. Aparece e INTERAGE em pelo menos 70% de cada bloco. (demo)
4. Quem dirige máquina é um operador separado, sempre montado nela (`E.monta`), nunca aparece/some. (rua)

## Cenário — NADA DE LIMBO (tudo preenchido)
5. Nenhum vão mostrando o "fundo do mundo": embaixo de rua/piso antigo existe terra maciça; toda borda
   de escavação tem parede de terra com as camadas. (rua — vão azul entre a rua antiga e a vala)
6. A vala de corte vai até ATRÁS da câmera: nada de gramado/chão solto na frente do corte aparecendo
   como faixa verde no pé da tela. O terreno é mais largo que a vala (as paredes laterais existem). (rua)
7. O inspetor tem o teste LIMBO (renderiza sem céu com fundo magenta; pixel magenta olhando para baixo = vazio).
   Bloco com LIMBO é reprovado.
8. Texturas reais: areia parece areia, terra parece terra (materiais com textura em escala real). (rua)

## Veículos e máquinas
9. Veículo NUNCA atravessa parede de terra nem aparece do nada dentro da obra: entra e sai por uma RAMPA
   de acesso (perfil em S, sem quina) e as rodas seguem o chão (`E.rota`, com 'eixo' = distância entre eixos). (rua)
10. Faróis: só 2, de LED, SUBSTITUINDO os do modelo (`E.farois`), nunca por cima. (rua)
11. Rodas e tambores giram de verdade conforme o veículo anda (ângulo = distância / raio). (rua)
12. Roda redonda: caixa de colisão = quadrado inscrito no círculo + faixa de apoio no chão
    (`obj.userData._cx`), senão o canto da caixa "afunda" na rampa e gera falso erro. (rua)
13. Impacto tem que ser TRUCULENTO quando o roteiro pede (quebra-molas sem pintura: pancada, quique, poeira). (rua)

## Roteiro e narração
14. Nada de frase estranha/forçada ("o peso desce num ponto só"). Se mudar texto, entregar o texto novo
    completo para regravar no ElevenLabs — sem gambiarra de corte de áudio. (rua)

## Processo
15. Toda mudança: rodar a inspeção dos 5 blocos, conferir as folhas com os olhos e só então renderizar e entregar
    os 5 blocos com o questionário. Nada de entregar bloco com ERRO.

## Títulos, descrições e legendas (Shorts / Reels / TikTok)
16. Texto de publicação é INFORMATIVO e fiel ao vídeo: diz o que se aprende (as camadas/peças com o nome técnico
    e a função de cada uma) e o "é por isso que". Nada de piadinha nem frase de efeito ("fábrica de buracos",
    "quem nunca?", "mostra pra quem reclama"). Emoji no máximo discreto. Sempre o crédito CC-BY dos modelos usados. (rua)

## Canal de animais (Na Pele do Bicho) — ponto de partida
17. Fórmula própria: "Você é um [animal]" + ficha com números; ciclos Mas → Por isso → Esse é o seu [nome];
    fecho "não é só X. É um corpo inteiro construído para A, B e C." (`--formula animal`). Sem mascote,
    sem pedido de comentário na narração, sem piada.
18. As lições 1 a 16 valem para o animal: ele é o personagem (não teleporta, não desliza, nada entra em nada),
    o habitat não tem limbo, texturas reais, textos de publicação informativos.

## TEMA E GANCHO — por que o canal grande de mesmo estilo tem milhões de views (análise de 14/11/2026)
19. NÃO é a qualidade do 3D (o deles é mais simples). Mais capricho na animação não resolve views.
20. É O TEMA. Só propor tema com EMOÇÃO FORTE, de um destes tipos:
    - medo/sobrevivência (abrigo nuclear no quintal, carro na enchente "Não abre! Como sair?", apagão "Sem luz por 3 dias");
    - nojo (54 bilhões de bactérias na esponja da pia);
    - dinheiro/conforto (resfriar a casa com tubo enterrado, vaso que gasta água em silêncio);
    - assunto da semana (notícia do momento explicada por dentro).
    Tema de curiosidade morna (asfalto, tomada, chiclete, elevador) rende pouco: ninguém sente que precisa saber agora.
    Na ETAPA 1, cada tema proposto vem marcado com o tipo de emoção; tema sem emoção forte não entra na lista.
21. O PRIMEIRO SEGUNDO JÁ É A AÇÃO: no quadro 1 o buraco já está sendo cavado, a mão já está na esponja.
    Nada de apresentação, câmera passeando ou personagem chegando antes do gancho.
22. NÚMERO SUBINDO NA TELA sempre que couber: contador, escala (1 cm → 0,001 mm), termômetro, cronômetro.
23. Nome próprio e personagem com nome ajudam a busca; nome igual ao de canal maior faz o nosso parecer a cópia.
24. Volume e constância: mesmo formato, muitos posts. Conta nova com poucos vídeos demora a ser distribuída.

## Visual medido nas referências (16 vídeos, quadro a quadro — ANALISE_VISUAL.md)
25. CÂMERA "segura e pula": parada enquanto a ação acontece, troca de plano a cada 2–3 s com movimento rápido
    e suave (E.plano) ou corte seco (E.corte). O nosso vídeo da rua trocava a cada 14 s e passeava devagar: lento demais.
26. Personagem grande, em primeiro plano; closes que enchem a tela com a peça.
27. A luz muda com o roteiro (noite, tempestade, interior, fogo, apagão); objetos que brilham com halo e feixes.
28. Sombras suaves e curtas sempre presentes (contato); escuro só em cena de clima/tensão.
29. Efeitos que as referências usam e nós ainda não: rebobinar sépia + linhas VHS, painel de números mudando,
    balão de fala, reações (suor, curativo, estrelinhas), flash branco em impacto, borrão de movimento.
30. Duração das referências: 1:56 a 2:58. A nossa regra (máx. 1:40) é decisão do dono do canal.

## Vídeo da tomada (16/11/2026)
31. TELA VERTICAL É ESTREITA: com fov 46–56 a largura útil a 3 m é só ~1,6–1,9 m. Planeje cada plano com o personagem
    E a peça no quadro (`tools/proj.py`: projeta pontos e diz ok/FORA) antes de renderizar. Plano aberto da casa inteira
    não cabe; use diagonal ao longo da parede ou corte para o detalhe.
32. CÂMERA DO LADO PARA ONDE O PERSONAGEM OLHA: se ele olha a parede, a câmera de trás só mostra as costas. Gire o
    personagem para a câmera enquanto explica (E.vira) e só vire para a peça no instante de mexer nela.
33. Palavras curtas repetem: "É" = "é" = "e" (o motor ignora acento e maiúscula). Conferir "#n" de cada chave com a lista
    de palavras (script de checagem) — "3:É" caiu no 1º "e" do bloco e jogou a câmera 20 s antes.
34. Pose diferente de "walk" dentro de uma caminhada faz o pé patinar; poses 'scared'/'ache'/'dizzy' em transição
    fazem o antebraço entrar no tronco. Antes de andar, uma pose 'idle'.
35. Plano ("segura e pula") começa 0,3–0,5 s ANTES do evento, senão a peça aparece fora do quadro.
36. K.revestido é CENTRADO (plano de w×h com o meio na origem). Piso de 8×4 colocado como se a origem fosse o canto
    cobriu o quintal e a vala. Conferir a posição de todo piso/azulejo numa foto de cima antes de tudo.
37. Parede no meio do caminho: câmera do lado errado de uma divisória enxerga só a parede. Testar câmera vs. paredes.
38. NADA ATRAVESSA NADA — INCLUSIVE FIO, CABO, MANGUEIRA E CORDA. Tubos não têm colisão (não empurram nada), então o
    cabo da rua passou pela cabeça do personagem e nenhuma checagem pegou (o dono do canal viu na thumb). Agora o inspetor
    amostra cada cabo a cada 4 cm (até onde ele já cresceu) e reprova se entrar na cabeça, no tronco ou em qualquer
    membro. Ao desenhar um cabo, passe o caminho LONGE de onde o personagem vai estar em todo o bloco (inclusive depois
    de pular/andar), por cima ou pelo lado da parede. Thumbnail só de quadro que passou na inspeção.

39. O vídeo TERMINA no "Se você já sabia, comente X. Se não sabia, comente Y." Não incluir "segue / siga / se inscreva no Mundo em Camadas" (pedido do dono do canal, 16/11/2026). O avaliador do roteiro reprova se aparecer.
40. MASCOTE v3 (16/11/2026): mais detalhes (capacete com verniz e faixa laranja, SEM bandeirinha/emblema colorido, íris com brilho, sobrancelhas, moletom com capuz/bolso, punhos, tênis com cadarço). Mesmas proporções e articulações. Ferramentas: tools/rodar.py + estudio.js exportam GLB e folhas de giro; personagem simples (sem detalhes) com makeChar({ simples: true }).
41. BILLY (16/11/2026): o canal virou "Billy Constrói" e o protagonista é o Billy (personagem v4: capacete fosco inclinado, franja, sobrancelhas, olhos vivos, sardas, sorriso aberto, lápis na orelha, crachá BILLY). Personalidade e gestos no PROMPT_SISTEMA. Fotos de perfil: tools/perfil.py.

## Vídeo do ar-condicionado (16/11/2026)
42. MODELO FLUTUANDO: o ventilador de mesa (Sketchfab) trazia uma 2ª versão do ventilador e parafusos soltos no mesmo .glb.
    O E.modelo apoia a CAIXA do modelo inteiro na mesa/chão; as peças soltas ficavam mais baixas e mais largas que o
    ventilador, então ele apareceu flutuando acima da mesinha e fora do centro (o dono do canal viu na prévia; a inspeção não
    pega porque o modelo conta como uma caixa só). Regra: TODO .glb novo passa por `tools/limpa_glb.py` (lista as peças;
    `--principal NOME --tira-fora` remove o que fica fora da peça principal) e ganha uma FOTO DE PERTO DO APOIO
    (pé na mesa/chão) com `mec.py foto` antes de qualquer prévia. Cuidado: hélice/pás podem sair um pouco da carcaça —
    confira a lista antes de tirar.
43. BILLY VIVO E PARTICIPATIVO (pedido do dono do canal, 16/11/2026): "personagem muito morto" e "comemorando sem motivo".
    - O Billy PARTICIPA da cena a cada fala: abana-se no calor (`abana`), fica mole de calor (`calor`), treme de frio (`frio`),
      explica com as mãos (`explica`), aponta a peça no nome técnico (`aponta`), mexe/monta a peça (`mexe`, curvado), coça o
      capacete quando dá errado (`hatUp`), faz joinha quando dá certo (`joinha`). Poses novas em engine/chars.js.
    - Troca de gesto a cada 1,5–3 s, sempre ligada ao que a narração diz. Nada de ficar parado em `idle` mais de 3 s.
    - COMEMORAR (`cheer`, `jump`) SÓ no "Parabéns" e no "comente". Nome técnico = `aponta` + joinha, não festa.
    - Vira para a peça quando mexe nela/aponta (`E.vira`) e volta para a câmera ao explicar.
    - Começa já fazendo o jeito óbvio (quadro 1: ligando o ventilador, virado para ele).
    - Pose nova SEMPRE derivada de uma pose que já passa na auditoria (`{ ...POSES.shrug, ... }`): explica = shrug,
      joinha = press, abana = wave mais baixo, calor = idle, frio = squeezed. Sinal do braço: no braço ESQUERDO, z positivo
      fecha para dentro do tronco. Rodar `mec.py inspecionar <slug> todos` depois de mexer em chars.js.

## Vídeo da casa autossustentável (17/11/2026)
44a. ÓCULOS DO BILLY: o Billy agora usa óculos de sol (retângulo arredondado largo, armação laranja grossa #F2761C, lentes quase pretas com 2 riscos de reflexo, ponte e hastes laranja), construídos DENTRO do Billy real (engine/chars.js, grupo userData.oculos, curvados no raio 0.213 da cabeça, ExtrudeGeometry + mergeVertices para não facetar). NUNCA recriar o Billy com primitivas soltas para testar óculos. Conferido em 3 vistas (oculos_3vistas.png).
45. VOZ DO BILLY SEM PALAVRAS: E.voz(m, nome, quando, {ganho,dur}) (engine/extras.js) toca um som sintetizado (lib/sfx.py, v_*: wii, uhu, hum, ops, ai, uau, brr, haha, ufa, eba: fonte glotal + formantes móveis + vibrato) e abre a boca do Billy no ritmo (chars.js, userData.vozes). Usar 1–3 por bloco, ligado à ação, nos vãos da narração; nunca palavras reais.
46. E.modelo() devolve o grupo SEM pôr na cena: sempre K.em(obj,x,y,z). Painéis no telhado: achar o plano com Raycaster de cima para baixo e conferir os 4 cantos (±0.06 m); telhados com seções de alturas diferentes precisam de recorte por x.
47. .skp (SketchUp) não abre aqui: peças desse formato (cisterna, aquecedor solar, bateria) são feitas com primitivas do kit. Playwright sem Chromium: shoot.py usa /usr/bin/google-chrome. Lote murado numa clareira: K.mundoCampo({livre, arvores}) + K.parede em 4 lados.

48. GRAMA E TERRA REALISTAS E DETALHADAS (pedido do dono, 17/11/2026): nada de chão verde liso. Textura de grama pintada em canvas (tons variados, folhas claras/escuras) + milhares de tufos 3D instanciados (escala e altura aleatórias), flores e pedrinhas; terra com torrões, cascalho, manchas úmidas e caminhos de terra batida de borda irregular. Com K.terreno({recortaGrama:true}) a geometria da grama tem UV em METROS: ajustar texture.repeat (0.25 = 1 ladrilho a cada 4 m) e dar material de grama próprio ao topo das células de terreno e à tampa, senão o gramado some (fica verde chapado). Fresta entre a tampa e a célula de terreno deixa ver o vazio (limbo): a tampa deve ser maior que a célula.
49. DISTRIBUIR A OPERAÇÃO PELO LOTE INTEIRO: terreno grande, murado e alto, em clareira de floresta; cada parte da operação do tema fica numa zona própria (cantos, laterais, fundos, frente) ligada por caminhos, nunca amontoada na casa ou perto dela. Ao reposicionar, refazer as câmeras e as etiquetas de cada bloco.
50. CÂMERA E ETIQUETA EM DESLOCAMENTO: (a) câmera que segue o personagem em movimento precisa de enquadramento largo o bastante para cobrir o início e o fim do trajeto, ou de um plano que desliza junto; conferir com a inspeção (Billy ≥50% visível, sem atravessar casa/muro); (b) planos de câmera NÃO podem ser disparados dentro de outro plano ainda em andamento (a câmera passa a voar entre as duas posições e atravessa o personagem): ordenar as chaves de câmera por tempo e, depois de um close, voltar com corte seco antes de deslizar; (c) etiqueta só existe enquanto o objeto etiquetado está dentro do quadro: encurtar ou deslocar a etiqueta quando houver close no meio.
