import cairo, math, random

W, H = 720, 1280
FONT = "Poppins"


def hexc(h, a=1.0):
    h = h.lstrip('#')
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)


def setc(ctx, h, a=1.0):
    ctx.set_source_rgba(*hexc(h, a))


def lerp(a, b, t):
    return a + (b - a) * t


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def back_out(x):
    x = clamp(x)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def env(t, a, b, fi=0.3, fo=0.3):
    if t < a or t > b:
        return 0.0
    return min(ease((t - a) / fi) if fi > 0 else 1, ease((b - t) / fo) if fo > 0 else 1)


def mixc(c1, c2, t):
    a, b = hexc(c1), hexc(c2)
    return tuple(lerp(a[i], b[i], t) for i in range(4))


def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def rrect4(ctx, x, y, w, h, rtl, rtr, rbr, rbl):
    ctx.new_sub_path()
    ctx.move_to(x + rtl, y)
    ctx.line_to(x + w - rtr, y)
    if rtr: ctx.arc(x + w - rtr, y + rtr, rtr, -math.pi / 2, 0)
    ctx.line_to(x + w, y + h - rbr)
    if rbr: ctx.arc(x + w - rbr, y + h - rbr, rbr, 0, math.pi / 2)
    ctx.line_to(x + rbl, y + h)
    if rbl: ctx.arc(x + rbl, y + h - rbl, rbl, math.pi / 2, math.pi)
    ctx.line_to(x, y + rtl)
    if rtl: ctx.arc(x + rtl, y + rtl, rtl, math.pi, 1.5 * math.pi)
    ctx.close_path()


def font(ctx, size, weight="ExtraBold"):
    ctx.select_font_face("PoppinsB" if weight == "Bold" else "PoppinsXB",
                         cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)


def text_w(ctx, s):
    return ctx.text_extents(s).x_advance


def outlined_text(ctx, s, cx, y, size, fill="#FFFFFF", stroke="#000000", sw=None, weight="ExtraBold",
                  maxw=None, align="center", alpha=1.0, shadow=True):
    font(ctx, size, weight)
    w = text_w(ctx, s)
    if maxw and w > maxw:
        size = size * maxw / w
        font(ctx, size, weight)
        w = text_w(ctx, s)
    if sw is None:
        sw = size * 0.16
    x = cx - w / 2 if align == "center" else cx
    ctx.save()
    if shadow:
        ctx.move_to(x, y + size * 0.07)
        ctx.text_path(s)
        ctx.set_line_width(sw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        setc(ctx, "#000000", 0.35 * alpha)
        ctx.stroke_preserve(); ctx.fill()
    ctx.move_to(x, y)
    ctx.text_path(s)
    ctx.set_line_width(sw)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    setc(ctx, stroke, alpha)
    ctx.stroke_preserve()
    setc(ctx, fill, alpha)
    ctx.fill()
    ctx.restore()
    return w


def plain_text(ctx, s, cx, y, size, col="#FFFFFF", weight="Bold", align="center", alpha=1.0):
    font(ctx, size, weight)
    w = text_w(ctx, s)
    x = cx - w / 2 if align == "center" else (cx - w if align == "right" else cx)
    ctx.move_to(x, y)
    setc(ctx, col, alpha)
    ctx.show_text(s)
    return w


def pill(ctx, cx, cy, s, bg="#FFD23F", fg="#1B1B1B", size=26, border="#FFFFFF", scale=1.0, alpha=1.0,
         weight="Bold"):
    if scale <= 0.01 or alpha <= 0.01:
        return
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    font(ctx, size, weight)
    w = text_w(ctx, s)
    pw, ph = w + size * 1.3, size * 1.75
    # shadow
    rrect(ctx, -pw / 2, -ph / 2 + 5, pw, ph, ph / 2)
    setc(ctx, "#000000", 0.28 * alpha); ctx.fill()
    rrect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2)
    setc(ctx, bg, alpha); ctx.fill_preserve()
    if border:
        ctx.set_line_width(3)
        setc(ctx, border, alpha); ctx.stroke()
    else:
        ctx.new_path()
    ctx.move_to(-w / 2, size * 0.36)
    setc(ctx, fg, alpha)
    ctx.show_text(s)
    ctx.restore()


def glow(ctx, x, y, r, col, a=1.0):
    g = cairo.RadialGradient(x, y, 0, x, y, r)
    c = hexc(col)
    g.add_color_stop_rgba(0, c[0], c[1], c[2], a)
    g.add_color_stop_rgba(0.35, c[0], c[1], c[2], a * 0.45)
    g.add_color_stop_rgba(1, c[0], c[1], c[2], 0)
    ctx.set_source(g)
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.fill()


def burst(ctx, cx, cy, r, s, scale=1.0, rot=-0.12, bg="#FFF3B0", fg="#E53935", size=40):
    if scale <= 0.01:
        return
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale)
    n = 14
    for k in range(2 * n):
        a = k * math.pi / n
        rr = r if k % 2 == 0 else r * 0.72
        x, y = math.cos(a) * rr * 1.25, math.sin(a) * rr
        ctx.line_to(x, y) if k else ctx.move_to(x, y)
    ctx.close_path()
    setc(ctx, bg); ctx.fill_preserve()
    ctx.set_line_width(5); setc(ctx, "#1B1B1B"); ctx.stroke()
    outlined_text(ctx, s, 0, size * 0.36, size, fill=fg, stroke="#FFFFFF", sw=size * 0.12, shadow=False)
    ctx.restore()


# ---------------------------------------------------------------- character
# Reference coords taken from the channel character image (approx 1464x2000 canvas)
SKIN_L, SKIN_R = "#E8A87C", "#D9946E"
LEG_L, LEG_R = "#E4A27C", "#D9956F"
HOOD_L, HOOD_R = "#F0B724", "#DAA01C"
CUFF_L, CUFF_R = "#DBA01C", "#C48E16"


def _arm(ctx, px, py, ang, side):
    # arm hanging down from pivot (px,py); local coords: arm x -68..68, y -48..343
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(math.radians(ang))
    col = HOOD_L if side == "L" else HOOD_R
    cuff = CUFF_L if side == "L" else CUFF_R
    skin = SKIN_L if side == "L" else SKIN_R
    rrect4(ctx, -68, -48, 136, 380, 66, 66, 22, 22)
    setc(ctx, col); ctx.fill()
    rrect(ctx, -68, 283, 136, 60, 20)
    setc(ctx, cuff); ctx.fill()
    rrect(ctx, -52, 343, 105, 112, 46)
    setc(ctx, skin); ctx.fill()
    ctx.restore()


def character(ctx, cx, feet_y, h, pose=None):
    """Draw channel character. cx = horizontal centre, feet_y = bottom of soles, h = height in px."""
    p = dict(armL=6, armR=-6, mouth="smile", eyes="open", squash=1.0, alpha=1.0, tilt=0.0, shadow=True)
    if pose:
        p.update(pose)
    s = h / (1772 - 135)
    ctx.save()
    if p["alpha"] < 1:
        ctx.push_group()
    ctx.translate(cx, feet_y)
    ctx.scale(s, s)
    ctx.translate(-717, -1772)
    if p["shadow"]:
        ctx.save(); ctx.translate(717, 1785); ctx.scale(1, 0.12)
        ctx.arc(0, 0, 330, 0, 2 * math.pi); ctx.restore()
        setc(ctx, "#000000", 0.28); ctx.fill()
    # squash around feet
    ctx.translate(717, 1772); ctx.rotate(p["tilt"]); ctx.scale(1 + (1 - p["squash"]) * 0.6, p["squash"]); ctx.translate(-717, -1772)

    # legs
    rrect4(ctx, 573, 1360, 114, 290, 0, 0, 18, 18); setc(ctx, LEG_L); ctx.fill()
    rrect4(ctx, 747, 1360, 114, 290, 0, 0, 18, 18); setc(ctx, LEG_R); ctx.fill()
    # shoes: two separate sneakers, blue with white sole
    for (x0, top, sole) in ((520, "#2F6FDB", "#F2F2F2"), (737, "#2A62C4", "#E2E2E2")):
        rrect4(ctx, x0, 1628, 182, 108, 26, 26, 6, 6); setc(ctx, top); ctx.fill()
        rrect4(ctx, x0 - 2, 1724, 186, 48, 4, 4, 14, 14); setc(ctx, sole); ctx.fill()
        # toe stripe
        rrect(ctx, x0 + 18, 1700, 146, 10, 5); setc(ctx, "#FFFFFF", 0.35); ctx.fill()
    # shorts
    ctx.move_to(538, 1110); ctx.line_to(717, 1110); ctx.line_to(717, 1250); ctx.line_to(702, 1385); ctx.line_to(513, 1385); ctx.close_path()
    setc(ctx, "#1E2A5E"); ctx.fill()
    ctx.move_to(717, 1110); ctx.line_to(898, 1110); ctx.line_to(921, 1385); ctx.line_to(732, 1385); ctx.line_to(717, 1250); ctx.close_path()
    setc(ctx, "#16214D"); ctx.fill()

    armL, armR = p["armL"], p["armR"]
    # arms raised across body are drawn in front of torso
    if armL <= 120:
        _arm(ctx, 460, 722, armL, "L")
    if armR >= -120 and armR <= 60:
        _arm(ctx, 974, 722, armR, "R")
    # torso
    ctx.save()
    rrect(ctx, 521, 645, 392, 500, 62); ctx.clip()
    ctx.rectangle(521, 645, 196, 500); setc(ctx, HOOD_L); ctx.fill()
    ctx.rectangle(717, 645, 196, 500); setc(ctx, HOOD_R); ctx.fill()
    ctx.move_to(603, 988); ctx.line_to(717, 988); ctx.line_to(717, 1078); ctx.line_to(573, 1078); ctx.close_path()
    setc(ctx, "#DBA01C"); ctx.fill()
    ctx.restore()
    # hood collar
    ctx.move_to(550, 642); ctx.line_to(566, 606); ctx.line_to(868, 606); ctx.line_to(884, 642)
    ctx.curve_to(820, 672, 770, 690, 717, 690); ctx.curve_to(664, 690, 614, 672, 550, 642); ctx.close_path()
    setc(ctx, "#F6C63C"); ctx.fill()
    ctx.move_to(634, 662); ctx.curve_to(670, 686, 700, 692, 717, 692); ctx.curve_to(734, 692, 764, 686, 800, 662)
    ctx.set_line_width(10); setc(ctx, "#C8901A"); ctx.stroke()
    # drawstrings
    for x0 in (664, 751):
        rrect(ctx, x0, 702, 19, 170, 9); setc(ctx, "#FFFFFF"); ctx.fill()
        rrect(ctx, x0 - 4, 868, 27, 30, 6); setc(ctx, "#3A3A3A"); ctx.fill()
    if armL > 120:
        _arm(ctx, 460, 722, armL, "L")
    if armR < -120 or armR > 60:
        _arm(ctx, 974, 722, armR, "R")
    # head
    ctx.save()
    rrect4(ctx, 521, 430, 392, 190, 0, 0, 64, 64); ctx.clip()
    ctx.rectangle(521, 430, 234, 190); setc(ctx, SKIN_L); ctx.fill()
    ctx.rectangle(755, 430, 158, 190); setc(ctx, SKIN_R); ctx.fill()
    ctx.restore()
    # eyes
    if p["eyes"] == "open":
        for ex in (619, 815):
            ctx.save(); ctx.translate(ex, 483); ctx.scale(19, 26); ctx.arc(0, 0, 1, 0, 2 * math.pi); ctx.restore()
            setc(ctx, "#2A2A2A"); ctx.fill()
    elif p["eyes"] == "wide":
        for ex in (619, 815):
            ctx.save(); ctx.translate(ex, 483); ctx.scale(24, 32); ctx.arc(0, 0, 1, 0, 2 * math.pi); ctx.restore()
            setc(ctx, "#2A2A2A"); ctx.fill()
            ctx.arc(ex - 6, 474, 7, 0, 2 * math.pi); setc(ctx, "#FFFFFF"); ctx.fill()
    elif p["eyes"] == "closed":
        ctx.set_line_width(10); ctx.set_line_cap(cairo.LINE_CAP_ROUND); setc(ctx, "#2A2A2A")
        for ex in (619, 815):
            ctx.new_path(); ctx.arc(ex, 478, 20, 0.15 * math.pi, 0.85 * math.pi); ctx.stroke()
    else:  # squint  > <
        ctx.set_line_width(11); ctx.set_line_cap(cairo.LINE_CAP_ROUND); setc(ctx, "#2A2A2A")
        ctx.move_to(598, 466); ctx.line_to(636, 484); ctx.line_to(598, 502); ctx.stroke()
        ctx.move_to(836, 466); ctx.line_to(798, 484); ctx.line_to(836, 502); ctx.stroke()
    # mouth
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    setc(ctx, "#3B2A20")
    if p["mouth"] == "smile":
        ctx.move_to(655, 566); ctx.curve_to(690, 592, 745, 592, 778, 566)
        ctx.set_line_width(13); ctx.stroke()
    elif p["mouth"] == "o":
        ctx.save(); ctx.translate(717, 572); ctx.scale(24, 30); ctx.arc(0, 0, 1, 0, 2 * math.pi); ctx.restore(); ctx.fill()
    elif p["mouth"] == "pain":
        ctx.move_to(650, 580); ctx.line_to(680, 562); ctx.line_to(717, 580); ctx.line_to(752, 562); ctx.line_to(784, 580)
        ctx.set_line_width(11); ctx.stroke()
    elif p["mouth"] == "flat":
        ctx.move_to(670, 574); ctx.line_to(764, 574); ctx.set_line_width(12); ctx.stroke()
    # hat
    ctx.move_to(492, 400); ctx.line_to(492, 370); ctx.curve_to(492, 250, 590, 190, 717, 188)
    ctx.curve_to(844, 190, 944, 250, 944, 370); ctx.line_to(944, 400); ctx.close_path()
    ctx.save(); ctx.clip_preserve()
    ctx.rectangle(480, 180, 237, 230); setc(ctx, "#FFFFFF"); ctx.fill()
    ctx.rectangle(717, 180, 240, 230); setc(ctx, "#E3E3E3"); ctx.fill()
    ctx.restore()
    ctx.set_line_width(5); setc(ctx, "#CFCFCF"); ctx.stroke()
    rrect(ctx, 663, 135, 107, 68, 16); setc(ctx, "#F3F3F3"); ctx.fill_preserve(); setc(ctx, "#CFCFCF"); ctx.stroke()
    rrect(ctx, 445, 398, 545, 47, 20); setc(ctx, "#F3F3F3"); ctx.fill_preserve(); setc(ctx, "#C8C8C8"); ctx.stroke()
    if p["alpha"] < 1:
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(p["alpha"])
        ctx.restore()
        return
    ctx.restore()
