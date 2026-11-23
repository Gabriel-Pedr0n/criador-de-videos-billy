import os, sys, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "thumb_modelo_antigo.py")).read().split("# ---------- 1. CHICLETE")[0]
sys.argv = [sys.argv[0], sys.argv[1]]; exec(src)
random.seed(7)
s, c = new()
vgrad(c, "#5EB6F0", "#BFE6FF", 0, 560)
# morros e casas ao fundo
c.new_path(); c.move_to(0, 560); c.curve_to(150, 470, 300, 500, 420, 540); c.curve_to(520, 480, 640, 470, 720, 520); c.line_to(720, 600); c.line_to(0, 600); c.close_path(); setc(c, "#6DBE6A"); c.fill()
for k, x in enumerate([40, 200, 380, 560]):
    rrect(c, x, 505, 130, 80, 4); setc(c, ["#F3E3C3", "#F6D9A8", "#E9EEF2", "#F3E3C3"][k]); c.fill()
    c.new_path(); c.move_to(x - 12, 510); c.line_to(x + 65, 465); c.line_to(x + 142, 510); c.close_path(); setc(c, "#D9533B"); c.fill()
    c.rectangle(x + 50, 540, 26, 45); setc(c, "#8A5A3C"); c.fill()
# corte da rua (camadas)
L = [("CONCRETO ASFÁLTICO", "#2B2B2E", 70), ("IMPRIMAÇÃO", "#6B5A1E", 16), ("BASE DE BRITA", "#9C9C98", 120), ("SUBLEITO", "#8B6239", 140), ("TERRA", "#A8572F", 170), ("ROCHA", "#4A4540", 300)]
y = 600
for nome, cor, h in L:
    c.rectangle(0, y, 720, h); setc(c, cor); c.fill()
    if nome == "BASE DE BRITA":
        for _ in range(260):
            px, py, r = random.uniform(0, 720), random.uniform(y + 6, y + h - 6), random.uniform(5, 11)
            c.new_path(); c.arc(px, py, r, 0, 6.283); setc(c, random.choice(["#BDBDB8", "#7E7E7A", "#D2D2CC"])); c.fill()
    elif nome in ("SUBLEITO", "TERRA", "ROCHA"):
        for _ in range(90):
            px, py, r = random.uniform(0, 720), random.uniform(y + 6, y + h - 6), random.uniform(3, 9)
            c.new_path(); c.arc(px, py, r, 0, 6.283); setc(c, "#000000", 0.12); c.fill()
    c.rectangle(0, y, 720, 3); setc(c, "#000000", 0.35); c.fill()
    y += h
# faixa da pista e carro
for x in range(20, 720, 120): c.rectangle(x, 628, 60, 8); setc(c, "#FFFFFF"); c.fill()
rrect(c, 380, 520, 220, 70, 18); setc(c, "#E53935"); c.fill()
c.new_path(); c.move_to(420, 525); c.curve_to(440, 470, 540, 470, 560, 525); c.close_path(); setc(c, "#C62828"); c.fill()
c.new_path(); c.move_to(445, 518); c.curve_to(458, 492, 522, 492, 535, 518); c.close_path(); setc(c, "#CFEFFF"); c.fill(); c.rectangle(487, 492, 6, 28); setc(c, "#C62828"); c.fill()
for wx in (425, 555):
    c.new_path(); c.arc(wx, 592, 26, 0, 6.283); setc(c, "#1B1B1B"); c.fill(); c.new_path(); c.arc(wx, 592, 10, 0, 6.283); setc(c, "#9AA3AD"); c.fill()
# rótulos das camadas
y = 600
for nome, cor, h in L[:5]:
    if nome in ("CONCRETO ASFÁLTICO", "BASE DE BRITA", "SUBLEITO"): pill(c, {"CONCRETO ASFÁLTICO": 170, "BASE DE BRITA": 560, "SUBLEITO": 520}[nome], y + h / 2, nome, bg="#FFFFFF", fg="#1B1B1B", size=24, border="#000000")
    if nome == "IMPRIMAÇÃO": pill(c, 560, y + 8, "IMPRIMAÇÃO", bg="#FFD23F", fg="#1B1B1B", size=20, border="#000000")
    y += h
# círculo + seta na base
ring(c, 250, 746, 130, 60, -0.05)
red_arrow(c, 120, 1010, 70, 880, 140, 790)
sticker(c, 520, 1150, 360, "A BASE SEGURA TUDO", rot=-0.06, sz=30)
character(c, 120, 1265, 300, dict(armL=150, armR=40, mouth="o", eyes="wide"))
header(c, "4 CAMADAS", 104, "QUE FORMAM UMA RUA", 50, "E SE VOCÊ ASFALTASSE UMA RUA?", "#FFD23F")
s.write_to_png(os.path.join(OUT, "thumb_rua_vertical.png"))
