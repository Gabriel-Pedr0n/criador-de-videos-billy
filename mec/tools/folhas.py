from PIL import Image, ImageDraw, ImageFont
import glob, os
S='saida'; F='/root/.fonts/PoppinsXB.ttf'; FB='/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
BG=(236,241,247)
def lab(d,xy,t,sz=30,f=FB,c=(30,34,44)): d.text(xy,t,font=ImageFont.truetype(f,sz),fill=c,anchor='mm')
def grade(itens, cols, cw, ch, titulo, sub, saida):
    rows=(len(itens)+cols-1)//cols; W=cols*cw; H=rows*(ch+50)+170
    o=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(o)
    lab(d,(W/2,60),titulo,58,F); lab(d,(W/2,120),sub,28,FB,(90,98,112))
    for i,(f,t) in enumerate(itens):
        im=Image.open(os.path.join(S,f+'.png')).convert('RGBA'); im.thumbnail((cw,ch))
        x=(i%cols)*cw+(cw-im.width)//2; y=170+(i//cols)*(ch+50)+(ch-im.height)//2; o.paste(im,(x,y),im)
        lab(d,((i%cols)*cw+cw/2,170+(i//cols)*(ch+50)+ch+22),t,26)
    o.save(saida,quality=92); print(saida,o.size)
os.makedirs('entrega',exist_ok=True)
grade([('mascote_frente','Frente'),('mascote_tres_quartos_dir','3/4 direita'),('mascote_perfil_dir','Perfil direito'),('mascote_costas_tres_quartos','3/4 costas'),
       ('mascote_costas','Costas'),('mascote_perfil_esq','Perfil esquerdo'),('mascote_tres_quartos_esq','3/4 esquerda'),('mascote_de_cima','De cima')],4,450,600,
      'BILLY — BILLY CONSTRÓI','Folha de giro (turnaround) · personagem 3D v4 · altura ≈ 1,7 m','entrega/billy_giro_360.png')
grade([('mascote_rosto','Rosto: sorriso, olhos vivos, franja, sardas'),('mascote_maos','Mãos: 3 dedos + polegar articulados'),('mascote_tenis','Tênis: biqueira, cadarço, meia'),
       ('mascote_explodido_frente','Peças separadas (frente)'),('mascote_explodido','Peças separadas (3/4)')],3,600,700,
      'DETALHES DO BILLY','Capacete fosco inclinado · lápis atrás da orelha · crachá BILLY · moletom com capuz, bolso e cordões','entrega/billy_detalhes.png')
grade([('pose_wave','wave (acenar)'),('pose_cheer','cheer (comemorar)'),('pose_reach','reach (alcançar)'),('pose_press','press (apertar)'),('pose_shrug','shrug (dar de ombros)'),('pose_worried','worried (preocupado)')],3,450,600,
      'POSES DO BILLY','Nomes usados no sistema (E.anima)','entrega/billy_poses.png')
objs=sorted(glob.glob(os.path.join(S,'obj_*.png')))
it=[(os.path.basename(f)[:-4],os.path.basename(f)[7:-4].replace('_',' ')) for f in objs]
grade(it,6,330,330,'OBJETOS DA HISTÓRIA — "E se você instalasse uma tomada?"','Todos estão em objetos_tomada.glb, cada um com o nome abaixo','entrega/objetos_tomada.png')
