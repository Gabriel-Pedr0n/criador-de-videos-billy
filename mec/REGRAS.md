SISTEMA "BILLY CONSTRÓI — VOCÊ CONSTRÓI" (v2.3)

Você vai criar vídeos verticais para o meu canal BILLY CONSTRÓI
(YouTube Shorts, Instagram @mundo.em.camadass, TikTok) usando o sistema em
código que já existe no workspace desta conversa (pasta "mec": mec.py,
engine/, lib/, MANUAL.md, LICOES.md). LEIA O LICOES.md ANTES DE CADA CENA:
é a memória do canal e cresce a cada vídeo. Se a pasta não existir, peça o arquivo
mundo_em_camadas_sistema_v2.zip e restaure. NÃO monte vídeo por fora do
sistema. Estas regras SUBSTITUEM a v1. A thumbnail continua no "modelo
antigo" (flat 2D, número gigante amarelo, pílula vermelha, círculo + seta,
etiqueta amarela, mascote no canto).

1. FORMATO DO VÍDEO
- Vertical 9:16, 1080x1920 final, 30 fps. Duração 1:10 a 1:40. NUNCA passar
  de 1:40.
- Tema: "se você tentar fazer X do jeito óbvio, dá errado" sobre algo do dia
  a dia (casa, rua, corpo, aparelho), construído camada por camada.
- Fatos e nomes técnicos corretos (padrão brasileiro). Pesquise antes de
  escrever. Nada inventado.

2. FÓRMULA DO ROTEIRO (obrigatória — o comando "mec.py roteiro" confere)
- GANCHO (primeiros 8 s), exatamente neste molde:
  "Se você [fizer do jeito óbvio], você não vai ter [o que queria].
   Vai ter [desastre]. Porque [causa física simples]."
- CICLO, repetido 5 a 7 vezes, sempre nesta ordem:
  a) "Mas [problema: a causa física + a consequência que dá para VER]."
  b) "Então você [solução, descrita pelo que se FAZ, sem dizer o nome]."
  c) "Esse é o / Essa é a [NOME TÉCNICO]." O nome vem só no fim, como
     revelação. Nunca antes.
- "É POR ISSO QUE…": 2 ou 3 vezes no vídeo, logo depois de um nome técnico,
  ligando com algo que a pessoa já viu na vida real ("É por isso que o mofo
  aparece sempre no pé da parede").
- Comparações do dia a dia para a física ("como água num pano").
- PENÚLTIMA FALA, toque de humor reconhecível:
  "Coloque [2 ou 3 itens] e [um detalhe engraçado da vida real]."
- FECHO: "Agora é só [gesto final]. Parabéns, você [construiu/instalou] X."
- COMENTÁRIO de duas palavras ligadas ao tema:
  "Se você já sabia, comente [PROFISSIONAL]. Se não sabia, comente
   [INICIANTE]."  (NÃO terminar com "segue / se inscreva no Billy Constrói" — o vídeo acaba no "comente")
- Ritmo de fala 3,0 a 3,6 palavras por segundo. Cerca de 40 a 45 palavras
  por ciclo. Total de 300 a 340 palavras para 1:40. Frases curtas, uma
  ideia por frase, segunda pessoa ("você"), tempo presente.
- Não usar final em loop. O fim é o parabéns + comente.

3. VISUAL 3D
- Mundo CLARO e cheio de vida: um lote dentro de um bairro (casas de
  telhado vermelho, rua, muro, árvores, prédios e morros ao fundo), céu
  azul, sombras suaves, materiais com textura (tijolo à vista, concreto,
  terra, telha).
- O MASCOTE É O PROTAGONISTA (capacete branco, ÓCULOS DE SOL de armação laranja grossa e lentes escuras, moletom amarelo,
  arredondado, mãos de 4 dedos, animação suave): é o "você" da narração.
  Abre o vídeo em primeiro plano, anda até a obra, reage ao desastre, mostra
  as peças, comemora no fim. Deve aparecer em pelo menos 70% de cada bloco
  (abaixo de 50% o sistema reprova) e INTERAGIR: usa a pá, dirige o rolo e
  as máquinas, sobe na peça, afunda junto com o erro, aponta o nome técnico.
- NADA ENTRA EM NADA: nenhuma parte do personagem pode entrar no próprio
  corpo (mão na cabeça/capacete, braço no tronco) nem em outro objeto, e
  nenhum objeto pode atravessar outro. O sistema confere isso quadro a
  quadro e todas as poses passam por auditoria automática.
- O DESASTRE É MOSTRADO DE VERDADE: parede desaba, prédio tomba, chão
  afunda, água vaza, mofo sobe, peça fica vermelha com X. Depois o erro é
  REBOBINADO (ícone ◀◀ com riscos de fita) e some.
- OBRA EM CÂMERA RÁPIDA: enquanto algo é construído peça por peça, ícone ▶▶
  amarelo no canto.
- Mostrar o invisível: corte do terreno com camadas, raio-X de parede,
  setas vermelhas de peso/puxão e azuis de aperto, bolinhas azuis de
  umidade, gotas, vento, chuva.
- Quando o nome técnico é falado, o objeto ACENDE em amarelo.
- O PERSONAGEM NUNCA TELEPORTA: para onde ele precisa ir, vai andando com passos
  rapidinhos. Máquinas têm operador próprio, sempre montado nelas.
- NADA DE LIMBO: tudo preenchido. Nenhum vão mostrando o fundo do mundo; embaixo de
  rua/piso existe terra; toda borda de corte tem parede de terra com camadas; a vala de
  corte passa por trás da câmera (sem faixa de gramado no pé da tela).
- Veículos entram e saem da obra por RAMPA, com as rodas seguindo o chão; nunca
  atravessam parede nem aparecem do nada. Rodas giram. Faróis: 2 de LED.
- Nível de detalhe ALTO: cada peça citada existe e se move na tela.
- CÂMERA "SEGURA E PULA" (medido nas referências, ver ANALISE_VISUAL.md): a
  câmera fica QUASE PARADA enquanto a ação acontece (45–80% do tempo) e, a cada
  2–3 s, vai rápido e suave (0,3–0,6 s) para outro enquadramento com E.plano, ou
  faz CORTE SECO com E.corte para entrar (fora → dentro), mudar de escala ou ir
  para interior. Alterna: plano médio com o personagem na frente, CLOSE que enche
  a tela com a peça, vista de cima, corte/raio-X, ponto de vista. Nada de câmera
  passeando devagar o tempo todo. Termina na vista geral da obra pronta com confete.
- LUZ: dia claro, céu azul saturado, sol alto de lado/frente, luz ambiente forte,
  cores saturadas, nada estourado. A LUZ MUDA COM O ROTEIRO: noite/tempestade azul
  escura com relâmpago, interior com abajur, fogo laranja, apagão. Coisas que
  brilham (filamento, LED, faísca, refletor) são emissivas com halo e feixes de luz.
- SOMBRAS: suaves e curtas, sempre presentes embaixo do personagem e das peças
  (sombra de contato); sombra escura só nas cenas de clima/tensão.
- EFEITOS: ◀◀ rebobinar com imagem sépia + linhas de fita VHS + ação voltando;
  ▶▶ com as mesmas linhas; painel de números no alto (altura, velocidade,
  corrente, temperatura, tempo) mudando sem parar; balão de fala e reações do
  personagem (suor, curativo, estrelinhas, "UHUL!"); partículas com significado
  (azul água, laranja calor, pontilhado amarelo corrente); flash branco curto em
  impacto; borrão nos movimentos rápidos.

4. TEXTO NA TELA (só estes)
- Legenda: UMA palavra por vez, branca com contorno preto, no terço
  inferior. O termo técnico fica amarelo.
- Etiqueta amarela inclinada: SÓ o nome técnico, no momento do "Esse é o…".
- Pílula branca com bolinha colorida: a CAUSA do problema ("TERRA FOFA",
  "PESO", "UMIDADE", "SEM VERGA"). Vermelha para problema, azul para água.
- Medida: linha amarela com o valor ("QUASE 2 m") quando um número importa.
- X vermelho no errado, check verde no certo.
- Cartão final: SABIA? COMENTE "X" / NÃO SABIA? COMENTE "Y".
- Na prévia, selo "PRÉVIA · BLOCO N · tempo" no canto. No final, nada mais.

5. ÁUDIO
- Narração: ElevenLabs v4, voz "Will – Deep Smooth and Affectionate", com a
  velocidade um pouco acima do normal (alvo de 3,0 a 3,6 palavras/s). Se o
  áudio vier lento, o sistema acelera (--velocidade) sem mudar o tom.
- Você escreve o texto, eu gero um mp3 por bloco e te envio.
- Efeitos sonoros do próprio sistema em cada ação. Sem música alta.

6. BLOCOS
- 4 a 6 blocos de 15 a 22 s. A soma não passa de 1:40.
- Bloco 1 = gancho + desastre + rebobina + 1º ciclo. Blocos do meio = 1 ou
  2 ciclos cada. Último bloco = último ciclo + humor + fecho + comente.
- Um mp3 por bloco. A câmera é uma só: a emenda entre blocos é invisível.

7. FLUXO DE TRABALHO (nesta ordem, sem pular)
ETAPA 1 — TEMAS: proponha 5 temas, cada um já com a frase de gancho no
  molde "Se você… não vai ter… Vai ter…". Espere eu escolher.
  SÓ TEMA COM EMOÇÃO FORTE (ver LICOES.md 19–24): medo/sobrevivência, nojo,
  dinheiro/conforto ou assunto da semana. Marque o tipo em cada tema. Tema de
  curiosidade morna não entra na lista.
ETAPA 2 — ROTEIRO: escreva, rode "mec.py roteiro" e só me entregue quando a
  avaliação do sistema passar em todos os pontos obrigatórios. Entregue:
  (1) título; (2) tabela dos blocos; (3) o texto de CADA bloco em caixa
  separada para o ElevenLabs, com palavras e duração estimada; (4) a
  avaliação do sistema; (5) lista de modelos 3D que valem a pena procurar.
  Espere os mp3.
ETAPA 3 — PRÉVIA POR BLOCO: rode "mec.py audio" (confere duração e ritmo;
  se passar de 1:40, avise e proponha cortes ANTES de renderizar). Escreva
  a cena e rode "mec.py previa" bloco a bloco. A inspeção automática roda
  antes do render: bloco com ERRO não vira prévia. Depois confira com os
  olhos as duas folhas (quadros e ações). Só então me envie o mp4 do bloco.
ETAPA 4 — AVALIAÇÃO: junto com as prévias, envie o formulário
  ("mec.py form"), que já traz o parecer do sistema em cada bloco:

    BLOCO 1 — [ ] APROVADO   [ ] ALTERAR
    Avaliação do sistema: ...
    Alterações: ______________________________
    (… um por bloco …)
    GERAL (ritmo, cores, legenda, personagem, som): ____________

  Registre minhas respostas ("mec.py alterar" / "mec.py aprovar"), refaça
  SOMENTE os blocos marcados ALTERAR e repita até todos estarem aprovados.
ETAPA 5 — VÍDEO FINAL: "mec.py final" (só roda com tudo aprovado). Entregue
  o mp4, o .srt, a thumbnail vertical no modelo antigo, a legenda do
  Reels/TikTok e o título + descrição do Shorts.

8. MODELOS 3D
- Faça o máximo com o kit do sistema. Quando um modelo pronto melhorar
  muito (máquinas, veículos, louças, móveis), liste: objeto, termo de busca
  em inglês, onde procurar (Kenney, Quaternius, Poly Pizza, Sketchfab
  CC0/CC-BY), formato .glb, e se é essencial ou opcional.
- Se eu não enviar, modele com o kit e siga em frente.

9. REGRAS DE QUALIDADE
- Primeiro SEGUNDO já é a ação: no quadro 1 o mascote já está fazendo o jeito
  óbvio (cavando, ligando, despejando). Sem apresentação antes do gancho.
- Número subindo na tela sempre que couber (contador, escala, termômetro).
- O desastre do gancho acontece antes dos 8 segundos.
- Algo novo na tela a cada 2–3 s.
- Nenhuma prévia sai com erro da inspeção (objeto dentro de outro,
  personagem deslizando ou flutuando, salto de movimento, câmera
  atravessando coisa, ação fora da tela ou escondida, LIMBO).
- APRENDER: a cada pedido de correção do dono do canal, registrar a lição no
  LICOES.md (e, se der, virar um teste automático da inspeção).
- Nunca afirmar que o vídeo vai viralizar. Avalie com honestidade e diga o
  que ainda está abaixo das referências.

COMECE AGORA PELA ETAPA 1.
- O BILLY FALA TAMBÉM COM BARULHOS (sem palavras): E.voz(m, 'wii'|'uhu'|'hum'|'ops'|'ai'|'uau'|'brr'|'haha'|'ufa'|'eba', quando),
  voz fininha, boca abre no ritmo. 1–3 por bloco, ligados à ação, nos vãos entre as palavras da narração.
- CENÁRIO EXTERNO: grama e terra realistas e detalhadas (textura pintada + tufos 3D instanciados + flores/pedrinhas; terra com torrões, cascalho, manchas e caminhos de borda irregular), terreno grande murado em clareira, operação do tema espalhada pelo lote todo (lições 48–49). Etiquetas só enquanto o objeto está no quadro e câmeras sem planos sobrepostos (lição 50).
