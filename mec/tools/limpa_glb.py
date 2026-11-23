"""limpa_glb.py — confere e limpa um .glb ANTES de usar na cena (lição 42).

Modelos do Sketchfab muitas vezes trazem peças soltas (uma 2ª versão do objeto, parafusos,
textos, controle remoto ao lado). Elas aumentam a caixa do modelo e o E.modelo apoia essa
caixa no chão/mesa: o objeto de verdade fica FLUTUANDO e fora do centro.

Uso:
  python3 tools/limpa_glb.py modelo.glb                      lista as peças (caixa de cada uma, 0..1)
  python3 tools/limpa_glb.py modelo.glb --principal NOME     marca o que fica FORA da peça principal
  python3 tools/limpa_glb.py modelo.glb --tira N1,N2 --saida limpo.glb   remove peças pelo nome
  python3 tools/limpa_glb.py modelo.glb --principal NOME --tira-fora --saida limpo.glb
Depois: foto de perto do APOIO (pé na mesa/chão) com "mec.py foto" antes de renderizar.
"""
import argparse, numpy as np
from pygltflib import GLTF2


def matriz(n):
    if n.matrix: return np.array(n.matrix).reshape(4, 4).T
    m = np.eye(4)
    if n.scale: m = np.diag(list(n.scale) + [1]) @ m
    if n.rotation:
        x, y, z, w = n.rotation
        R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        r = np.eye(4); r[:3, :3] = R; m = r @ m
    if n.translation: t = np.eye(4); t[:3, 3] = n.translation; m = t @ m
    return m


def raiz(g):  # o nó com mais filhos (Sketchfab: RootNode)
    melhor, filhos = None, -1
    for i, n in enumerate(g.nodes):
        if len(n.children or []) > filhos: melhor, filhos = i, len(n.children or [])
    return melhor


def caixas(g):
    pais = {c: i for i, n in enumerate(g.nodes) for c in (n.children or [])}
    def mundo(i):
        m = np.eye(4)
        while i is not None: m = matriz(g.nodes[i]) @ m; i = pais.get(i)
        return m
    R = raiz(g); res = {}
    def anda(i, top):
        n = g.nodes[i]
        if n.mesh is not None:
            W = mundo(i)
            for p in g.meshes[n.mesh].primitives:
                a = g.accessors[p.attributes.POSITION]; mn, mx = np.array(a.min), np.array(a.max)
                cs = np.array([[x, y, z, 1] for x in (mn[0], mx[0]) for y in (mn[1], mx[1]) for z in (mn[2], mx[2])]) @ W.T
                b = res.setdefault(top, [np.full(3, 1e9), np.full(3, -1e9)]); b[0] = np.minimum(b[0], cs[:, :3].min(0)); b[1] = np.maximum(b[1], cs[:, :3].max(0))
        for c in (n.children or []): anda(c, top)
    for c in g.nodes[R].children or []: anda(c, c)
    return R, res


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("glb"); ap.add_argument("--principal"); ap.add_argument("--tira", default="")
    ap.add_argument("--tira-fora", action="store_true"); ap.add_argument("--saida"); a = ap.parse_args()
    g = GLTF2().load(a.glb); R, cx = caixas(g)
    mn = np.min([b[0] for b in cx.values()], 0); mx = np.max([b[1] for b in cx.values()], 0); S = (mx - mn).max()
    nome = lambda i: g.nodes[i].name or f"nó{i}"
    pr = next((i for i in cx if nome(i).strip() == (a.principal or '').strip()), None)
    fora = set()
    if pr is not None:
        c0, c1 = cx[pr]; tol = 0.05 * S
        fora = {i for i, (b0, b1) in cx.items() if i != pr and (np.any(b0 < c0 - tol) or np.any(b1 > c1 + tol))}
    print(f"caixa total (0..1 = tamanho do modelo); y = altura. Peça mais baixa define o apoio.")
    for i, (b0, b1) in sorted(cx.items(), key=lambda kv: kv[1][0][1]):
        print(f"  {nome(i):40s} min {np.round((b0 - mn) / S, 2)}  max {np.round((b1 - mn) / S, 2)}" + ("   <- FORA da principal" if i in fora else ""))
    tira = {i for i in cx if nome(i).strip() in [x.strip() for x in a.tira.split(",") if x.strip()]} | (fora if a.tira_fora else set())
    if a.saida:
        g.nodes[R].children = [c for c in g.nodes[R].children if c not in tira]; g.save(a.saida)
        print(f"removidas {len(tira)} peças: {[nome(i) for i in tira]} -> {a.saida}")


if __name__ == "__main__":
    main()
