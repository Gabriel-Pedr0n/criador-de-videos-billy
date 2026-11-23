from PIL import Image, ImageDraw, ImageFilter
import math
def fundo(c1, c2, grade):
    W=1080; bg=Image.new('RGB',(W,W),c2); d=ImageDraw.Draw(bg)
    for r in range(760,0,-4):  # degradê radial
        k=r/760; col=tuple(int(c1[i]*(1-k)+c2[i]*k) for i in range(3)); d.ellipse((W/2-r*1.1,W*0.42-r*1.1,W/2+r*1.1,W*0.42+r*1.1),fill=col)
    g=Image.new('RGBA',(W,W),(0,0,0,0)); gd=ImageDraw.Draw(g)   # papel quadriculado de planta (blueprint)
    for x in range(0,W,54): gd.line([(x,0),(x,W)],fill=grade,width=2)
    for y in range(0,W,54): gd.line([(0,y),(W,y)],fill=grade,width=2)
    return Image.alpha_composite(bg.convert('RGBA'),g)
def perfil(src, saida, c1, c2, grade, dx=40, dy=60, esc=1.12):
    b=fundo(c1,c2,grade); im=Image.open(src).convert('RGBA'); im=im.resize((int(1080*esc),int(1080*esc)),Image.LANCZOS)
    sh=Image.new('RGBA',im.size,(0,0,0,0)); a=im.split()[3].filter(ImageFilter.GaussianBlur(18)); sh.putalpha(a.point(lambda v:int(v*0.35)))
    ox=(1080-im.width)//2+dx; oy=(1080-im.height)//2+dy
    b.alpha_composite(Image.composite(Image.new('RGBA',im.size,(10,20,50,255)),Image.new('RGBA',im.size,(0,0,0,0)),sh.split()[3]),(ox+14,oy+18)); b.alpha_composite(im,(ox,oy))
    b.convert('RGB').save(saida,quality=95)
    # prévia com o recorte redondo do Instagram/YouTube
    m=Image.new('L',(1080,1080),0); ImageDraw.Draw(m).ellipse((0,0,1079,1079),fill=255); c=Image.new('RGBA',(1080,1080),(255,255,255,0)); c.paste(b,(0,0),m); return c
O='/mnt/user-data/outputs/'
c1=perfil('saida/perfil_aceno.png',O+'billy_perfil_azul.png',(88,150,240),(30,82,190),(255,255,255,26),dx=-150,dy=95,esc=1.18)
c2=perfil('saida/perfil_aceno.png',O+'billy_perfil_amarelo.png',(255,236,170),(246,190,40),(255,255,255,40),dx=-150,dy=95,esc=1.18)
c3=perfil('saida/perfil_frente.png',O+'billy_perfil_marinho.png',(70,96,170),(28,40,86),(255,255,255,22),dx=0,dy=70)
p=Image.new('RGB',(1080*3+80,1080+40),(245,246,248))
for i,c in enumerate([c1,c2,c3]): p.paste(c,(20+i*1100,20),c)
p.resize((p.width//3,p.height//3)).save('chk_perfil.jpg',quality=90)
