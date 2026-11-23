import numpy as np, sys, json
def proj(c, t, fov, p, asp=720/1280):
    c, t, p = map(np.array, (c, t, p)); z = c - t; z /= np.linalg.norm(z); x = np.cross([0, 1, 0], z); x /= np.linalg.norm(x); y = np.cross(z, x)
    v = p - c; vx, vy, vz = v @ x, v @ y, v @ z
    if vz >= 0: return None
    f = np.tan(np.radians(fov) / 2); return (vx / -vz / (f * asp), vy / -vz / f)
def chk(nome, c, t, fov, pts):
    out = []
    for k, p in pts.items():
        r = proj(c, t, fov, p); ok = r is not None and abs(r[0]) < 0.95 and abs(r[1]) < 0.95
        out.append(f"{k}:{'ok' if ok else 'FORA'}" + (f"({r[0]:+.2f},{r[1]:+.2f})" if r else "(atrás)"))
    print(f"{nome:14s} " + "  ".join(out))
