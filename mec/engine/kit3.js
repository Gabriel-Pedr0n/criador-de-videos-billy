// =====================================================================
//  KIT v2.2 — MATERIAIS COM CARA DE MATERIAL: areia, terra, terra fofa,
//  terra compactada, lama, argila, rocha, brita, asfalto, concreto.
//  Texturas desenhadas grão a grão, ladrilháveis, em escala real (metros).
// =====================================================================
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hex = c => '#' + new THREE.Color(c).getHexString();

//            cor base   grão  manchas  [torrões: n, tam, contraste]  [pedras: n, tam, cor]   lado do ladrilho (m)
export const MAT = {
  areia:      { cor: 0xe2c690, grao: 16, manchas: 0.05, torroes: [0, 0, 0],      pedras: [26, 1.4, 0xb89a62], tam: 1.4, ondas: 0.035 },
  terra:      { cor: 0x8f6540, grao: 20, manchas: 0.12, torroes: [70, 7, 0.14],  pedras: [34, 2.6, 0x9a938a], tam: 2.0 },
  terraFofa:  { cor: 0xc39a62, grao: 22, manchas: 0.10, torroes: [150, 8, 0.2],  pedras: [26, 2.2, 0x8f8778], tam: 1.8 },
  compactada: { cor: 0x7b5a3b, grao: 12, manchas: 0.06, torroes: [18, 5, 0.07],  pedras: [22, 2.0, 0x8f877c], tam: 2.0, riscos: 0.06 },
  lama:       { cor: 0x5a4330, grao: 8,  manchas: 0.10, torroes: [26, 12, 0.1],  pedras: [6, 2.0, 0x6f665c],  tam: 2.0, brilho: 0.16 },
  argila:     { cor: 0xa8562f, grao: 14, manchas: 0.10, torroes: [46, 9, 0.1],   pedras: [14, 2.4, 0xc98d6a], tam: 2.2 },
  rocha:      { cor: 0x4d3a2c, grao: 18, manchas: 0.12, torroes: [30, 10, 0.12], pedras: [70, 5.5, 0x7a7068], tam: 2.4 },
  brita:      { cor: 0x55585c, grao: 10, manchas: 0.0,  torroes: [0, 0, 0],      pedras: [0, 0, 0],           tam: 1.1, britas: [520, 8.5] },
  asfalto:    { cor: 0x2a2c30, grao: 13, manchas: 0.04, torroes: [0, 0, 0],      pedras: [520, 1.3, 0x6f7377], tam: 1.3 },
  asfaltoVelho: { cor: 0x4a4d52, grao: 14, manchas: 0.07, torroes: [0, 0, 0],    pedras: [420, 1.3, 0x8a8d90], tam: 1.5 },
  concreto:   { cor: 0xb3b5b6, grao: 9,  manchas: 0.05, torroes: [0, 0, 0],      pedras: [60, 1.2, 0x8f9193],  tam: 1.6 },
};

export function instalarKit3(E, K, { sh }) {
  const cvs = {}, texs = {};
  // desenha o ladrilho (256 px) do material
  K.canvasMat = (tipo) => { if (cvs[tipo]) return cvs[tipo];
    const M = MAT[tipo], n = 256, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), R = rng(tipo.length * 977 + tipo.charCodeAt(0) * 31), base = new THREE.Color(M.cor);
    x.fillStyle = hex(base); x.fillRect(0, 0, n, n);
    const wrap = f => { for (const ox of [0, n, -n]) for (const oy of [0, n, -n]) f(ox, oy); };
    // manchas largas (umidade, variação de cor)
    for (let i = 0; i < 26; i++) { const px = R() * n, py = R() * n, r = 18 + R() * 46, v = (R() - 0.5) * 2 * M.manchas, col = base.clone().offsetHSL(0, 0, v);
      wrap((ox, oy) => { const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); g.addColorStop(0, hex(col)); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.55; x.fillStyle = g; x.fillRect(px + ox - r, py + oy - r, 2 * r, 2 * r); }); }
    x.globalAlpha = 1;
    // brita: pedras angulosas encaixadas
    if (M.britas) { const [nb, tb] = M.britas;
      for (let i = 0; i < nb; i++) { const px = R() * n, py = R() * n, r = tb * (0.55 + R() * 0.75), nv = 5 + Math.floor(R() * 3), a0 = R() * 6.28, tom = 0.52 + R() * 0.3, pts = [];
        for (let k = 0; k < nv; k++) { const a = a0 + k / nv * 6.283, rr = r * (0.7 + R() * 0.45); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.75 + R() * 0.3)]); }
        wrap((ox, oy) => { x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(px + ox + p[0], py + oy + p[1]) : x.moveTo(px + ox + p[0], py + oy + p[1])); x.closePath();
          x.fillStyle = `rgb(${tom * 255 | 0},${tom * 257 | 0},${tom * 262 | 0})`; x.fill(); x.strokeStyle = 'rgba(30,32,36,0.55)'; x.lineWidth = 1; x.stroke();
          x.beginPath(); x.moveTo(px + ox + pts[0][0], py + oy + pts[0][1]); x.lineTo(px + ox + pts[1][0], py + oy + pts[1][1]); x.strokeStyle = 'rgba(255,255,255,0.28)'; x.stroke(); }); } }
    // torrões: caroços de terra com luz em cima e sombra embaixo
    const [nt, tt, ct] = M.torroes;
    for (let i = 0; i < nt; i++) { const px = R() * n, py = R() * n, rx = tt * (0.4 + R() * 0.8), ry = rx * (0.55 + R() * 0.4), rot = R() * 3, col = base.clone().offsetHSL(0, 0, (R() - 0.35) * ct);
      wrap((ox, oy) => { x.save(); x.translate(px + ox, py + oy); x.rotate(rot); x.beginPath(); x.ellipse(0, 1.2, rx, ry, 0, 0, 6.283); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fill();
        x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, 6.283); x.fillStyle = hex(col); x.fill(); x.beginPath(); x.ellipse(-rx * 0.2, -ry * 0.3, rx * 0.5, ry * 0.4, 0, 0, 6.283); x.fillStyle = 'rgba(255,255,255,0.1)'; x.fill(); x.restore(); }); }
    // pedrinhas / agregado
    const [np, tp, cp] = M.pedras, pc = new THREE.Color(cp || 0x888888);
    for (let i = 0; i < np; i++) { const px = R() * n, py = R() * n, r = tp * (0.5 + R() * 0.9), col = pc.clone().offsetHSL(0, 0, (R() - 0.5) * 0.16), rot = R() * 3;
      wrap((ox, oy) => { x.save(); x.translate(px + ox, py + oy); x.rotate(rot); if (r > 1.8) { x.beginPath(); x.ellipse(0.6, 0.9, r, r * 0.75, 0, 0, 6.283); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fill(); }
        x.beginPath(); x.ellipse(0, 0, r, r * 0.75, 0, 0, 6.283); x.fillStyle = hex(col); x.fill(); x.restore(); }); }
    // grão fino, pixel a pixel (é o que faz areia parecer areia)
    const im = x.getImageData(0, 0, n, n), d = im.data;
    for (let i = 0; i < d.length; i += 4) { let g = (R() - 0.5) * 2 * M.grao; const px = (i / 4) % n, py = Math.floor(i / 4 / n);
      if (M.ondas) g += Math.sin((py + Math.sin(px / n * 6.283 * 2) * 5) / n * 6.283 * 9) * 255 * M.ondas;
      if (M.riscos) g += Math.sin(py / n * 6.283 * 22) * 255 * M.riscos * 0.5;
      d[i] = Math.max(0, Math.min(255, d[i] + g)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + g * 0.96)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + g * 0.9)); }
    x.putImageData(im, 0, 0);
    if (M.brilho) for (let i = 0; i < 14; i++) { const px = R() * n, py = R() * n; wrap((ox, oy) => { x.beginPath(); x.ellipse(px + ox, py + oy, 10 + R() * 16, 3 + R() * 5, R() * 3, 0, 6.283); x.fillStyle = `rgba(255,255,255,${M.brilho * 0.5})`; x.fill(); }); }
    return (cvs[tipo] = c); };
  K.texMat = (tipo) => { if (texs[tipo]) return texs[tipo]; const t = new THREE.CanvasTexture(K.canvasMat(tipo)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (texs[tipo] = t); };
  // caixa de MATERIAL: a textura tem tamanho real em todas as faces (não estica)
  K.bloco = (w, h, d, tipo, o = {}) => { const M = MAT[tipo], geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, p = geo.attributes.position, T = M.tam;
    for (let v = 0; v < 24; v++) { const X = p.getX(v), Y = p.getY(v), Z = p.getZ(v); if (v < 8) uv.setXY(v, Z / T, Y / T); else if (v < 16) uv.setXY(v, X / T, Z / T); else uv.setXY(v, X / T, Y / T); }
    const m = sh(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: K.texMat(tipo), roughness: o.rug ?? (tipo.startsWith('asfalto') ? 0.85 : 1), color: o.cor ?? 0xffffff })), o); m.position.y = h / 2; const g = new THREE.Group(); g.add(m); g.userData.material = tipo; return g; };
  // face do corte do terreno: cada camada com o seu material e a divisa ondulada
  K.texCorte = (camadas, prof) => { const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), R = rng(77), larg = 2.56; let y0 = 0;
    camadas.forEach(([tipo, esp], i) => { const cv = typeof tipo === 'string' ? K.canvasMat(tipo) : null, y1 = i === camadas.length - 1 ? H : Math.min(H, y0 + esp / prof * H);
      x.save(); x.beginPath(); const f0 = R() * 6, f1 = R() * 6, amp = i ? 5 : 0;
      x.moveTo(0, y0 + Math.sin(f0) * amp); for (let px = 0; px <= W; px += 8) x.lineTo(px, y0 + (Math.sin(px / W * 6.283 * 2 + f0) + 0.5 * Math.sin(px / W * 6.283 * 5 + f1)) * amp); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.clip();
      if (cv) { const pat = x.createPattern(cv, 'repeat'), k = W / (larg / MAT[tipo].tam * 256); pat.setTransform(new DOMMatrix().scale(k, k)); x.fillStyle = pat; } else x.fillStyle = hex(tipo);
      x.fillRect(0, 0, W, H); if (i) { x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 3; x.stroke(); } x.restore(); y0 = y1; });
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.larg = larg; return t; };
}
