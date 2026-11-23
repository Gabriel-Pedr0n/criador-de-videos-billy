// =====================================================================
//  KIT v2 — alvenaria com textura (tijolo à vista), paredes com vãos,
//  telhado de telha, janela, porta, casas de cenário e o MUNDO BAIRRO.
// =====================================================================
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function instalarKit2(E, K, { mat, sh }) {
  const COR = K.COR, cache = {};
  const ALV = { tijolo: { tam: [0.29, 0.19], cor: '#b9502c', junta: '#d9c7a8', furo: '#7d2f18' }, tijolinho: { tam: [0.21, 0.07], cor: '#b24a2a', junta: '#e3d6bd' }, bloco: { tam: [0.39, 0.19], cor: '#9c9d9b', junta: '#c9c9c4' } };
  // textura de alvenaria: 'tijolo' (baiano furado à vista), 'tijolinho' (maciço), 'bloco' (concreto)
  K.texAlvenaria = (tipo = 'tijolo') => { if (cache[tipo]) return cache[tipo];
    const A = ALV[tipo], n = 256, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), R = rng(7), bw = n / 2, bh = n / 4, j = 6;
    x.fillStyle = A.junta; x.fillRect(0, 0, n, n);
    for (let r = 0; r < 4; r++) for (let k = -1; k < 2; k++) { const ox = (r % 2 ? bw / 2 : 0) + k * bw, oy = r * bh;
      x.fillStyle = '#' + new THREE.Color(A.cor).offsetHSL(0, 0, (R() - 0.5) * 0.09).getHexString(); x.fillRect(ox + j / 2, oy + j / 2, bw - j, bh - j);
      if (A.furo) { x.fillStyle = A.furo; const fw = (bw - j - 22) / 4, fh = (bh - j - 20) / 2; for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) x.fillRect(ox + j / 2 + 8 + a * (fw + 2), oy + j / 2 + 8 + b * (fh + 4), fw - 3, fh - 2); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (cache[tipo] = t); };
  K.texTelha = (cor = '#c8492f') => { const key = 'telha' + cor; if (cache[key]) return cache[key];
    const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), base = new THREE.Color(cor);
    x.fillStyle = '#' + base.getHexString(); x.fillRect(0, 0, n, n);
    for (let i = 0; i < 4; i++) { const g = x.createLinearGradient(i * 32, 0, i * 32 + 32, 0); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0.22)'); x.fillStyle = g; x.fillRect(i * 32, 0, 32, n); }
    x.fillStyle = 'rgba(0,0,0,0.3)'; for (let r = 0; r < 2; r++) x.fillRect(0, r * 64, n, 5);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (cache[key] = t); };

  // K.parede(larg, alt, esp, {tipo:'tijolo'|'tijolinho'|'bloco'|'reboco'|'concreto', cor, vaos:[{x, y, w, h}]})
  //   vão: x = centro ao longo da parede (0 = meio), y = altura da base do vão. A parede fica ao longo de X, virada para +Z.
  K.parede = (w, h, d, o = {}) => { const tipo = o.tipo || 'tijolo', A = ALV[tipo], g = new THREE.Group(), vaos = o.vaos || [];
    const face = A ? new THREE.MeshStandardMaterial({ map: K.texAlvenaria(tipo), roughness: 0.95 }) : mat(o.cor ?? (tipo === 'concreto' ? COR.concreto : COR.reboco), { rug: 0.9 });
    const liso = A ? mat(A.cor, { rug: 0.95 }) : face;
    const xs = [...new Set([-w / 2, w / 2, ...vaos.flatMap(v => [v.x - v.w / 2, v.x + v.w / 2])])].sort((a, b) => a - b), ys = [...new Set([0, h, ...vaos.flatMap(v => [v.y, v.y + v.h])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < ys.length - 1; k++) { const cw = xs[i + 1] - xs[i], ch = ys[k + 1] - ys[k], mx = xs[i] + cw / 2, my = ys[k] + ch / 2;
      if (cw < 1e-4 || ch < 1e-4 || vaos.some(v => mx > v.x - v.w / 2 && mx < v.x + v.w / 2 && my > v.y && my < v.y + v.h)) continue;
      const geo = new THREE.BoxGeometry(cw, ch, d);
      if (A) { const uv = geo.attributes.uv, pos = geo.attributes.position; for (let v = 16; v < 24; v++) uv.setXY(v, (pos.getX(v) + mx + w / 2) / (A.tam[0] * 2), (pos.getY(v) + my) / (A.tam[1] * 4)); }
      const m = sh(new THREE.Mesh(geo, [liso, liso, liso, liso, face, face])); m.position.set(mx, my, 0); g.add(m); }
    g.userData.dim = { w, h, d }; return g; };
  // oitão: o triângulo de parede que fecha o telhado de duas águas
  K.oitao = (w, alt, d, o = {}) => { const tipo = o.tipo || 'tijolo', A = ALV[tipo], s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, alt); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); geo.translate(0, 0, -d / 2);
    if (A) { const uv = geo.attributes.uv; for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) / (A.tam[0] * 2), uv.getY(v) / (A.tam[1] * 4)); }
    const m = sh(new THREE.Mesh(geo, A ? new THREE.MeshStandardMaterial({ map: K.texAlvenaria(tipo), roughness: 0.95 }) : mat(o.cor ?? COR.reboco, { rug: 0.9 }))); const g = new THREE.Group(); g.add(m); return g; };
  // telhado de duas águas (cumeeira ao longo de X). Origem = altura do topo das paredes.
  K.telhado = (w, d, o = {}) => { const alt = o.alt ?? d * 0.3, be = o.beiral ?? 0.35, g = new THREE.Group(), half = d / 2 + be, incl = alt / (d / 2), ang = Math.atan(incl), len = half / Math.cos(ang), esp = 0.07;
    const tex = K.texTelha(o.cor), telha = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), liso = mat(o.cor ? new THREE.Color(o.cor).getHex() : 0xb5412a, { rug: 0.85 });
    for (const s of [1, -1]) { const geo = new THREE.BoxGeometry(w + 2 * be, esp, len), uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let v = 8; v < 12; v++) uv.setXY(v, pos.getX(v) / 0.8, pos.getZ(v) / 0.8);
      const m = sh(new THREE.Mesh(geo, [liso, liso, telha, liso, liso, liso])); m.position.set(0, alt - (half / 2) * incl + esp / 2, s * half / 2); m.rotation.x = s * ang; g.add(m); }
    const cume = sh(new THREE.Mesh(new THREE.BoxGeometry(w + 2 * be, 0.06, 0.2), liso)); cume.position.y = alt + 0.07; g.add(cume);
    g.userData.dim = { alt, incl }; return g; };
  // madeiramento do telhado (tesouras + ripas), para mostrar antes das telhas
  K.madeiramento = (w, d, o = {}) => { const alt = o.alt ?? d * 0.3, g = new THREE.Group(), M = mat(COR.madeira, { rug: 0.9 }), half = d / 2, ang = Math.atan(alt / half), len = Math.hypot(half, alt), n = o.n || Math.max(3, Math.round(w / 1.2));
    for (let i = 0; i < n; i++) { const x = -w / 2 + w * i / (n - 1);
      for (const s of [1, -1]) { const c = sh(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, len), M)); c.position.set(x, alt / 2, s * half / 2); c.rotation.x = s * ang; g.add(c); }
      const t = sh(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, d), M)); t.position.set(x, 0.04, 0); g.add(t); }
    for (const s of [1, -1]) for (let k = 1; k <= 4; k++) { const f = k / 4.4, r = sh(new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.05), M)); r.position.set(0, alt * (1 - f) + 0.07, s * half * f); g.add(r); }
    return g; };
  K.janela = (w = 1.1, h = 1, o = {}) => { const g = new THREE.Group(), M = mat(o.cor ?? 0xffffff, { rug: 0.5 }), e = 0.06, p = o.prof ?? 0.1;
    const bar = (bw, bh2, x, y) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(bw, bh2, p), M)); m.position.set(x, y, 0); g.add(m); };
    bar(w, e, 0, e / 2); bar(w, e, 0, h - e / 2); bar(e, h, -w / 2 + e / 2, h / 2); bar(e, h, w / 2 - e / 2, h / 2); bar(e * 0.7, h, 0, h / 2); bar(w, e * 0.7, 0, h / 2);
    const v = new THREE.Mesh(new THREE.BoxGeometry(w - e, h - e, 0.02), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, transparent: true, opacity: 0.55 })); v.position.y = h / 2; v.userData.semColisao = true; g.add(v); return g; };
  K.porta = (w = 0.85, h = 2.1, o = {}) => { const g = new THREE.Group(), p = o.prof ?? 0.08, f = sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, p), mat(o.cor ?? 0x8a5a33, { rug: 0.7 }))); f.position.y = h / 2; g.add(f);
    const al = sh(new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.36, p + 0.015), mat(new THREE.Color(o.cor ?? 0x8a5a33).offsetHSL(0, 0, -0.06).getHex()))); al.position.y = h * 0.7; g.add(al);
    const al2 = al.clone(); al2.position.y = h * 0.27; g.add(al2);
    const k = sh(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), mat(0xd9b24a, { metal: 0.7, rug: 0.3 }))); k.position.set(w * 0.36, h * 0.48, p / 2 + 0.03); g.add(k); return g; };
  // casa pronta de CENÁRIO (vizinhança). Frente virada para +Z.
  K.casa = (o = {}) => { const w = o.w || 7, d = o.d || 6, h = o.h || 2.8, cor = o.cor ?? 0xf3e2c0, g = new THREE.Group(), alt = d * 0.3;
    g.add(K.caixa(w, h, d, cor, { rug: 0.9 }));
    const tl = K.telhado(w, d, { alt, cor: o.telhado }); tl.position.y = h; g.add(tl);
    for (const s of [1, -1]) { const oi = K.oitao(d, alt, 0.12, { tipo: 'reboco', cor }); oi.rotation.y = Math.PI / 2; oi.position.set(s * (w / 2 - 0.06), h, 0); g.add(oi); }
    const p = K.porta(0.9, 2.05, { cor: o.porta }); p.position.set(-w * 0.18, 0, d / 2 + 0.02); g.add(p);
    const j = K.janela(1.3, 1.0, { cor: o.esquadria }); j.position.set(w * 0.2, 1.0, d / 2 + 0.02); g.add(j);
    const j2 = K.janela(1.1, 1.0, { cor: o.esquadria }); j2.rotation.y = Math.PI / 2; j2.position.set(w / 2 + 0.02, 1.0, 0); g.add(j2);
    const base = K.caixa(w + 0.1, 0.25, d + 0.1, new THREE.Color(cor).offsetHSL(0, -0.1, -0.25).getHex()); g.add(base);
    return g; };
  K.rua = (x0, x1, z, o = {}) => { const larg = o.larg ?? 6, g = new THREE.Group(), L = x1 - x0, asf = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, larg), mat(0x3a3d42, { rug: 1 })); asf.position.set((x0 + x1) / 2, 0.0, z); asf.receiveShadow = true; g.add(asf);
    for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 1.4), mat(0xc9c5bb, { rug: 1 })); c.position.set((x0 + x1) / 2, 0.05, z + s * (larg / 2 + 0.7)); c.receiveShadow = true; g.add(c); }
    const fx = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.045, 0.14), new THREE.MeshBasicMaterial({ color: 0xf2f2e6 }), Math.floor(L / 4)), M = new THREE.Matrix4();
    for (let i = 0; i < fx.count; i++) fx.setMatrixAt(i, M.makeTranslation(x0 + 2 + i * 4, 0.005, z)); fx.frustumCulled = false; g.add(fx); return g; };
  K.predioFundo = (alt = 40, o = {}) => { const w = o.w || 12, c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = o.cor || '#aab3bf'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(40,60,90,0.35)'; for (let r = 0; r < 12; r++) for (let k = 0; k < 4; k++) x.fillRect(5 + k * 15, 5 + r * 10.4, 9, 6);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, alt / 36);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, alt, w * 0.8), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); m.position.y = alt / 2; const g = new THREE.Group(); g.add(m); return g; };

  // MUNDO BAIRRO: o lote de trabalho no meio de uma rua com casas, calçada, árvores, prédios e morros ao fundo.
  //   o.lote = {x0, x1, z0, z1} (área livre da obra). A rua passa na frente (z maior). o.terra = cor do chão do lote.
  K.mundoBairro = (o = {}) => { const lote = o.lote || { x0: -7, x1: 7, z0: -6, z1: 6 }, R = rng(o.seed || 31), sc = E.scene;
    K.mundoCampo({ arvores: 26, livre: 46, tufos: 0, morros: 10, nuvens: 16, sombra: o.sombra || 14, ...o });
    const zr = lote.z1 + 5.4; sc.add(K.rua(-90, 90, zr));
    const PAL = [0xf3e2c0, 0xf7c9a0, 0xcfe6c9, 0xbfd9ee, 0xf5e59a, 0xe9c4d0, 0xffffff, 0xd9d0c1], TEL = ['#c8492f', '#b5412a', '#a8482f', '#cf5a36'];
    const casa = (x, z, ry) => { const c = K.casa({ w: 6 + R() * 2.5, d: 5.5 + R() * 1.5, cor: PAL[Math.floor(R() * PAL.length)], telhado: TEL[Math.floor(R() * TEL.length)] }); c.position.set(x, 0, z); c.rotation.y = ry; c.userData.semColisao = true; sc.add(c);
      if (R() < 0.75) { const a = (R() < 0.5 ? K.arvore : K.pinheiro)(3 + R() * 2.5, { seed: Math.floor(R() * 999) }); a.position.set(x + 4.6 * (R() < 0.5 ? 1 : -1), 0, z + (R() - 0.5) * 3); sc.add(a); } };
    for (let x = -66; x <= 66; x += 11) casa(x + (R() - 0.5) * 1.5, zr + 9.5 + R() * 1.5, Math.PI);              // do outro lado da rua
    for (let x = -66; x <= 66; x += 11) casa(x + (R() - 0.5) * 1.5, lote.z0 - 9 - R() * 2, 0);                    // fundos
    for (let k = 1; k <= 5; k++) { casa(lote.x0 - 2 - k * 11, (lote.z0 + lote.z1) / 2 + (R() - 0.5) * 2, 0); casa(lote.x1 + 2 + k * 11, (lote.z0 + lote.z1) / 2 + (R() - 0.5) * 2, 0); }   // vizinhos
    for (let i = 0; i < (o.predios ?? 9); i++) { const a = -2.6 + R() * 2.1 + (i % 2 ? 0 : 3.3), dist = 130 + R() * 110, p = K.predioFundo(26 + R() * 40, { cor: ['#aab3bf', '#b9c0c9', '#c9cdd3'][i % 3] }); p.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist - 20); p.rotation.y = R() * 3; sc.add(p); }
    if (o.muro !== false) { const M = mat(0xe4dccb, { rug: 1 }), hm = o.muroAlt ?? 1.1, e = 0.14, add = (w, d, x, z) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, hm, d), M)); m.position.set(x, hm / 2, z); sc.add(m); };
      const fx = lote.x0 - 1.2, gx = lote.x1 + 1.2, fz = lote.z0 - 1.2, gz = lote.z1 + 1.6;
      add(gx - fx, e, (fx + gx) / 2, fz); add(e, gz - fz, fx, (fz + gz) / 2); add(e, gz - fz, gx, (fz + gz) / 2); }
    return { lote, zRua: zr }; };
}
