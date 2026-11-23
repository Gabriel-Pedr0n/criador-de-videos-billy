import cairo, sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from gfx import *
OUT = sys.argv[1]
RED = "#E53935"; YEL = "#FFD23F"
def new():
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1080, 1920); c = cairo.Context(s); c.scale(1.5, 1.5); return s, c
def vgrad(c, top, bot, y0=0, y1=1280):
    g = cairo.LinearGradient(0, y0, 0, y1); g.add_color_stop_rgb(0, *hexc(top)[:3]); g.add_color_stop_rgb(1, *hexc(bot)[:3]); c.set_source(g); c.rectangle(0, y0, 720, y1 - y0); c.fill()
def header(c, big, bigsz, sub, subsz, pilltxt, glowcol):
    g = cairo.LinearGradient(0, 0, 0, 430); g.add_color_stop_rgba(0, 0, 0, 0, 0.72); g.add_color_stop_rgba(1, 0, 0, 0, 0); c.set_source(g); c.rectangle(0, 0, 720, 430); c.fill()
    glow(c, 360, 190, 280, glowcol, 0.4)
    outlined_text(c, big, 360, 190, bigsz, fill=YEL, sw=20)
    outlined_text(c, sub, 360, 280, subsz, fill="#FFFFFF", sw=10)
    c.save(); c.translate(360, 365); c.rotate(-0.05); pill(c, 0, 0, pilltxt, bg=RED, fg="#FFFFFF", size=34, border="#FFFFFF"); c.restore()
def sticker(c, x, y, w, txt, rot=0.1, bg=YEL, sz=34):
    c.save(); c.translate(x, y); c.rotate(rot)
    rrect(c, -w / 2, -42, w, 84, 16); setc(c, bg); c.fill_preserve(); c.set_line_width(6); setc(c, "#000000"); c.stroke()
    outlined_text(c, txt, 0, 13, sz, fill="#1B1B1B", sw=0); c.restore()
def ring(c, x, y, rx, ry, rot=0):
    c.new_path(); c.save(); c.translate(x, y); c.rotate(rot); c.scale(rx, ry); c.arc(0, 0, 1, 0, 6.283); c.restore(); c.set_line_width(10); setc(c, "#FF2A2A"); c.stroke()
def red_arrow(c, x0, y0, cx, cy, x1, y1):
    c.new_path(); c.move_to(x0, y0); c.curve_to(cx, cy, cx, cy, x1, y1); c.set_line_width(14); c.set_line_cap(cairo.LINE_CAP_ROUND); setc(c, "#FF2A2A"); c.stroke()
    a = math.atan2(y1 - cy, x1 - cx); h = 34
    c.new_path(); c.move_to(x1 + math.cos(a) * 10, y1 + math.sin(a) * 10)
    c.line_to(x1 + math.cos(a + 2.5) * h, y1 + math.sin(a + 2.5) * h); c.line_to(x1 + math.cos(a - 2.5) * h, y1 + math.sin(a - 2.5) * h); c.close_path(); c.fill()
def tube(c, pts, w, col, edge=None):
    c.new_path(); c.move_to(*pts[0])
    for i in range(1, len(pts) - 2, 3): c.curve_to(*pts[i], *pts[i + 1], *pts[i + 2])
    c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND)
    if edge: c.set_line_width(w + 10); setc(c, edge); c.stroke_preserve()
    c.set_line_width(w); setc(c, col); c.stroke()
def shine(c, x, y, r):
    c.new_path(); c.save(); c.translate(x - r * 0.35, y - r * 0.4); c.rotate(-0.6); c.scale(r * 0.35, r * 0.18); c.arc(0, 0, 1, 0, 6.283); c.restore(); setc(c, "#FFFFFF", 0.7); c.fill()

# ---------- 1. CHICLETE ----------
s, c = new()
vgrad(c, "#3A1A5C", "#C23C7E")
for i in range(9):
    for j in range(16):
        c.rectangle(i * 80 + 2, j * 80 + 2, 76, 76); setc(c, "#FFFFFF", 0.035 if (i + j) % 2 else 0.0); c.fill()
glow(c, 420, 780, 330, "#FF8AC8", 0.45)
# esophagus + intestine
tube(c, [(330, 430), (330, 500), (310, 560), (318, 620)], 46, "#F4A3BE", "#B5476F")
tube(c, [(585, 860), (640, 930), (600, 990), (520, 985), (440, 980), (380, 1020), (420, 1070)], 44, "#F0906A", "#B85A3C")
# stomach
c.new_path(); c.move_to(300, 600)
c.curve_to(240, 650, 225, 770, 300, 850); c.curve_to(375, 935, 530, 935, 590, 860)
c.curve_to(640, 795, 615, 715, 560, 700); c.curve_to(500, 685, 445, 720, 405, 690); c.curve_to(375, 665, 375, 620, 345, 598); c.close_path()
c.set_line_width(12); setc(c, "#B5476F"); c.stroke_preserve(); setc(c, "#F58FB1"); c.fill()
# acid dots
import random; random.seed(3)
for k in range(26):
    x = random.uniform(290, 580); y = random.uniform(720, 890)
    c.new_path(); c.arc(x, y, random.uniform(4, 9), 0, 6.283); setc(c, "#B6F05A", 0.75); c.fill()
# gum ball
c.new_path(); c.arc(430, 805, 72, 0, 6.283); setc(c, "#C2185B"); c.set_line_width(8); c.stroke_preserve(); setc(c, "#FF4FA8"); c.fill(); shine(c, 430, 805, 72)
ring(c, 430, 805, 112, 104)
# calendar
c.save(); c.translate(600, 520); c.rotate(0.12)
rrect(c, -85, -85, 170, 180, 18); setc(c, "#FFFFFF"); c.fill_preserve(); c.set_line_width(6); setc(c, "#111111"); c.stroke()
rrect4(c, -85, -85, 170, 50, 18, 18, 0, 0); setc(c, RED); c.fill()
for x in (-45, 45): rrect(c, x - 7, -100, 14, 30, 7); setc(c, "#333333"); c.fill()
outlined_text(c, "ANOS", 0, -50, 26, fill="#FFFFFF", sw=0)
outlined_text(c, "7", 0, 72, 120, fill="#111111", sw=0); c.restore()
red_arrow(c, 590, 625, 580, 700, 525, 760)
character(c, 150, 1240, 360, dict(armL=150, armR=150, mouth="o", eyes="wide"))
sticker(c, 500, 1150, 360, "MITO OU VERDADE?", rot=-0.08, sz=30)
header(c, "7 ANOS", 150, "NO SEU ESTÔMAGO?", 54, "ENGOLIU CHICLETE?", "#FF4FA8")
s.write_to_png(os.path.join(OUT, "thumb_chiclete_vertical.png"))

# ---------- 2. PANELA ----------
s, c = new()
vgrad(c, "#1F6E73", "#2A8C88", 0, 1000)
for i in range(13):
    for j in range(20):
        c.rectangle(i * 60, j * 50, 58, 48); setc(c, "#FFFFFF", 0.05 if (i + j) % 2 else 0.02); c.fill()
vgrad(c, "#3B3B42", "#232328", 1000, 1280)
c.rectangle(0, 990, 720, 18); setc(c, "#55555E"); c.fill()
# burner flames
for k in range(7):
    x = 280 + k * 45
    c.new_path(); c.move_to(x - 16, 1000); c.curve_to(x - 14, 970, x - 4, 955, x, 935); c.curve_to(x + 4, 955, x + 14, 970, x + 16, 1000); c.close_path(); setc(c, "#3FA9FF"); c.fill()
    c.new_path(); c.move_to(x - 8, 1000); c.curve_to(x - 6, 985, x - 2, 975, x, 962); c.curve_to(x + 2, 975, x + 6, 985, x + 8, 1000); c.close_path(); setc(c, "#BFE6FF"); c.fill()
glow(c, 420, 700, 300, "#FF6A3D", 0.35)
# pot body
rrect(c, 250, 650, 340, 300, 46); setc(c, "#9AA3AD"); c.fill()
rrect(c, 250, 650, 170, 300, 46); setc(c, "#B9C1C9"); c.fill()
c.rectangle(250, 700, 340, 22); setc(c, "#7E8791"); c.fill()
rrect(c, 280, 690, 26, 220, 13); setc(c, "#FFFFFF", 0.35); c.fill()
# lid
c.new_path(); c.move_to(235, 655); c.curve_to(260, 590, 580, 590, 605, 655); c.close_path(); setc(c, "#6F7882"); c.fill()
rrect(c, 230, 645, 380, 22, 11); setc(c, "#59616A"); c.fill()
# handles
rrect(c, 590, 610, 140, 34, 17); setc(c, "#1E1E22"); c.fill()
rrect(c, 150, 680, 100, 30, 15); setc(c, "#1E1E22"); c.fill()
# valve
rrect(c, 408, 560, 24, 44, 6); setc(c, "#4A5058"); c.fill()
c.new_path(); c.arc(420, 552, 22, 0, 6.283); setc(c, "#2C3036"); c.fill()
# steam jet
for k, (dx, dy, r) in enumerate([(0, -40, 26), (-14, -82, 34), (12, -128, 42)]):
    c.new_path(); c.arc(420 + dx, 540 + dy, r, 0, 6.283); setc(c, "#FFFFFF", 0.8 - k * 0.2); c.fill()
ring(c, 420, 560, 70, 62)
red_arrow(c, 610, 520, 560, 470, 480, 540)
sticker(c, 545, 830, 330, "1 FEIJÃO ENTOPE!", rot=0.1, sz=30)
character(c, 130, 1240, 340, dict(armL=150, armR=150, mouth="o", eyes="wide"))
burst(c, 540, 1120, 95, "BUM?!", rot=-0.1, size=44)
header(c, "300 KG", 150, "NA TAMPA DA SUA PANELA", 46, "PODE EXPLODIR?!", "#FF6A3D")
s.write_to_png(os.path.join(OUT, "thumb_panela_vertical.png"))

# ---------- 3. PASSARINHO ----------
s, c = new()
vgrad(c, "#2F8FD8", "#A8E2FF")
for (x, y, r) in [(120, 520, 60), (190, 500, 75), (260, 525, 55), (520, 880, 60), (600, 860, 80), (670, 885, 55)]:
    c.new_path(); c.arc(x, y, r, 0, 6.283); setc(c, "#FFFFFF", 0.75); c.fill()
# pole
rrect(c, 615, 520, 46, 800, 8); setc(c, "#7A5232"); c.fill(); rrect(c, 615, 520, 18, 800, 8); setc(c, "#94673F"); c.fill()
rrect(c, 540, 600, 200, 26, 6); setc(c, "#6A4428"); c.fill()
for x in (560, 700):
    rrect(c, x - 10, 584, 20, 22, 4); setc(c, "#D9E4EA"); c.fill()
def wire(y0, sag):
    c.new_path(); c.move_to(-20, y0 - 30); c.curve_to(200, y0 + sag, 400, y0 + sag, 560, y0 - 6); c.set_line_width(7); setc(c, "#1A1A1A"); c.stroke()
wire(600, 70); 
c.new_path(); c.move_to(-20, 650); c.curve_to(250, 760, 480, 760, 700, 600); c.set_line_width(7); setc(c, "#1A1A1A"); c.stroke()
# electricity on the wire
def wy(t):  # point on main wire
    p0, p1, p2, p3 = (-20, 570), (200, 670), (400, 670), (560, 594)
    x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0]
    y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1]
    return x, y
random.seed(7)
for t0 in (0.08, 0.22, 0.72, 0.88):
    x, y = wy(t0); c.new_path(); c.move_to(x, y)
    for k in range(5): c.line_to(x + k * 12 + random.uniform(-4, 4), y + random.uniform(-26, 26))
    c.set_line_width(5); setc(c, "#FFE84A"); c.stroke()
    glow(c, x + 20, y, 40, "#FFE84A", 0.5)
bx, by = wy(0.47)
glow(c, bx, by - 60, 190, "#FFFFFF", 0.35)
# bird
c.save(); c.translate(bx, by - 100); c.scale(1.3, 1.3)
c.new_path(); c.move_to(55, 10); c.line_to(120, 40); c.line_to(110, 10); c.close_path(); setc(c, "#1F4FA8"); c.fill()  # tail
c.new_path(); c.save(); c.scale(1.0, 0.92); c.arc(0, 0, 72, 0, 6.283); c.restore(); setc(c, "#3D7BE0"); c.fill()
c.new_path(); c.save(); c.translate(-8, 22); c.scale(1.0, 0.7); c.arc(0, 0, 48, 0, 6.283); c.restore(); setc(c, "#BFE0FF"); c.fill()
c.new_path(); c.save(); c.translate(26, 8); c.rotate(-0.3); c.scale(1.0, 0.6); c.arc(0, 0, 40, 0, 6.283); c.restore(); setc(c, "#2C62C2"); c.fill()
c.new_path(); c.move_to(-66, -8); c.line_to(-102, 4); c.line_to(-64, 14); c.close_path(); setc(c, "#FF9A1F"); c.fill()
c.new_path(); c.arc(-34, -18, 13, 0, 6.283); setc(c, "#FFFFFF"); c.fill(); c.new_path(); c.arc(-37, -18, 7, 0, 6.283); setc(c, "#111111"); c.fill()
c.new_path(); c.arc(-30, 6, 9, 0, 6.283); setc(c, "#FF8FB0", 0.7); c.fill()
c.restore()
for dx in (-16, 14):
    c.new_path(); c.move_to(bx + dx, by - 18); c.line_to(bx + dx, by - 4); c.set_line_width(6); setc(c, "#FF9A1F"); c.stroke()
    c.new_path(); c.arc(bx + dx, by + 2, 9, 3.4, 6.0); c.set_line_width(5); c.stroke()
ring(c, bx, by, 80, 46, 0.0)
red_arrow(c, 420, 900, 420, 820, bx + 30, by + 50)
sticker(c, 420, 960, 420, "O SEGREDO NÃO É O PÉ!", rot=-0.07, sz=30)
character(c, 150, 1240, 360, dict(armL=150, armR=-6, mouth="o", eyes="wide"))
header(c, "13 MIL VOLTS", 98, "PASSANDO NOS PÉS DELE", 48, "E NÃO LEVA CHOQUE?!", "#FFE84A")
s.write_to_png(os.path.join(OUT, "thumb_passarinho_vertical.png"))
print("ok")
