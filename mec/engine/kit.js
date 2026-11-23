// =====================================================================
//  KIT DE PEÇAS — tudo com a origem na BASE (y=0 é o chão da peça),
//  cores vivas, low-poly limpo, sombras ligadas.
// =====================================================================
import * as THREE from 'three';
import { instalarKit2 } from './kit2.js';
import { instalarKit3, MAT } from './kit3.js';

export const COR = {
  grama: 0x58b947, gramaEsc: 0x3f9a3a, terra: 0x6b4a33, terraEsc: 0x4d3424, argila: 0xa5552d, areia: 0xe6d3a3, brita: 0x9aa0a6,
  concreto: 0xa9abad, concretoFresco: 0x8d9092, bloco: 0x9b9b98, tijolo: 0xc0623a, reboco: 0xd9c7a4, madeira: 0xc9995a, madeiraEsc: 0x8a5a33,
  aco: 0xb9c0c8, ferro: 0x7a4a2e, pvc: 0xf2f2ee, pvcMarrom: 0x7b4a2f, pvcAzul: 0x2f6fd8, louca: 0xf7f7f5, cromado: 0xc9d2da, borracha: 0x1e1e22,
  agua: 0x3fa8ff, esgoto: 0x7a6a3a, preto: 0x17191c, branco: 0xffffff, amarelo: 0xffd23f, vermelho: 0xe5483a, verde: 0x3cc45a, lona: 0x1a2a4a,
};
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function makeKit(E) {
  const K = { COR };
  const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: o.rug ?? 0.8, metalness: o.metal ?? 0, flatShading: !!o.facetado,
    transparent: o.op != null && o.op < 1, opacity: o.op ?? 1, side: o.duplo ? THREE.DoubleSide : THREE.FrontSide });
  const sh = (m, o = {}) => { m.castShadow = o.sombra !== false; m.receiveShadow = true; return m; };
  const base = (mesh, h) => { mesh.position.y = h / 2; const g = new THREE.Group(); g.add(mesh); return g; };
  K.mat = mat;
  K.grupo = (...f) => { const g = new THREE.Group(); f.flat().forEach(x => g.add(x)); return g; };
  // K.em(peça, x, y, z, pai?, nome?) — coloca a peça no mundo e a registra para a inspeção automática
  K.em = (obj, x, y, z, pai, nome) => { if (typeof pai === 'string') { nome = pai; pai = null; } obj.position.set(x, y, z); (pai || E.scene).add(obj);
    if (!obj.userData.semColisao && !(pai && E.solidos.includes(pai))) E.registrar(obj, nome); else if (nome) obj.name = nome; return obj; };

  // ---------------------------------------------------------------- primitivas
  K.caixa = (w, h, d, cor, o = {}) => base(sh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(cor, o)), o), h);
  K.cilindro = (r, h, cor, o = {}) => base(sh(new THREE.Mesh(new THREE.CylinderGeometry(o.rTopo ?? r, r, h, o.seg || 24, 1, !!o.aberto), mat(cor, o)), o), h);
  K.esfera = (r, cor, o = {}) => base(sh(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 24, 16), mat(cor, o)), o), r * 2);
  K.cone = (r, h, cor, o = {}) => base(sh(new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 20), mat(cor, o)), o), h);
  K.anel = (R, r, cor, o = {}) => { const m = sh(new THREE.Mesh(new THREE.TorusGeometry(R, r, 12, 32), mat(cor, o)), o); m.rotation.x = Math.PI / 2; m.position.y = r; const g = new THREE.Group(); g.add(m); return g; };
  // cano/mangueira passando pelos pontos [[x,y,z],...] (em coordenadas do mundo)
  K.tubo = (pts, r, cor, o = {}) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', o.tensao ?? 0.25);
    const m = sh(new THREE.Mesh(new THREE.TubeGeometry(c, o.seg || pts.length * 14, r, 12, false), mat(cor, o)), o); m.userData.curva = c; return m; };
  // cano reto com cotovelos vivos (PVC): pontos ligados por cilindros + juntas
  K.cano = (pts, r, cor, o = {}) => { const g = new THREE.Group(), M = mat(cor, o), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < pts.length; i++) { const a = new THREE.Vector3(...pts[i]);
      const j = sh(new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 14, 10), M)); j.position.copy(a); g.add(j);
      if (i < pts.length - 1) { const b = new THREE.Vector3(...pts[i + 1]), d = b.clone().sub(a), L = d.length();
        const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 16), M)); c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(up, d.normalize()); g.add(c); } }
    return g; };
  K.parafuso = (comp = 0.08, r = 0.008, cor = COR.aco) => { const g = new THREE.Group(), M = mat(cor, { metal: 0.7, rug: 0.35 });
    const c = sh(new THREE.Mesh(new THREE.CylinderGeometry(r, r, comp, 10), M)); c.position.y = comp / 2;
    const h = sh(new THREE.Mesh(new THREE.CylinderGeometry(r * 2.1, r * 2.1, r * 1.4, 6), M)); h.position.y = comp + r * 0.7; g.add(c, h); return g; };
  K.agua = (w, h, d, o = {}) => base(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: o.cor || COR.agua, transparent: true, opacity: o.op ?? 0.72, roughness: 0.15 })), h);
  K.vergalhoes = (alt, n = 4, raio = 0.05, o = {}) => { const g = new THREE.Group(), M = mat(o.cor || COR.ferro, { metal: 0.5, rug: 0.5 });
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + 0.785, c = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, alt, 6), M)); c.position.set(Math.cos(a) * raio, alt / 2, Math.sin(a) * raio); g.add(c); }
    for (let y = 0.12; y < alt; y += o.estribo || 0.2) { const e = sh(new THREE.Mesh(new THREE.TorusGeometry(raio * 1.05, 0.004, 6, 4), M)); e.rotation.x = Math.PI / 2; e.rotation.z = 0.785; e.position.y = y; g.add(e); }
    return g; };

  // ---------------------------------------------------------------- alvenaria / revestimento
  // K.blocos({cols, fiadas, bloco:[comp, alt, esp], cor, junta, amarrado}) -> use E.constroi(muro, de, ate)
  K.blocos = (o = {}) => { const [bw, bh, bd] = o.bloco || [0.39, 0.19, 0.14], j = o.junta ?? 0.012, cols = o.cols || 8, fi = o.fiadas || 6, R = rng(o.seed || 5);
    const pecas = [], larg = cols * (bw + j);
    for (let f = 0; f < fi; f++) { const off = (o.amarrado !== false && f % 2) ? (bw + j) / 2 : 0;
      for (let c = 0; c < cols + (off ? 1 : 0); c++) { let w = bw, x = -larg / 2 + c * (bw + j) + bw / 2;
        if (off) { const hw = bw / 2 - j / 2;
          if (c === 0) { w = hw; x = -larg / 2 + hw / 2; } else if (c === cols) { w = hw; x = larg / 2 - j - hw / 2; } else x = -larg / 2 + hw + j + (c - 1) * (bw + j) + bw / 2; }
        pecas.push({ x, y: f * (bh + j) + bh / 2, z: 0, w, sx: w / bw }); } }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(bw, bh, bd), mat(0xffffff, { rug: 0.95 }), pecas.length);
    const M = new THREE.Matrix4(), c0 = new THREE.Color(o.cor || COR.bloco), cc = new THREE.Color();
    pecas.forEach((p, i) => { M.makeScale(p.w / bw, 1, 1).setPosition(p.x, p.y, p.z); im.setMatrixAt(i, M); const v = 0.92 + R() * 0.16; im.setColorAt(i, cc.copy(c0).multiplyScalar(v)); });
    // meio-blocos precisam manter a escala em x: guardamos como quaternion neutro + escala no constroi via userData
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    const g = new THREE.Group(); g.add(im); g.userData = { pecas, inst: im, larg, alt: fi * (bh + j), esp: bd }; return g; };
  // textura de azulejo/piso/tijolinho desenhada em canvas
  K.texGrade = (o = {}) => { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
    x.fillStyle = o.rejunte || '#c9cfd6'; x.fillRect(0, 0, n, n); x.fillStyle = o.cor || '#f4f6f8'; const g = o.espRejunte ?? 5; x.fillRect(g / 2, g / 2, n - g, n - g);
    if (o.brilho !== false) { const gr = x.createLinearGradient(0, 0, n, n); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)'); x.fillStyle = gr; x.fillRect(g / 2, g / 2, n - g, n - g); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  // textura manchada (terra, grama, concreto): K.texRuido(cor, larguraEmMetros, profundidadeEmMetros)
  K.texRuido = (cor, w = 4, d = 4, o = {}) => { const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), R = rng(o.seed || 9), base = new THREE.Color(cor);
    x.fillStyle = '#' + base.getHexString(); x.fillRect(0, 0, n, n);
    for (let i = 0; i < 520; i++) { const v = (R() - 0.5) * (o.forca ?? 0.11), cc = base.clone().offsetHSL(0, 0, v); x.fillStyle = '#' + cc.getHexString(); x.globalAlpha = 0.5; const r = 3 + R() * 9, px = R() * n, py = R() * n;
      for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) { x.beginPath(); x.arc(px + ox, py + oy, r, 0, 6.283); x.fill(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(Math.max(1, w / 2.5), Math.max(1, d / 2.5)); t.anisotropy = 8; return t; };
  // superfície revestida (parede ou piso): K.revestido(larg, alt, {tam: 0.3, cor, rejunte})  — plano em XY virado para +Z
  K.revestido = (w, h, o = {}) => { const t = K.texGrade(o), tam = o.tam || 0.3; t.repeat.set(w / tam, h / tam);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: o.rug ?? 0.35, side: THREE.DoubleSide })); m.receiveShadow = true; m.position.y = h / 2;
    const g = new THREE.Group(); g.add(m); return g; };

  // ---------------------------------------------------------------- terreno com corte (mostra o que fica embaixo)
  // K.terreno({x0,x1,z0,z1, prof, topo: cor, camadas:[[cor, espessura], ...], buracos:[{x0,x1,z0,z1,prof,fundo}]})
  // camadas: [[material | cor, espessura], ...] — material = 'areia' | 'terra' | 'terraFofa' | 'argila' | 'rocha' | 'brita' ...
  // topo / fundo de buraco também aceitam material (texto) ou cor
  K.terreno = (o = {}) => { const { x0 = -6, x1 = 6, z0 = -6, z1 = 6, prof = 3 } = o, cam = o.camadas || [['terra', 0.5], ['argila', 1.2], ['rocha', 5]], bur = o.buracos || [];
    const tex = K.texCorte(cam, prof), LG = tex.userData.larg, lado = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), fundoM = mat(COR.terraEsc, { rug: 1 });
    const sup = (v, w, d) => { if (typeof v === 'string') { const t = K.texMat(v).clone(); t.needsUpdate = true; t.repeat.set(w / K.MAT[v].tam, d / K.MAT[v].tam); return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); }
      return new THREE.MeshStandardMaterial({ map: K.texRuido(v, w, d), roughness: 1 }); };
    const xs = [...new Set([x0, x1, ...bur.flatMap(b => [b.x0, b.x1])])].sort((a, b) => a - b), zs = [...new Set([z0, z1, ...bur.flatMap(b => [b.z0, b.z1])])].sort((a, b) => a - b);
    const g = new THREE.Group();
    for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < zs.length - 1; k++) {
      const mx = (xs[i] + xs[i + 1]) / 2, mz = (zs[k] + zs[k + 1]) / 2, b = bur.find(q => mx > q.x0 && mx < q.x1 && mz > q.z0 && mz < q.z1), pb = b ? Math.min(b.prof, prof - 0.01) : 0;
      const cw = xs[i + 1] - xs[i], cd = zs[k + 1] - zs[k], hh = prof - pb, geo = new THREE.BoxGeometry(cw, hh, cd), uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let v = 0; v < uv.count; v++) if (v < 8 || v > 15) uv.setXY(v, (v < 8 ? pos.getZ(v) + mz : pos.getX(v) + mx) / LG, 1 - ((hh / 2 - pos.getY(v)) + pb) / prof);   // laterais: camadas em escala real
      const topoM = sup(b ? (b.fundo ?? cam[Math.min(cam.length - 1, 1)][0]) : (o.topo ?? cam[0][0]), cw, cd);
      const m = new THREE.Mesh(geo, [lado, lado, topoM, fundoM, lado, lado]); m.position.set(mx, -pb - hh / 2, mz); m.receiveShadow = true; m.castShadow = false; g.add(m); }
    // a grama do mundo ganha um recorte no lugar do terreno (senão ela tamparia valas e buracos)
    if (E.grama && o.recortaGrama !== false) { (E._furos = E._furos || []).push([x0, x1, z0, z1]);
      const s = new THREE.Shape(); s.absarc(0, 0, 900, 0, Math.PI * 2, false);
      for (const [a0, a1, b0, b1] of E._furos) { const h = new THREE.Path(); h.moveTo(a0, -b0); h.lineTo(a1, -b0); h.lineTo(a1, -b1); h.lineTo(a0, -b1); h.closePath(); s.holes.push(h); }
      E.grama.geometry.dispose(); E.grama.geometry = new THREE.ShapeGeometry(s, 48); }
    g.userData.terreno = true; g.userData.tipo = 'terreno'; E.scene.add(g); E.registrar(g, 'terreno'); return g; };

  // ---------------------------------------------------------------- natureza
  K.pinheiro = (alt = 4, o = {}) => { const g = new THREE.Group(), R = rng(o.seed || 1), M = mat(o.cor || 0x2f8f3a, { facetado: true });
    g.add(K.cilindro(alt * 0.045, alt * 0.25, COR.madeiraEsc, { seg: 7 }));
    for (let i = 0; i < 4; i++) { const r = alt * (0.24 - i * 0.045), h = alt * 0.3, c = sh(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), M)); c.position.y = alt * (0.3 + i * 0.17) + h / 2 - alt * 0.08; c.rotation.y = R() * 3; g.add(c); }
    return g; };
  K.arvore = (alt = 3.5, o = {}) => { const g = new THREE.Group(), R = rng(o.seed || 2), M = mat(o.cor || 0x4fae45, { facetado: true });
    g.add(K.cilindro(alt * 0.05, alt * 0.5, COR.madeiraEsc, { seg: 7, rTopo: alt * 0.035 }));
    for (let i = 0; i < 4; i++) { const r = alt * (0.2 + R() * 0.08), c = sh(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M)); c.position.set((R() - 0.5) * alt * 0.3, alt * (0.55 + R() * 0.25), (R() - 0.5) * alt * 0.3); c.rotation.set(R() * 3, R() * 3, 0); g.add(c); }
    return g; };
  K.nuvem = (tam = 6, o = {}) => { const g = new THREE.Group(), R = rng(o.seed || 3), M = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(tam * (0.25 + R() * 0.2), 10, 8), M); s.position.set((i - 2) * tam * 0.3, R() * tam * 0.1, (R() - 0.5) * tam * 0.3); s.scale.y = 0.6; g.add(s); }
    return g; };
  K.casinha = (o = {}) => { const g = new THREE.Group(), w = o.w || 6, d = o.d || 5, h = o.h || 2.8;
    g.add(K.caixa(w, h, d, o.cor || 0xf3ead2));
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.001, Math.hypot(w, d) * 0.62, h * 0.6, 4), mat(o.telhado || 0xc8492f, { facetado: true })); t.rotation.y = Math.PI / 4; t.position.y = h + h * 0.3; t.scale.set(1, 1, d / w); t.castShadow = true; g.add(t);
    const p = K.caixa(0.9, 2, 0.06, 0x8a5a33); p.position.set(-w * 0.2, 0, d / 2 + 0.01); g.add(p);
    const j = K.caixa(1.1, 0.9, 0.06, 0x8fd3ff); j.position.set(w * 0.22, 1.1, d / 2 + 0.01); g.add(j); return g; };

  // ---------------------------------------------------------------- mundos prontos
  // AO AR LIVRE: céu azul, sol, nuvens, grama, árvores e morros ao fundo
  K.mundoCampo = (o = {}) => { const sc = E.scene, R = rng(o.seed || 21), livre = o.livre ?? 9;
    const sg = new THREE.SphereGeometry(1500, 32, 16), col = [], top = new THREE.Color(o.ceuTopo || 0x2b7fe0), bot = new THREE.Color(o.ceuBase || 0xcdeaff), cc = new THREE.Color();
    for (let i = 0; i < sg.attributes.position.count; i++) { const h = Math.min(1, Math.max(0, sg.attributes.position.getY(i) / 1500 * 1.6 + 0.02)); cc.copy(bot).lerp(top, Math.pow(h, 0.6)); col.push(cc.r, cc.g, cc.b); }
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    { const ceu = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); ceu.userData.ceu = true; sc.add(ceu); }
    sc.fog = new THREE.Fog(0xcdeaff, o.nevoa?.[0] ?? 70, o.nevoa?.[1] ?? 420);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x9ad07a, 1.25));
    const sol = E.sol = new THREE.DirectionalLight(0xfff3dc, 2.3); E.solDir = new THREE.Vector3(...(o.sol || [7, 13, 6]));
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); const s = o.sombra || 12; Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 }); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
    sc.add(sol, sol.target);
    if (o.grama !== false) { const gr = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ map: K.texRuido(o.corGrama || COR.grama, 1800, 1800, { forca: 0.07, seed: 4 }), roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.y = o.nivelGrama ?? -0.01; gr.receiveShadow = true; sc.add(gr); E.grama = gr; }
    const nuv = []; for (let i = 0; i < (o.nuvens ?? 14); i++) { const n = K.nuvem(14 + R() * 16, { seed: 30 + i }); n.position.set((R() - 0.5) * 700, 70 + R() * 60, -120 - R() * 380 + (i % 3 === 0 ? 420 : 0)); sc.add(n); nuv.push([n, n.position.x, 1.5 + R() * 2]); }
    E.track(t => nuv.forEach(([n, x0, v]) => { n.position.x = x0 + t * v; }), 1);
    for (let i = 0; i < (o.arvores ?? 46); i++) { const a = R() * 6.283, d = livre + 3 + R() * R() * 110, tr = (R() < 0.45 ? K.pinheiro : K.arvore)(3 + R() * 4, { seed: 100 + i });
      tr.position.set(Math.cos(a) * d + (o.centro?.[0] || 0), 0, Math.sin(a) * d + (o.centro?.[1] || 0)); tr.rotation.y = R() * 6; sc.add(tr); }
    for (let i = 0; i < (o.morros ?? 9); i++) { const a = R() * 6.283, d = 170 + R() * 160, m = new THREE.Mesh(new THREE.SphereGeometry(50 + R() * 50, 16, 10), mat(0x4aa64a, { rug: 1 })); m.scale.y = 0.22 + R() * 0.15; m.position.set(Math.cos(a) * d, -4, Math.sin(a) * d); sc.add(m); }
    for (let i = 0; i < (o.tufos ?? 60); i++) { const a = R() * 6.283, d = livre * 0.6 + R() * 40, tf = sh(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3 + R() * 0.25, 4), mat(0x7fd35a)), { sombra: false }); tf.position.set(Math.cos(a) * d, 0.12, Math.sin(a) * d); sc.add(tf); }
  };
  // AMBIENTE INTERNO: piso + paredes revestidas, luz clara. o = {w, d, h, piso:{...}, parede:{...}, abertas:['frente','direita',...]}
  K.mundoInterno = (o = {}) => { const sc = E.scene, w = o.w || 3, d = o.d || 3, h = o.h || 2.7, ab = o.abertas || ['frente'];
    sc.background = new THREE.Color(o.fundo || 0xe9f1f8);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xcfd8e3, 1.5));
    const sol = E.sol = new THREE.DirectionalLight(0xffffff, 1.6); E.solDir = new THREE.Vector3(...(o.sol || [2.5, 5, 4]));
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); const s = o.sombra || 3.5; Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.2, far: 25 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02; sol.shadow.radius = 5;
    sc.add(sol, sol.target);
    const sala = new THREE.Group(), piso = K.revestido(w, d, { cor: '#dfe6ee', rejunte: '#b9c3cf', tam: 0.45, ...(o.piso || {}) }); piso.children[0].position.y = 0; piso.rotation.x = -Math.PI / 2; sala.add(piso);
    const par = (larg, x, z, ry) => { const p = K.revestido(larg, h, { cor: '#f6f8fa', rejunte: '#cfd6dd', tam: 0.3, ...(o.parede || {}) }); p.position.set(x, 0, z); p.rotation.y = ry; sala.add(p); return p; };
    sala.userData.paredes = {};
    if (!ab.includes('fundo')) sala.userData.paredes.fundo = par(w, 0, -d / 2, 0);
    if (!ab.includes('esquerda')) sala.userData.paredes.esquerda = par(d, -w / 2, 0, Math.PI / 2);
    if (!ab.includes('direita')) sala.userData.paredes.direita = par(d, w / 2, 0, -Math.PI / 2);
    if (!ab.includes('frente')) sala.userData.paredes.frente = par(w, 0, d / 2, Math.PI);
    sc.add(sala); return sala; };
  instalarKit2(E, K, { mat, sh }); instalarKit3(E, K, { sh }); K.MAT = MAT;
  // cada peça sabe o próprio tipo (aparece nos relatórios da inspeção); água, mangueiras e cenário não contam como sólidos
  const SEM = new Set(['agua', 'tubo', 'nuvem', 'pinheiro', 'arvore', 'casinha', 'revestido', 'casa', 'rua', 'predioFundo']);
  for (const k of ['caixa', 'cilindro', 'esfera', 'cone', 'anel', 'tubo', 'cano', 'parafuso', 'agua', 'vergalhoes', 'blocos', 'revestido', 'pinheiro', 'arvore', 'nuvem', 'casinha', 'parede', 'oitao', 'telhado', 'madeiramento', 'janela', 'porta', 'casa', 'rua', 'predioFundo', 'bloco']) {
    const f = K[k]; K[k] = (...a) => { const o = f(...a); o.userData.tipo = k; if (SEM.has(k)) o.userData.semColisao = true; return o; }; }
  return K;
}
