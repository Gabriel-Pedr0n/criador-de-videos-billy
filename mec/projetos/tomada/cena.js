// VOCÊ INSTALA UMA TOMADA — cena completa (5 blocos)
// Casa em corte (frente aberta, câmera em +Z). Cozinha x -4..0, banheiro x 0..4, fundo z = -3.
// Rua em z = 9.4, calçada z 5.0..6.4, poste em (-6.3, 5.6). Muro da frente em z = 4.6 com o padrão de entrada.
export default async function (E, K) {
  const T = E.THREE, C = K.COR, PI = Math.PI, V = p => new T.Vector3(...p);
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
  const janela = (t, a, b, fi = 0.2, fo = 0.25) => cl((t - a) / fi) * cl((b - t) / fo);

  // ================================================================= AJUDANTES
  // fio (tubo) por uma poligonal com cantos arredondados; cresce do começo ao fim se o.cresce = [de, ate]
  const arred = (pts, r = 0.05) => { if (pts.length < 3) return pts.map(V); const out = [V(pts[0])];
    for (let i = 1; i < pts.length - 1; i++) { const a = V(pts[i - 1]), b = V(pts[i]), c = V(pts[i + 1]), ra = Math.min(r, a.distanceTo(b) / 2.2, b.distanceTo(c) / 2.2);
      const p1 = b.clone().add(a.clone().sub(b).setLength(ra)), p2 = b.clone().add(c.clone().sub(b).setLength(ra));
      for (let k = 0; k <= 4; k++) { const u = k / 4, q1 = p1.clone().lerp(b, u), q2 = b.clone().lerp(p2, u); out.push(q1.lerp(q2, u)); } }
    out.push(V(pts[pts.length - 1])); return out; };
  const curvaDe = (pts, o = {}) => o.suave ? new T.CatmullRomCurve3(pts.map(V), false, 'centripetal') : (() => { const P = arred(pts, o.raioCanto ?? 0.05), cp = new T.CurvePath();
    for (let i = 0; i < P.length - 1; i++) if (P[i].distanceTo(P[i + 1]) > 1e-5) cp.add(new T.LineCurve3(P[i], P[i + 1])); return cp; })();
  const FIOS = [];
  const fio = (pts, r, cor, o = {}) => { const cv = curvaDe(pts, o), L = cv.getLength(), seg = Math.max(8, Math.ceil(L * (o.dens ?? 40))), rad = o.rad ?? 8;
    const geo = new T.TubeGeometry(cv, seg, r, rad, false), mt = new T.MeshStandardMaterial({ color: cor, roughness: o.rug ?? 0.45, metalness: o.metal ?? 0, map: o.map || null });
    const me = new T.Mesh(geo, mt); me.castShadow = o.sombra !== false; me.userData.semColisao = true; E.scene.add(me);
    me.userData = { ...me.userData, curva: cv, L, raio: r, k: 1, base: new T.Color(cor), calor: [] }; if (o.nome) me.name = o.nome;
    if (o.cresce) { const a = E.t(o.cresce[0]), b = E.t(o.cresce[1]); E.cada(t => { const k = cl((t - a) / Math.max(0.01, b - a)); geo.setDrawRange(0, Math.floor(k * seg) * rad * 6); me.userData.k = k; me.visible = k > 0.001 && (!me.userData.ate || t < me.userData.ate); }); }
    else if (o.de != null) { const a = E.t(o.de); E.cada(t => { me.visible = t >= a && (!me.userData.ate || t < me.userData.ate); }); }
    FIOS.push(me); return me; };
  const someFio = (me, quando) => { me.userData.ate = E.t(quando); if (!me.userData.cresceu) E.cada(t => { if (t >= me.userData.ate) me.visible = false; }); };
  // fio que muda de cor: esquentando (vermelho que brilha) ou aceso (pulsando). Várias janelas por fio.
  const pinta = (me, de, ate, cor, o = {}) => { const a = E.t(de), b = E.t(ate); me.userData.calor.push([a, b, o.forca ?? 1, o.sobe ?? 0.25, new T.Color(cor), o.pulso ?? 0, o.brilho ?? 0.9]);
    if (me.userData.calor.length === 1) { const mt = me.material; mt.emissive = new T.Color(0);
      E.cada(t => { mt.color.copy(me.userData.base); mt.emissive.setRGB(0, 0, 0);
        for (const [a0, b0, f, s, c, p, br] of me.userData.calor) { const k = f * cl((t - a0) / s) * cl((b0 - t) / 0.35) * (p ? 0.6 + 0.4 * Math.sin((t - a0) * p) : 1); if (k <= 0) continue;
          mt.color.lerp(c, k); mt.emissive.setRGB(c.r * br * k, c.g * br * k, c.b * br * k); } }); } };
  const aquece = (me, de, ate, o = {}) => pinta(me, de, ate, 0xff3a14, { sobe: 0.6, ...o });
  const acende = (me, de, ate) => pinta(me, de, ate, 0xffd23f, { pulso: 10, sobe: 0.12, brilho: 0.7 });
  // corrente: bolinhas andando ao longo de um fio. ativo(t) 0..1 controla quantas aparecem; vel em m/s
  const corrente = (me, de, ate, o = {}) => { const cv = me.userData.curva, L = me.userData.L, vel = o.vel ?? 0.9, ida = o.volta ? -1 : 1;
    return E.particulas({ n: o.n ?? Math.ceil(L * 6), raio: o.raio ?? 0.014, cor: o.cor ?? 0xffe14a, de, ate, fin: 0.25, fout: 0.25, seed: o.seed,
      pos: (i, tau, s, amb) => { const at = o.ativo ? o.ativo(E.t(de) + tau) : 1; if (s[3] > at) return null; let u = ((tau * vel * (o.acel ? 1 + tau * o.acel : 1)) / L + s[0]) % 1; if (ida < 0) u = 1 - u;
        if (o.cresce) { const fr = cl((tau) / o.cresce); if (u > fr) return null; } const p = cv.getPointAt(u); return [p.x, p.y, p.z, amb * (o.esc ?? 1)]; } }); };
  // fogo, fumaça e faíscas
  const fogo = (base, de, ate, o = {}) => { const b = V(base), w = o.larg ?? [0.3, 0.05], h = o.alt ?? 0.5;
    E.particulas({ n: o.n ?? 60, raio: o.raio ?? 0.035, de, ate, fin: 0.3, fout: 0.4, seed: o.seed ?? 31, cores: [0xffd23f, 0xff8a1c, 0xff4a1c, 0xffb02e], pos: (i, tau, s, amb) => { const k = (tau * (1.4 + s[3]) + s[1]) % 1;
      return [b.x + (s[0] - 0.5) * w[0] * (1 - k * 0.6) + Math.sin(tau * 9 + i) * 0.015, b.y + k * h * (0.6 + s[2] * 0.6), b.z + (s[2] - 0.5) * w[1], amb * (1.25 - k) * (o.esc ?? 1)]; } });
    if (o.fumaca !== false) E.particulas({ n: 26, raio: 0.06, cor: 0x6b6b6b, op: 0.5, de, ate: E.t(ate) + 0.6, fin: 0.5, fout: 0.6, seed: (o.seed ?? 31) + 1, pos: (i, tau, s, amb) => { const k = (tau * 0.45 + s[1]) % 1;
      return [b.x + (s[0] - 0.5) * w[0] + k * 0.15, b.y + h * 0.7 + k * (o.fumacaAlt ?? 1.1), b.z + (s[2] - 0.5) * w[1] + (o.fumacaZ ?? 0.1) * k, amb * (0.6 + k * 1.4)]; } });
    E.som('fogo', de, 0.8, E.t(ate) - E.t(de)); };
  const faiscas = (ponto, de, o = {}) => { const p = V(ponto), t0 = E.t(de), dur = o.dur ?? 0.5, n = o.n ?? 24, dir = V(o.dir || [0, 0, 1]);
    E.particulas({ n, raio: o.raio ?? 0.012, de: t0, ate: t0 + dur, fin: 0.02, fout: 0.15, seed: o.seed ?? Math.floor(t0 * 100), cores: [0xffffff, 0xfff27a, 0xffd23f, 0x9fe8ff], pos: (i, tau, s, amb) => {
      const a = s[0] * 6.283, sp = (o.vel ?? 1.6) * (0.4 + s[1]), vx = Math.cos(a) * sp + dir.x * sp, vy = Math.sin(a) * sp * 0.8 + dir.y * sp + 0.6, vz = (s[2] - 0.5) * sp + dir.z * sp, tt = tau * (0.7 + s[3] * 0.6);
      return [p.x + vx * tt, p.y + vy * tt - 4.9 * tt * tt, p.z + vz * tt, amb * (1 - tau / dur)]; } });
    if (o.som !== false) E.som('faisca', t0, o.ganho ?? 1); };
  // raio amarelo em zigue-zague entre dois pontos (choque)
  const raio = (a, b, de, ate, o = {}) => { const A = V(a), B = V(b), N = 9, g = new T.Group(), mt = new T.MeshBasicMaterial({ color: o.cor ?? 0xfff27a, toneMapped: false }); E.scene.add(g);
    const segs = []; for (let i = 0; i < N; i++) { const m = new T.Mesh(new T.CylinderGeometry(o.esp ?? 0.008, o.esp ?? 0.008, 1, 5), mt); g.add(m); segs.push(m); }
    const t0 = E.t(de), t1 = E.t(ate), dir = B.clone().sub(A), lado = new T.Vector3().crossVectors(dir, new T.Vector3(0, 1, 0.3)).normalize(), up = new T.Vector3().crossVectors(lado, dir).normalize();
    E.cada(t => { g.visible = t >= t0 && t < t1 && (Math.floor(t * 30) % 3 !== 2); if (!g.visible) return; const sd = Math.floor(t * 15); let prev = A.clone();
      for (let i = 0; i < N; i++) { const u = (i + 1) / N, r1 = Math.sin(sd * 12.9 + i * 78.2) * 43758.5, r2 = Math.sin(sd * 39.3 + i * 11.1) * 23421.6, j = i === N - 1 ? 0 : (o.amp ?? 0.05);
        const q = A.clone().addScaledVector(dir, u).addScaledVector(lado, (r1 - Math.floor(r1) - 0.5) * 2 * j).addScaledVector(up, (r2 - Math.floor(r2) - 0.5) * 2 * j);
        const m = segs[i], d = q.clone().sub(prev); m.position.copy(prev).addScaledVector(d, 0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); prev = q; } });
    if (o.som !== false) E.som('faisca', t0, 0.8); };
  // visor: plano com textura desenhada em canvas, redesenhado quando o valor muda. pinta(ctx, W, H, valor)
  const visor = (w, h, valor, pinta, o = {}) => { const c = document.createElement('canvas'); c.width = o.px ?? 256; c.height = Math.round(c.width * h / w); const x = c.getContext('2d'), tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    const me = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, transparent: !!o.transp, toneMapped: false })); me.userData.semColisao = true; let ult = null;
    E.cada(t => { const v = valor(t); if (v !== ult) { ult = v; x.clearRect(0, 0, c.width, c.height); pinta(x, c.width, c.height, v); tx.needsUpdate = true; } }); return me; };
  const FONTE = 'Poppins, Arial';
  // halo de luz (lâmpada acesa)
  const haloTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.25, 'rgba(255,220,140,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const halo = (pos, tam, nivel) => { const s = new T.Sprite(new T.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); s.position.copy(V(pos)); s.scale.setScalar(tam); s.userData.semColisao = true; E.scene.add(s);
    E.cada(t => { const k = nivel(t); s.visible = k > 0.02; s.material.opacity = k; }); return s; };

  // ================================================================= ENERGIA NA CASA (luz muda com o roteiro)
  // 0 = sem energia; 1 = acesa. Padrão chega em "1:mede"; chave geral desliga em "1:desliga" e religa em "1:Esse"; DR desliga em "4:desliga", religa em "4:DR".
  const T_LIGA = E.t("1:mede"), T_G0 = E.t(["1:desliga", 0.25]), T_G1 = E.t(["1:Esse", -0.2]), T_DR0 = E.t(["4:desliga", 0.2]), T_DR1 = E.t(["4:DR", 0.2]);
  const energia = t => { if (t < T_LIGA) return 0; if (t >= T_G0 && t < T_G1) return 0; if (t >= T_DR0 && t < T_DR1) return 0; return 1; };
  const luz = t => { const on = energia(t); const tl = [T_LIGA, T_G0, T_G1, T_DR0, T_DR1].filter(x => x <= t).pop(); if (tl == null) return 0; const k = cl((t - tl) / 0.12);
    const flick = tl === T_LIGA || tl === T_G1 || tl === T_DR1 ? (Math.sin((t - tl) * 70) > -0.2 || t - tl > 0.3 ? 1 : 0.2) : 1; return (on ? k : 1 - k) * flick; };

  // ================================================================= MUNDO
  K.mundoBairro({ lote: { x0: -6, x1: 6, z0: -5, z1: 4 }, muro: false, sombra: 13 });
  const ZB = -3.0, H = 2.6;                                                   // face interna da parede do fundo; pé-direito
  const corParede = 0xf4ead8, corExt = 0xe9d8bb;
  const piso = K.revestido(4.0, 4.0, { cor: '#e8dcc8', rejunte: '#c9b99f', tam: 0.5 }); piso.children[0].position.y = 0; piso.rotation.x = -PI / 2; piso.position.set(-2.0, 0.006, -1.0); E.scene.add(piso);
  { const pb = K.revestido(4.0, 4.0, { cor: '#dfe9ef', rejunte: '#b8c6cf', tam: 0.3 }); pb.children[0].position.y = 0; pb.rotation.x = -PI / 2; pb.position.set(2.0, 0.008, -1.0); E.scene.add(pb); }   // piso do banheiro (azulejo)
  const contra = K.em(K.caixa(8.3, 0.08, 4.1, 0xb9ab95), 0, -0.082, -1.0, "contrapiso"); E.fixo(contra);
  // parede do fundo: tijolo por dentro + reboco por cima (o reboco fica transparente no raio-X)
  const tijolo = K.em(K.parede(8.0, H, 0.12, { tipo: 'tijolo' }), 0, 0, ZB - 0.085, "parede de tijolo do fundo");
  const reboco = K.em(K.caixa(8.0, H, 0.025, corParede, { rug: 0.95 }), 0, 0, ZB - 0.0125, "reboco do fundo"); E.permite(reboco, tijolo);
  const azul = K.em(K.revestido(4.0, 1.6, { cor: '#eaf3f7', rejunte: '#c2d0d8', tam: 0.25 }), 0, 0, ZB + 0.001); azul.position.x = 2.0;     // azulejo do banheiro (até 1,6 m)
  const parE = K.em(K.parede(4.25, H, 0.14, { tipo: 'reboco', cor: corParede }), -4.07, 0, -0.9, "parede esquerda"); parE.rotation.y = PI / 2;
  const parD = K.em(K.parede(4.25, H, 0.14, { tipo: 'reboco', cor: corParede }), 4.07, 0, -0.9, "parede direita"); parD.rotation.y = PI / 2;
  const divi = K.em(K.parede(2.0, H, 0.12, { tipo: 'reboco', cor: 0xe8f1f5 }), 0, 0, -2.0, "parede do banheiro"); divi.rotation.y = PI / 2;
  E.permite([tijolo, reboco], [parE, parD, divi, contra]); E.permite([parE, parD, divi], contra); E.permite(contra, tijolo);
  // acabamento por fora (cinta no topo) e calçadinha
  for (const [w, d, x, z] of [[8.3, 0.2, 0, ZB - 0.07], [0.2, 4.2, -4.07, -0.95], [0.2, 4.2, 4.07, -0.95]]) { const c = K.caixa(w, 0.1, d, corExt); c.userData.semColisao = true; K.em(c, x, H, z); }
  // muro da frente com portão (o padrão fica do lado da rua)
  const MZ = 4.2, muroE = K.em(K.parede(2.8, 1.5, 0.16, { tipo: 'reboco', cor: 0xe4dccb }), -5.8, 0, MZ, "muro da frente");
  const muroD = K.em(K.parede(4.0, 1.5, 0.16, { tipo: 'reboco', cor: 0xe4dccb }), 5.0, 0, MZ, "muro da frente direito"); E.fixo(muroE, muroD);
  // poste e rede da rua
  const PX = -6.3, PZ = 5.65, PY = 7.0;
  const postes = [-36.3, PX, 23.7].map((x, i) => { const g = new T.Group(); g.add(K.cilindro(0.13, 7.6, 0xb7b4ad, { rTopo: 0.085, rug: 0.9 }));
    const cruz = K.caixa(0.12, 0.12, 1.7, 0x8a6a45); cruz.position.y = PY - 0.06; g.add(cruz);
    for (const z of [-0.65, 0, 0.65]) { const is = K.cilindro(0.035, 0.12, 0xe8e8e0, { rug: 0.3 }); is.position.set(0, PY + 0.06, z); g.add(is); }
    const tr = K.cilindro(0.32, 0.8, 0x7d858c, { metal: 0.3, rug: 0.5 }); tr.position.set(0.32, 5.4, 0); if (i === 1) g.add(tr);
    K.em(g, x, 0, PZ, "poste " + (i + 1)); g.userData.semColisao = i !== 1; return g; });
  E.fixo(postes[1]);
  const rede = [-0.65, 0, 0.65].map(dz => { const P = []; for (let x = -60; x <= 60; x += 2) { const xs = [-36.3, PX, 23.7], k = xs.findIndex(q => q > x); const a = k <= 0 ? -66.3 : xs[k - 1], b = k < 0 ? 53.7 : xs[k];
    const u = (x - a) / (b - a); P.push([x, PY + 0.12 - 0.5 * 4 * u * (1 - u), PZ + dz]); } return fio(P, 0.012, 0x22252a, { suave: true, dens: 6, rad: 5, sombra: false }); });

  // ================================================================= OBJETOS DA CASA
  // tomada da cozinha (3 furos) — a estrela do vídeo; desenhada maior que a real para ler na tela
  const TX = -2.0, TY = 1.0, TZ = ZB + 0.012;
  const tomada = (() => { const g = new T.Group(), b = K.caixa(0.1, 0.15, 0.022, 0xf7f7f2, { rug: 0.4 }); b.position.y = -0.075; g.add(b);
    const rec = K.cilindro(0.034, 0.006, 0xd9d9d2, { seg: 6 }); rec.rotation.x = PI / 2; rec.position.set(0, 0.0, 0.012); g.add(rec);
    for (const [x, y] of [[-0.016, -0.01], [0.016, -0.01], [0, 0.017]]) { const f = K.cilindro(0.0055, 0.008, 0x1d1d1d, { seg: 10 }); f.rotation.x = PI / 2; f.position.set(x, y, 0.014); g.add(f); }
    return K.em(g, TX, TY, TZ, "tomada da cozinha"); })();
  const malha = o => { let r = null; o.traverse(x => { if (!r && x.isMesh) r = x; }); return r; };
  const furoTerra = tomada.children[tomada.children.length - 1], furoTerraM = malha(furoTerra);
  E.permite(tomada, [reboco, tijolo]); E.fixo(tomada);
  // fio fino que sai da tomada por dentro da parede (aparece no raio-X)
  const fioFino = fio([[TX, TY, ZB - 0.008], [TX, 2.35, ZB - 0.008], [TX - 0.9, 2.35, ZB - 0.008]], 0.006, 0x2f6fe0, { rad: 6 });
  // lâmpadas
  const lampada = (x, z, y) => { const g = new T.Group(), soq = K.cilindro(0.035, 0.07, 0xf2f2f2); soq.position.y = 0.08; g.add(soq);
    const bulbo = new T.Mesh(new T.SphereGeometry(0.06, 16, 12), new T.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.3, emissive: 0xffe6a8, emissiveIntensity: 0 })); bulbo.position.y = 0.03; g.add(bulbo);
    g.userData.semColisao = true; K.em(g, x, y, z); const pl = new T.PointLight(0xffe2b0, 0, 5.5, 1.6); pl.position.set(x, y - 0.05, z); E.scene.add(pl);
    E.cada(t => { const k = luz(t); bulbo.material.emissiveIntensity = 2.2 * k; bulbo.material.color.setHex(k > 0.3 ? 0xfff4d6 : 0xdfe3e6); pl.intensity = 1.6 * k; });
    halo([x, y + 0.03, z], 0.5, luz); return g; };
  const L1 = lampada(-2.0, ZB + 0.25, 2.25), L2 = lampada(2.0, ZB + 0.25, 2.25);
  for (const x of [-2.0, 2.0]) { const b = K.caixa(0.04, 0.04, 0.25, 0xf2f2f2); b.userData.semColisao = true; K.em(b, x, 2.31, ZB + 0.125); }
  // geladeira
  const gel = (() => { const g = new T.Group(); g.add(K.caixa(0.7, 1.62, 0.62, 0xf1f3f4, { rug: 0.35, metal: 0.05 }));
    const l = K.caixa(0.69, 0.012, 0.005, 0xb9bec2); l.position.set(0, 1.12, 0.312); g.add(l);
    for (const [y, h] of [[1.2, 0.3], [0.45, 0.5]]) { const p = K.caixa(0.025, h, 0.03, 0xaab0b5, { metal: 0.4, rug: 0.3 }); p.position.set(-0.27, y, 0.33); g.add(p); }
    return K.em(g, -0.65, 0, ZB + 0.33, "geladeira"); })();
  // fogão
  const fog = (() => { const g = new T.Group(); g.add(K.caixa(0.62, 0.86, 0.58, 0xf4f4f4, { rug: 0.4 }));
    const vid = K.caixa(0.44, 0.3, 0.01, 0x1c1f24, { rug: 0.2 }); vid.position.set(0, 0.32, 0.291); g.add(vid);
    for (const [x, z] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]]) { const q = K.cilindro(0.07, 0.015, 0x2a2a2a); q.position.set(x, 0.86, z); g.add(q); }
    const tras = K.caixa(0.62, 0.12, 0.05, 0xe6e6e6); tras.position.set(0, 0.86, -0.265); g.add(tras); return K.em(g, -3.1, 0, ZB + 0.3, "fogão"); })();
  const janelaForno = malha(fog.children[1]);
  // pia e armário entre fogão e tomada
  const pia = K.em(K.caixa(0.62, 0.86, 0.58, 0xc98b55, { rug: 0.7 }), -2.48, 0, ZB + 0.3, "armário da pia");
  { const tp = K.caixa(0.66, 0.035, 0.6, 0x3a3d42, { rug: 0.3 }); tp.position.y = 0.86; pia.add(tp); }
  // banheiro: vaso, pia e chuveiro elétrico
  const vaso = K.em(K.grupo(K.cilindro(0.17, 0.4, 0xf8f8f8, { rTopo: 0.2 }), (() => { const c = K.caixa(0.38, 0.32, 0.16, 0xf8f8f8); c.position.set(0, 0.4, -0.16); return c; })()), 3.3, 0, ZB + 0.38, "vaso");
  const piaB = K.em(K.grupo((() => { const c = K.cilindro(0.06, 0.75, 0xf8f8f8); return c; })(), (() => { const c = K.caixa(0.46, 0.14, 0.36, 0xf8f8f8); c.position.y = 0.75; return c; })()), 0.75, 0, ZB + 0.24, "pia do banheiro");
  const chuv = (() => { const g = new T.Group(), cano = K.cilindro(0.016, 0.3, 0xcfd3d6, { metal: 0.6 }); cano.rotation.x = PI / 2; cano.position.set(0, 0, 0.15); g.add(cano);
    const corpo = K.cilindro(0.11, 0.07, 0xffffff, { rug: 0.3 }); corpo.position.set(0, -0.07, 0.3); g.add(corpo); const crivo = K.cilindro(0.1, 0.01, 0xd8dde0); crivo.position.set(0, -0.08, 0.3); g.add(crivo);
    return K.em(g, 2.35, 2.05, ZB, "chuveiro elétrico"); })();
  E.permite(chuv, [reboco, azul]); E.fixo(chuv, L1, L2);
  const boxV = K.caixa(0.012, 1.9, 1.0, 0xbfe3f2, { op: 0.28, rug: 0.1 }); boxV.userData.semColisao = true; K.em(boxV, 1.75, 0, ZB + 0.5, "box");
  // quadro de distribuição na parede esquerda (a frente vira para +X). Coordenadas locais: x local -> -Z do mundo
  const QX = -4.0 + 0.0, QY = 1.25, QZ = -0.45;
  const quadro = (() => { const g = new T.Group(), cx = K.caixa(0.62, 0.62, 0.1, 0xeeeeea, { rug: 0.5 }); g.add(cx);
    const fundo = K.caixa(0.54, 0.54, 0.01, 0x3d4247); fundo.position.set(0, 0.04, 0.051); g.add(fundo);
    const trilho = K.caixa(0.5, 0.03, 0.012, 0xaab0b5, { metal: 0.5 }); trilho.position.set(0, 0.3, 0.058); g.add(trilho);
    K.em(g, QX + 0.0, QY, QZ, "quadro de luz"); g.rotation.y = PI / 2; g.position.x = -3.93; return g; })();
  E.permite(quadro, parE); E.fixo(quadro);
  // ponto do quadro em coordenadas do mundo (u = deslocamento ao longo da frente, v = altura, w = saída da frente)
  const QP = (u, v, w = 0.065) => [-3.93 + w, QY + v, QZ - u];

  // ================================================================= PERSONAGEM
  const m = E.mascote({ pos: [-1.45, 0, -2.55], rotY: -PI / 2 + 0.35 });
  const KM = [];

  // ================================================================= BLOCO 1 — gancho: fio da rua direto na tomada
  // o cabo grosso vem do poste, passa por cima do muro, entra pela frente aberta e chega na mão do personagem
  const plugue = K.em(K.grupo(K.caixa(0.06, 0.09, 0.05, 0x1d1f22, { rug: 0.4 })), TX + 0.02, TY - 0.055, TZ + 0.12, "plugue do cabo da rua");
  E.permite(plugue, [tomada, m]); E.permite(m, plugue);
  const caboRua = fio([[PX, PY + 0.1, PZ + 0.65], [PX + 0.6, 5.6, PZ + 0.3], [-4.8, 2.4, MZ + 0.3], [-3.2, 2.25, 2.2], [-2.6, 2.3, 0.3], [-2.45, 1.95, -1.8], [-2.2, 1.3, -2.6], [TX + 0.02, TY - 0.01, TZ + 0.16]], 0.018, 0x15171a, { suave: true, dens: 14, rad: 7, nome: 'cabo da rua' });
  E.move(plugue, 0.0, { por: [0, 0, -0.07], dur: E.t("1:tomada") - 0.05, linear: true, inspeciona: false });
  KM.push([0, 'press', 0.2], ["1:tomada", 'reach', 0.15], ["1:energia", 'shrug', 0.3], ["1:curto", 'worried', 0.12], ["1:fogo", 'scaredLook', 0.3], ["1:Porque", 'worried', 0.3]);
  faiscas([TX, TY - 0.04, TZ + 0.1], "1:tomada", { n: 30, dir: [0.3, 0.2, 0.8] });
  // não vai ter energia: a lâmpada pisca e não acende
  E.nota("NADA DE ENERGIA", [-2.0, 2.0, ZB + 0.3], "1:não", "1:Vai#2");
  // curto: estouro de faíscas e o fio dentro da parede pega fogo (raio-X no reboco)
  faiscas([TX, TY - 0.03, TZ + 0.1], "1:curto", { n: 60, vel: 2.4, dir: [0.2, 0.3, 0.9], dur: 0.8, ganho: 1.4 });
  faiscas([TX, TY - 0.03, TZ + 0.1], ["1:curto", 0.35], { n: 30, vel: 1.8, dur: 0.6, som: false });
  E.anda(m, ["1:curto", 0.05], ["1:curto", 0.5], [-1.6, -1.75], { vira: -PI / 2 + 0.6 });           // pula para trás com o susto
  E.raioX(reboco, "1:pega", ["1:Então", 0.3], 0.18);
  aquece(fioFino, "1:pega", ["1:Então", 0.2], { sobe: 0.5 });
  fogo([TX, 1.6, ZB - 0.01], "1:fogo", ["1:Então", 0.1], { larg: [0.25, 0.03], alt: 0.55, n: 50 });
  fogo([TX - 0.35, 2.2, ZB - 0.01], ["1:fogo", 0.3], ["1:Então", 0.1], { larg: [0.5, 0.03], alt: 0.4, n: 45, seed: 7 });
  E.nota("CURTO", [TX + 0.25, TY + 0.1, TZ + 0.1], "1:curto", "1:Porque");
  // porque: fio fino esquenta com corrente demais — termômetro subindo
  const tFino = E.t("1:fino"), tDem = E.t("1:demais>");
  corrente(fioFino, "1:Porque", ["1:demais>", 0.25], { n: 70, vel: 1.4, acel: 0.9, raio: 0.011 });
  E.nota("FIO FINO", [TX + 0.05, 1.85, ZB + 0.05], "1:fino", ["1:demais>", 0.25]);
  const termo = visor(0.36, 0.14, t => t < tFino ? -1 : Math.round(25 + 175 * sm((t - tFino) / (tDem - tFino))), (x, W, Hh, v) => {
    if (v < 0) return; x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, W - 8, Hh - 8, Hh / 2 - 4); x.fill(); x.fillStyle = v > 120 ? '#e5483a' : '#f0a020'; x.font = `bold ${Hh * 0.6}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(v + ' °C', W / 2, Hh / 2 + 2); }, { transp: true });
  termo.position.set(TX - 0.45, 2.05, ZB + 0.06); E.scene.add(termo); E.cada(t => { termo.visible = t >= tFino && t < tDem + 0.25; });
  E.errado(fioFino, "1:esquenta", ["1:demais>", 0.25], { x: [TX - 0.45, 1.75, ZB + 0.05] });
  // ◀◀ volta no tempo: o cabo da rua sai da tomada
  E.rebobina([caboRua, plugue], ["1:Então", -0.15], ["1:Então", 0.45]);
  corrente(caboRua, "1:Mas", ["1:Então", -0.15], { n: 120, vel: 4, raio: 0.03, seed: 44 });
  // mas a rede da rua manda energia sem limite e sem ninguém medir
  rede.forEach((r, i) => corrente(r, "1:Mas", ["1:Então", 0.4], { n: 160, vel: 6 + i, raio: 0.03, seed: 50 + i }));
  E.som('zumbido', "1:Mas", 0.8, E.t("1:Então") - E.t("1:Mas"));
  E.nota("SEM LIMITE", [PX + 1.2, PY - 0.2, PZ], "1:sem", "1:Então");
  E.nota("NINGUÉM MEDE", [PX + 1.4, PY - 0.75, PZ], "1:ninguém", "1:Então");
  // o personagem sai de casa e vai até o muro da frente
  E.anda(m, ["1:Mas", 0.3], ["1:e", -0.1], [-1.6, 1.6]);
  E.anda(m, ["1:e", -0.05], ["1:Então", 0.8], [-3.7, 4.65]);
  E.anda(m, ["1:Então", 0.85], ["1:muro", 0.3], [-4.85, 4.74], { vira: -PI / 2 });
  KM.push(["1:Mas", 'idle', 0.3]);
  // então: caixa no muro com relógio (medidor) e chave geral = padrão de entrada
  const padrao = (() => { const g = new T.Group(); g.add(K.caixa(0.62, 0.9, 0.2, 0x9aa1a8, { rug: 0.5, metal: 0.2 }));
    const tampa = K.caixa(0.56, 0.84, 0.01, 0x7d858c, { metal: 0.25, rug: 0.5 }); tampa.position.set(0, 0.03, 0.101); g.add(tampa);
    const vid = K.caixa(0.36, 0.3, 0.012, 0xbfe3f2, { op: 0.35, rug: 0.1 }); vid.position.set(0, 0.5, 0.11); g.add(vid);
    return K.em(g, -5.6, 0.45, MZ + 0.08 + 0.1, "caixa do padrão"); })();
  padrao.position.z = MZ + 0.08; E.permite(padrao, muroE);
  const mastro = K.em(K.cilindro(0.04, 2.3, 0x9aa1a8, { metal: 0.4 }), -5.45, 1.35, MZ + 0.2, "mastro do padrão"); E.permite(mastro, padrao);
  const curva = K.em(K.cilindro(0.06, 0.08, 0x3a3d42), -5.45, 3.63, MZ + 0.2); curva.userData.semColisao = true;
  E.entra(padrao, "1:caixa", { modo: 'cai', alt: 0.5 }); E.entra(mastro, "1:caixa", { modo: 'cresce', dur: 0.5, som: null, inspeciona: false }); E.entra(curva, ["1:caixa", 0.45], { modo: 'pop', silencioso: true });
  E.fixo(padrao, mastro);
  const ramal = fio([[PX, PY + 0.1, PZ - 0.65], [PX + 0.35, 5.6, PZ - 0.55], [-5.45, 3.7, MZ + 0.2]], 0.016, 0x15171a, { suave: true, cresce: ["1:muro", "1:caixa"], dens: 20 });
  // relógio (medidor digital) com o número do gasto subindo
  const T_MED = E.t("1:mede"); let kwh0 = 4821.3;
  const medidor = (() => { const g = new T.Group(); g.add(K.caixa(0.26, 0.24, 0.07, 0xf2f2ee, { rug: 0.4 }));
    const v = visor(0.2, 0.07, t => t < T_MED ? 'apagado' : (kwh0 + Math.max(0, t - T_MED) * (energia(t) ? 0.9 : 0.05)).toFixed(1), (x, W, Hh, s) => { x.fillStyle = '#18222a'; x.fillRect(0, 0, W, Hh);
      if (s === 'apagado') return; x.fillStyle = '#7dff9a'; x.font = `bold ${Hh * 0.62}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.padStart(7, '0') + ' kWh', W / 2, Hh / 2 + 2); }, { px: 320 });
    v.position.set(0, 0.04, 0.036); g.add(v); return K.em(g, 0, 0.5, 0.14, padrao, "relógio medidor"); })();
  E.entra(medidor, "1:relógio", { modo: 'pop', dur: 0.3 });
  corrente(ramal, "1:mede", ["2:Mas", 0.2], { n: 40, vel: 2.5, raio: 0.022, ativo: t => energia(t) ? 1 : 0 });
  // chave geral (disjuntor geral): alavanca que gira para desligar
  const geral = (() => { const g = new T.Group(); g.add(K.caixa(0.11, 0.16, 0.08, 0x2b2d31, { rug: 0.5 })); const al = new T.Group(); al.position.set(0, 0, 0.04); g.add(al);
    const pino = K.caixa(0.05, 0.07, 0.04, 0xe5483a); pino.position.y = 0.0; al.add(pino); al.rotation.x = -0.5; g.userData.alavanca = al; return K.em(g, 0, 0.12, 0.145, padrao, "chave geral"); })();
  E.entra(geral, "1:chave", { modo: 'pop', dur: 0.3 });
  E.move(geral.userData.alavanca, "1:desliga", { rot: [0.5, 0, 0], dur: 0.15, som: 'clique', inspeciona: false });
  E.move(geral.userData.alavanca, T_G1 - 0.15, { rot: [-0.5, 0, 0], dur: 0.15, som: 'clique', inspeciona: false });
  KM.push(["1:coloca", 'reach', 0.3], ["1:caixa", 'chopDown', 0.2], [["1:caixa", 0.25], 'chopUp', 0.2], ["1:relógio", 'chopDown', 0.2], ["1:mede", 'reach', 0.3],
    ["1:chave", 'reach', 0.3], ["1:desliga", 'press', 0.15], ["1:casa", 'shrug', 0.3], [T_G1 - 0.2, 'press', 0.15], ["1:padrão", 'cheer', 0.3]);
  E.nota("MEDE O GASTO", [-5.6, 1.2, MZ + 0.35], "1:mede", "1:chave");
  E.nota("DESLIGA A CASA", [-2.0, 1.95, ZB + 0.3], "1:desliga", ["1:inteira>", 0.2]);
  E.certo([-5.6, 1.55, MZ + 0.3], ["1:padrão", -0.2]);
  E.rotulo("PADRÃO DE ENTRADA", padrao, "1:padrão", ["1:fim", 0.2], [0, 0.75, 0.2]);

  // volta para dentro de casa, até o quadro de luz (andando, nunca teleporta)
  E.anda(m, ["1:padrão", 0.3], ["1:entrada>", 0.0], [-3.7, 4.7]);
  E.anda(m, ["1:entrada>", 0.05], ["2:energia", 0.0], [-3.3, 1.4]);
  E.anda(m, ["2:energia", 0.05], ["2:só>", 0.1], [-3.32, -0.45], { vira: 0.6 });
  E.vira(m, ["2:Então#2", 0.1], -PI / 2 + 0.35); E.vira(m, "2:Esse", 0.6); E.vira(m, ["2:trocar", -0.2], -PI / 2 + 0.35); E.vira(m, "2:perigoso", 0.6);

  // ================================================================= BLOCO 2 — circuitos e disjuntor
  const ZF = ZB + 0.014, XF = -3.986;                                 // fios por cima da parede do fundo / da esquerda
  const doQuadro = (u, y, xFim, yFim) => [QP(u, 0.35, 0.07), QP(u, 0.66, 0.07), QP(u, 0.66, -0.056), [XF, y, QZ - u], [XF, y, ZF], [xFim, y, ZF], [xFim, yFim, ZF]];
  // jeito errado: a casa toda num fio só
  const fioSo = fio(doQuadro(0.0, 2.43, 2.35, 2.1), 0.013, 0xd23a2a, { cresce: ["2:casa", "2:só>"], dens: 30 });
  const fioSoF = fio([[-3.1, 2.43, ZF], [-3.1, 0.99, ZF]], 0.013, 0xd23a2a, { cresce: ["2:fio", "2:só>"] });
  E.destaca(chuv, "2:chuveiro", ["2:chuveiro", 0.9]); E.destaca(fog, "2:forno", ["2:forno", 0.9]); E.som('agua', "2:chuveiro", 0.5, 2.5);
  const tCh = E.t("2:chuveiro"), tFo = E.t("2:forno"), tEnt = E.t("2:Então"), tSep = E.t("2:separados>"), tPrim = E.t("2:cada"), tSoz = E.t("2:sozinha"), tBig = E.t(["2:disjuntor#2", 0.3]), tFimB2 = E.t(["2:fim", 0.2]);
  const chuvOn = t => energia(t) * ((t >= tCh && t < tEnt) || (t >= tSep && t < tSoz) || (t >= tBig && t < tFimB2) ? 1 : 0);
  const fornoOn = t => energia(t) * ((t >= tFo && t < tEnt) || (t >= tPrim && t < tFimB2) ? 1 : 0);
  E.particulas({ n: 60, raio: 0.012, cor: 0x7fc8ff, de: "2:chuveiro", ate: tFimB2, pos: (i, tau, s, amb) => { const t = tCh + tau; if (s[3] > chuvOn(t)) return null; const k = (tau * 2.2 + s[1]) % 1, a = s[0] * 6.283, r = s[2] * 0.09;
    return [2.35 + Math.cos(a) * (r + k * 0.12), 1.96 - k * 1.94, ZB + 0.3 + Math.sin(a) * (r + k * 0.12), 1]; } });
  E.cada(t => { const k = fornoOn(t); janelaForno.material.emissive = janelaForno.material.emissive || new T.Color(); janelaForno.material.emissive.setRGB(1.0 * k, 0.35 * k, 0.05 * k); });
  corrente(fioSo, "2:somam", ["2:esquenta>", 0.3], { n: 90, vel: 1.1, acel: 1.2, raio: 0.016 });
  E.setas([[[2.0, 2.6, ZF + 0.05], [0.9, 2.6, ZF + 0.05]], [[-2.8, 1.2, ZF + 0.05], [-2.8, 2.2, ZF + 0.05]]], "2:somam", "2:esquenta>", { cor: 0xffc21a, raio: 0.025 });
  E.nota("CHUVEIRO + FORNO", [-2.6, 2.62, ZF + 0.1], "2:somam", ["2:esquenta>", 0.2]);
  aquece(fioSo, "2:fio#2", ["2:esquenta>", 0.3]); aquece(fioSoF, "2:fio#2", ["2:esquenta>", 0.3]);
  E.particulas({ n: 30, raio: 0.05, cor: 0x6f6f6f, op: 0.45, de: "2:esquenta", ate: ["2:Então", 0.2], pos: (i, tau, s, amb) => { const k = (tau * 0.5 + s[1]) % 1; return [-3.6 + s[0] * 5.5, 2.45 + k * 0.6, ZF + 0.05 + k * 0.2, amb * (0.5 + k)]; } });
  E.errado(fioSo, "2:esquenta", ["2:esquenta>", 0.35], { x: [-3.0, 2.2, ZF + 0.1] });
  E.rebobina([fioSo, fioSoF], ["2:esquenta>", 0.3], ["2:Então", 0.3]);
  KM.push(["2:casa", 'reach', 0.3], ["2:chuveiro", 'idle', 0.3], ["2:somam", 'worried', 0.3], ["2:esquenta", 'worried', 0.2], ["2:Então", 'idle', 0.3]);
  // jeito certo: um fio para cada caminho (circuitos)
  const cLar = fio(doQuadro(0.16, 2.45, 2.35, 2.08), 0.012, 0xff8a1c, { cresce: ["2:divide", "2:separados>"], dens: 30 });
  const cRox = fio(doQuadro(0.07, 2.38, -3.25, 0.99), 0.012, 0x8e5bd6, { cresce: ["2:caminhos", "2:cada"], dens: 30 });
  const cAzu = fio(doQuadro(-0.02, 2.31, TX, 2.31), 0.012, 0x24b5c9, { cresce: ["2:cada", "2:seu"], dens: 30 });
  const cAzuD = fio([[TX, 2.31, ZF], [TX, TY + 0.08, ZF]], 0.012, 0x24b5c9, { cresce: ["2:seu", "2:fio#3>"] });
  const orangeAtivo = t => chuvOn(t);
  corrente(cLar, "2:separados>", tFimB2, { n: 70, vel: 1.0, raio: 0.013, ativo: t => orangeAtivo(t) * (t > E.t("2:Mas#2") ? 1 : 0.55), cor: 0xffe14a });
  corrente(cRox, "2:cada", tFimB2, { n: 50, vel: 0.9, raio: 0.013, ativo: t => fornoOn(t) * 0.6, seed: 61 });
  corrente(cAzu, "2:fio#3>", ["2:Mas#2", 0.1], { n: 40, vel: 0.9, raio: 0.013, ativo: t => energia(t) * 0.5, seed: 62 });
  E.rotulo("CIRCUITOS", [-3.0, 2.38, ZF], "2:circuitos", ["2:circuitos>", 0.9], [0, 0.3, 0.1]);
  for (const f of [cLar, cRox, cAzu, cAzuD]) acende(f, "2:circuitos", ["2:circuitos>", 0.5]);
  E.certo([-3.0, 2.0, ZF + 0.1], ["2:circuitos", 0.25]);
  KM.push(["2:divide", 'reach', 0.3], ["2:caminhos", 'press', 0.2], ["2:cada", 'reach', 0.3], ["2:circuitos", 'cheer', 0.3], ["2:Mas#2", 'idle', 0.3]);
  // um circuito passa do limite: o fio do chuveiro esquenta (corrente subindo no visor)
  const tLim0 = E.t("2:circuito"), tLim1 = E.t("2:limite>");
  const amp = visor(0.42, 0.24, t => t < tLim0 || t > tSoz + 0.6 ? '' : String(t >= tSoz ? 0 : Math.round(18 + 24 * sm((t - tLim0) / (tLim1 - tLim0)))), (x, W, Hh, v) => { if (v === '') return;
    const n = +v; x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, W - 8, Hh - 8, 22); x.fill(); x.fillStyle = '#5b6470'; x.font = `bold ${Hh * 0.2}px ${FONTE}`; x.textAlign = 'center'; x.fillText('CHUVEIRO', W / 2, Hh * 0.3);
    x.fillStyle = n > 32 ? '#e5483a' : '#2a8f3a'; x.font = `bold ${Hh * 0.42}px ${FONTE}`; x.fillText(n + ' A', W / 2, Hh * 0.78); }, { transp: true });
  amp.position.set(2.95, 2.25, ZB + 0.06); E.scene.add(amp);
  aquece(cLar, ["2:passar", -0.2], tSoz + 0.2, { sobe: 1.4 });
  E.nota("PASSOU DO LIMITE", [2.95, 1.95, ZB + 0.1], "2:limite", ["2:Então#2", 0.2]);
  // em cada circuito, uma chavinha que desliga sozinha: o disjuntor
  const disj = (cor, larg = 0.06, txt = '') => { const g = new T.Group(); g.add(K.caixa(larg, 0.13, 0.06, 0xf4f4f0, { rug: 0.4 }));
    const tag = K.caixa(larg * 0.9, 0.018, 0.004, cor); tag.position.set(0, 0.105, 0.031); g.add(tag);
    const al = new T.Group(); al.position.set(0, 0.065, 0.03); g.add(al); const p = K.caixa(Math.min(0.026, larg * 0.5), 0.045, 0.026, 0x2b2d31); p.position.y = -0.0225; al.add(p); al.rotation.x = -0.55;
    if (txt) { const v = visor(larg * 0.85, 0.03, () => txt, (x, W, Hh, s) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#1d1f22'; x.font = `bold ${Hh * 0.8}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, W / 2, Hh / 2 + 1); }, { px: 128 });
      v.position.set(0, 0.02, 0.031); g.add(v); }
    g.userData.alavanca = al; g.userData.semColisao = true; return g; };
  const D = [[0.16, 0xff8a1c, '20A'], [0.07, 0x8e5bd6, '32A'], [-0.02, 0x24b5c9, '20A']].map(([u, cor, tx], i) => { const d = disj(cor, 0.06, tx); d.position.set(u, 0.22, 0.06); quadro.add(d);
    E.entra(d, ["2:coloca", 0.25 + i * 0.3], { modo: 'pop', dur: 0.25, som: 'encaixe' }); return d; });
  E.move(D[0].userData.alavanca, "2:sozinha", { rot: [0.55, 0, 0], dur: 0.12, som: 'clique', ganho: 1.6, inspeciona: false });
  E.certo(QP(0.16, 0.5, 0.15), ["2:sozinha>", 0.05]);
  E.nota("DESLIGOU SOZINHO", QP(0.1, 0.78, 0.15), ["2:sozinha", 0.1], "2:É#4");
  E.rotulo("DISJUNTOR", D[0], "2:disjuntor", ["2:disjuntor>", 0.9], [0, 0.2, 0]);
  KM.push(["2:Então#2", 'reach', 0.3], ["2:coloca", 'press', 0.2], [["2:chavinha", 0.2], 'press', 0.2], ["2:desliga", 'idle', 0.3], ["2:sozinha", 'worried', 0.15], ["2:Esse", 'cheer', 0.3]);
  // trocar por um disjuntor maior: o fio volta a esquentar
  E.sai(D[0], ["2:trocar", 0.1], { modo: 'pop', dur: 0.2 });
  const grande = disj(0xe5483a, 0.075, '63A'); grande.position.set(0.16, 0.22, 0.06); quadro.add(grande);
  E.entra(grande, ["2:disjuntor#2", 0.0], { modo: 'pop', dur: 0.3, som: 'encaixe' });
  aquece(cLar, tBig + 0.2, tFimB2, { sobe: 0.9 });
  E.particulas({ n: 26, raio: 0.05, cor: 0x6f6f6f, op: 0.45, de: tBig + 0.6, ate: tFimB2, pos: (i, tau, s, amb) => { const k = (tau * 0.5 + s[1]) % 1; return [XF + 0.05 + k * 0.15, 1.95 + s[0] * 0.5 + k * 0.4, QZ - 0.16 + (s[2] - 0.5) * 0.3, amb * (0.5 + k)]; } });
  E.errado(cLar, "2:perigoso", tFimB2, { x: QP(0.16, 0.95, 0.15) });
  E.nota("O FIO NÃO AGUENTA", [XF + 0.1, 2.15, QZ - 0.4], "2:ele", tFimB2);
  E.rebobina(grande, ["2:fio#4>", -0.1], ["3:Mas", 0.1]);
  const D0b = disj(0xff8a1c, 0.06, '20A'); D0b.position.set(0.16, 0.22, 0.06); quadro.add(D0b); E.entra(D0b, ["3:Mas", 0.12], { modo: 'pop', dur: 0.2, silencioso: true });
  KM.push(["2:É#4", 'idle', 0.3], ["2:trocar", 'reach', 0.25], ["2:maior", 'press', 0.2], ["2:perigoso", 'worried', 0.2], ["2:ele", 'worried', 0.3]);

  // ================================================================= BLOCO 3 — eletroduto e fio terra
  E.anda(m, ["2:fio#4", -0.4], ["3:solto", 0.3], [-1.52, -2.3], { vira: PI + 0.5 });
  E.raioX(reboco, "3:Mas", ["3:eletroduto>", 0.5], 0.14);
  // fio solto na parede descasca: aparece o cobre; dá fuga no tijolo úmido
  const cobre = [1.95, 1.75, 1.5, 1.3].map((y, i) => { const c = K.cilindro(0.0135, 0.035, 0xd9822b, { metal: 0.6, rug: 0.35 }); c.userData.semColisao = true; K.em(c, TX, y, ZF);
    E.entra(c, ["3:descasca", i * 0.12], { modo: 'pop', dur: 0.2, silencioso: i > 0 }); E.sai(c, ["3:úmido>", 0.35], { modo: 'pop', dur: 0.2 }); return c; });
  for (const [y, k] of [[1.75, 0], [1.3, 0.35], [1.5, 0.7]]) faiscas([TX, y, ZF], ["3:fuga", k], { n: 14, vel: 0.8, dir: [0, 0, -0.5], dur: 0.4, som: k === 0 });
  E.umidade({ x0: TX - 0.55, x1: TX + 0.55, y0: 0.2, y1: 1.7, z0: ZB - 0.02, z1: ZB - 0.008 }, "3:tijolo", ["3:Então", 0.2], { n: 60 });
  E.nota("TIJOLO ÚMIDO", [TX + 0.35, 0.95, ZB + 0.05], "3:tijolo", ["3:Então", 0.1], { cor: '#2F6FE0' });
  E.errado(cAzuD, "3:fuga", ["3:úmido>", 0.35], { x: [TX + 0.2, 1.55, ZB + 0.05] });
  E.rebobina(cAzuD, ["3:úmido>", 0.35], ["3:Então", 0.25]);
  KM.push(["3:Mas", 'idle', 0.3], ["3:descasca", 'reach', 0.3], ["3:fuga", 'worried', 0.2], ["3:úmido", 'worried', 0.3]);
  // então: rasga a parede, embute o cano corrugado até a caixinha 4x2
  const rasgo = K.em(K.caixa(0.07, 1.26, 0.03, 0x6b4a33, { rug: 1 }), TX, TY + 0.06, ZB - 0.012, "rasgo na parede"); E.permite(rasgo, [reboco, tijolo, tomada]); E.fixo(rasgo);
  E.entra(rasgo, "3:passa", { modo: 'cresce', dur: E.t("3:cano") - E.t("3:passa"), som: 'concreto' });
  for (let k = 0; k < 4; k++) E.poeira([TX, 2.0 - k * 0.28, ZB + 0.08], ["3:passa", k * 0.25], { raio: 0.18, n: 8, cor: 0xb8735a });
  const corrug = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e0b415' : '#ffd23f'; x.fillRect(0, i * 8, 16, 8); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(60, 1); t.colorSpace = T.SRGBColorSpace; return t; })();
  const eletro = fio([[TX, 2.6, ZB - 0.03], [TX, TY + 0.06, ZB - 0.03]], 0.026, 0xffffff, { cresce: ["3:cano", "3:embutido>"], map: corrug, rug: 0.6 });
  const cx42 = K.em(K.caixa(0.12, 0.18, 0.045, 0xf08a1c, { rug: 0.5 }), TX, TY - 0.09, ZB - 0.04, "caixinha 4x2"); E.permite(cx42, [reboco, tijolo, tomada, rasgo]); E.fixo(cx42);
  E.entra(cx42, "3:caixinha", { modo: 'pop', dur: 0.25 });
  const cAzuE = fio([[TX + 0.006, 2.6, ZB - 0.03], [TX + 0.006, TY + 0.02, ZB - 0.03]], 0.009, 0x24b5c9, { cresce: ["3:parede#2", "3:Esse"] });
  corrente(cAzuE, "3:Esse", "3:Mas#2", { n: 18, vel: 0.7, raio: 0.012, seed: 70 });
  E.rotulo("ELETRODUTO", eletro.userData.curva.getPointAt(0.45), "3:eletroduto", ["3:eletroduto>", 0.8], [0.12, 0, 0.1]); acende(eletro, "3:eletroduto", ["3:eletroduto>", 0.6]);
  E.certo([TX + 0.25, 1.85, ZB + 0.08], ["3:eletroduto", 0.3]);
  for (let k = 0; k < 7; k++) KM.push([E.t("3:passa") + k * 0.3, k % 2 ? 'chopUp' : 'chopDown', 0.18]);
  KM.push(["3:cano", 'reach', 0.3], ["3:caixinha", 'press', 0.2], ["3:Esse", 'idle', 0.3], ["3:eletroduto", 'cheer', 0.3]);
  // geladeira com fio encostando na lataria: ela inteira dá choque
  E.anda(m, ["3:eletroduto>", 0.6], ["3:fio#2", 0.0], [-0.87, -1.78], { vira: PI });
  E.raioX(gel, "3:encosta", ["3:geladeira>", 0.2], 0.3);
  const fioGel = fio([[-0.45, 0.1, ZB + 0.06], [-0.45, 0.45, ZB + 0.15], [-0.32, 0.52, ZB + 0.2]], 0.01, 0xd23a2a, { de: "3:encosta" }); someFio(fioGel, ["3:geladeira>", 0.2]);
  faiscas([-0.32, 0.52, ZB + 0.2], "3:lataria", { n: 18, vel: 0.9, dur: 0.4 });
  E._tinge(gel, { t0: E.t("3:ela"), t1: E.t(["3:Então#2", 0.3]), cor: 0xffe14a, forca: 0.6, emis: 0.55, pulso: 14, fin: 0.1 });
  for (const [a, b] of [[[-1.0, 1.62, -2.34], [-0.3, 1.62, -2.34]], [[-1.03, 0.1, -2.33], [-1.03, 1.55, -2.33]], [[-0.27, 0.2, -2.33], [-0.27, 1.5, -2.33]]]) raio(a, b, "3:ela", ["3:Então#2", 0.3], { amp: 0.04, som: false });
  raio([-0.92, 1.05, -2.31], [-0.87, 0.05, -1.95], "3:dá#3", ["3:Então#2", 0.2], { amp: 0.07 });
  E.som('zumbido', "3:ela", 1, E.t("3:Então#2") - E.t("3:ela"));
  E.nota("CHOQUE!", [-0.65, 1.85, -2.3], "3:choque", ["3:Então#2", 0.3]);
  E.errado(gel, "3:choque", ["3:Então#2", 0.3], { x: false });
  KM.push(["3:Mas#2", 'idle', 0.3], ["3:lataria", 'reach', 0.3], [["3:dá#3", 0.05], 'worried', 0.08], ["3:choque", 'scaredLook', 0.15], ["3:Então#2", 'shrug', 0.3]);
  // haste de cobre enterrada + fio verde = fio terra (corte do terreno no quintal)
  const VX0 = -2.5, VX1 = 1.5, VZ0 = 1.6, VZ1 = 3.9;
  const vala = K.terreno({ x0: -3.2, x1: 2.2, z0: 1.1, z1: 4.15, prof: 2.6, topo: C.grama, camadas: [['terra', 0.45], ['argila', 0.9], ['terra', 1.2], ['rocha', 5]], buracos: [{ x0: VX0, x1: VX1, z0: VZ0, z1: VZ1, prof: 1.5, fundo: 'terra' }] });
  vala.name = 'corte do terreno no quintal';
  const tampa = (() => { const me = new T.Mesh(new T.BoxGeometry(VX1 - VX0, 0.024, VZ1 - VZ0), new T.MeshStandardMaterial({ map: K.texRuido(C.grama, VX1 - VX0, VZ1 - VZ0), roughness: 1 })); me.receiveShadow = true;
    const g = new T.Group(); g.add(me); me.position.y = 0.0; return K.em(g, (VX0 + VX1) / 2, 0.0, (VZ0 + VZ1) / 2, "grama sobre a vala"); })();
  E.permite(tampa, vala); E.fixo(tampa);
  E.sai(tampa, ["3:Então#2", 0.1], { modo: 'some', dur: 0.45 }); E.poeira([-0.5, 0.05, 2.7], ["3:Então#2", 0.1], { raio: 1.4, n: 16, cor: 0x7a5a38 });
  const RX = 1.15;
  const haste = K.em(K.cilindro(0.024, 2.4, 0xd9822b, { metal: 0.65, rug: 0.3 }), RX, -1.98, VZ0 + 0.012, "haste de cobre"); E.permite(haste, vala); E.fixo(haste);
  const tH = E.t("3:haste");
  E.entra(haste, tH, { modo: 'desliza', dur: 0.3, de: [0, 0.6, 0], som: 'tum', inspeciona: false });
  [0, 1, 2].forEach(k => E.move(haste, tH + 1.0 + k * 0.36, { por: [0, -0.2, 0], dur: 0.1, som: 'tum', ganho: 1.3, inspeciona: false }));
  const cabeca = haste; // a ponta fica em y = -0.18 depois das 3 batidas
  E.anda(m, ["3:choque>", 0.4], ["3:liga", 0.6], [-0.2, 0.55]);
  E.anda(m, ["3:liga", 0.65], ["3:haste", 0.9], [1.9, 1.85], { vira: -PI / 2 - 0.3 });
  KM.push([tH + 0.8, 'press', 0.25], [["3:choque>", 0.25], 'idle', 0.25]);
  E.nota("COBRE", [RX + 0.25, -0.6, VZ0 + 0.05], "3:cobre", ["3:Esse#2", 0.1]);
  const verde = fio([[-0.27, 0.12, ZB + 0.1], [-0.15, 0.02, ZB + 0.25], [-0.15, 0.02, 0.98], [-0.15, -0.25, 1.05], [-0.15, -0.25, VZ0 - 0.03], [-0.15, -0.25, VZ0 + 0.012], [RX - 0.04, -0.25, VZ0 + 0.012], [RX - 0.03, -0.2, VZ0 + 0.012]], 0.011, 0x2bb24c, { cresce: ["3:com", "3:verde>"], dens: 30 });
  corrente(verde, "3:Esse#2", ["3:É#4", 0.2], { n: 40, vel: 1.2, raio: 0.016, seed: 80 });
  E.particulas({ n: 40, raio: 0.016, cor: 0xffe14a, de: "3:Esse#2", ate: ["3:É#4", 0.2], pos: (i, tau, s, amb) => { const k = (tau * 0.8 + s[1]) % 1, a = s[0] * 6.283, r = 0.05 + k * 0.6;
    return [RX + Math.cos(a) * r, -0.6 - s[2] * 1.4 - k * 0.2, VZ0 + 0.03, amb * (1 - k)]; } });
  E.rotulo("FIO TERRA", [0.75, -0.25, VZ0 + 0.02], "3:fio#4", ["3:terra>", 0.6], [0, 0.25, 0.05]); acende(verde, "3:fio#4", ["3:terra>", 0.5]);
  E.certo([RX - 0.3, 0.25, VZ0 + 0.1], "3:terra");
  KM.push(["3:enterrada", 'idle', 0.3], ["3:verde", 'reach', 0.3], ["3:Esse#2", 'idle', 0.3], ["3:terra", 'cheer', 0.3]);
  // a tomada tem três furos: o do meio é o terra
  E.anda(m, ["3:terra>", 0.4], ["3:terra>", 1.0], [1.9, 1.0]);
  E.anda(m, ["3:terra>", 1.05], ["3:terra>", 2.65], [-0.3, 0.4]);
  E.anda(m, ["3:terra>", 2.7], ["3:terra#2", 0.45], [-1.35, -2.2], { vira: PI });
  E.raioX(reboco, ["3:É#4", 0.1], ["4:Mas", 0.1], 0.16);
  const verdeT = fio([[TX, TY + 0.017, ZB - 0.035], [TX + 0.04, TY + 0.25, ZB - 0.035], [TX + 0.04, 2.6, ZB - 0.035]], 0.008, 0x2bb24c, { de: "3:É#4" });
  E.cada(t => { const k = t > E.t("3:meio") && t < E.t(["4:Mas", 0.3]) ? 0.6 + 0.4 * Math.sin(t * 10) : 0; furoTerraM.material.emissive.setRGB(0.1 * k, 0.9 * k, 0.25 * k); });
  E.nota("3 FUROS", [TX + 0.14, TY + 0.06, TZ + 0.02], "3:três", ["3:meio", -0.1]);
  E.rotulo("TERRA", furoTerra, "3:meio", ["3:terra#2>", 0.2], [0.0, 0.07, 0.03]);

  // ================================================================= BLOCO 4 — DR
  // fio desencapado na tomada do banheiro: choque numa pessoa é pouca corrente
  const TBX = -1.2, TBY = 1.12;
  const tomB = K.em(K.grupo(K.caixa(0.1, 0.15, 0.022, 0xf7f7f2)), TBX, TBY - 0.075, ZB + 0.012, "tomada da geladeira"); E.permite(tomB, [reboco, tijolo]); E.fixo(tomB);
  const solto = fio([[TBX, TBY - 0.02, ZB + 0.03], [TBX + 0.02, TBY - 0.12, ZB + 0.14], [TBX + 0.03, TBY - 0.2, ZB + 0.24]], 0.009, 0x1d1f22, { suave: true, de: "3:É#4" });
  const ponta = K.cilindro(0.01, 0.04, 0xd9822b, { metal: 0.6 }); ponta.userData.semColisao = true; K.em(ponta, TBX + 0.03, TBY - 0.24, ZB + 0.25);
  const poca = K.cilindro(0.4, 0.004, 0x3fa8ff, { op: 0.6, seg: 24, sombra: false }); poca.userData.semColisao = true; poca.scale.z = 0.7; K.em(poca, -1.35, 0.012, -2.05);
  E.entra(poca, ["3:É#4", 0.2], { modo: 'surge', dur: 0.3, silencioso: true });
  faiscas([TBX + 0.03, TBY - 0.25, ZB + 0.26], "4:choque", { n: 22, vel: 1.0, dur: 0.45 });
  E.setas([[[TBX + 0.02, TBY - 0.26, ZB + 0.3], [-1.3, 0.95, -2.35]], [[-1.33, 0.9, -2.25], [-1.35, 0.4, -2.15]], [[-1.35, 0.35, -2.12], [-1.35, 0.02, -1.95]]], "4:choque", ["4:corrente", 0.6], { cor: 0xffd23f, raio: 0.022, passo: 0.12 });
  const mA = visor(0.34, 0.14, t => t < E.t("4:pouca") || t > E.t(["4:Então", 0.1]) ? '' : '0,03 A', (x, W, Hh, v) => { if (!v) return; x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, W - 8, Hh - 8, Hh / 2 - 4); x.fill();
    x.fillStyle = '#2a8f3a'; x.font = `bold ${Hh * 0.58}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(v, W / 2, Hh / 2 + 2); }, { transp: true });
  mA.position.set(-1.72, 1.8, -2.72); E.scene.add(mA);
  E.nota("POUCA CORRENTE", [-1.72, 1.6, -2.7], "4:pouca", ["4:corrente", 0.8]);
  KM.push(["4:Mas", 'reach', 0.2], [["4:choque", 0.05], 'worried', 0.12], [["4:corrente", 0.1], 'idle', 0.25]);
  // o disjuntor nem percebe
  E.nota("NEM PERCEBE", QP(0.07, 0.75, 0.15), "4:nem", ["4:Então", 0.1]);
  E.anda(m, ["4:corrente", 0.4], ["4:coloca", -0.2], [-3.32, -0.6], { vira: 0.6 });
  E.vira(m, ["4:aparelho", -0.3], -PI / 2 + 0.35); E.vira(m, "4:compara", 0.6); E.vira(m, T_DR1 - 0.45, -PI / 2 + 0.35); E.vira(m, "4:DR", 0.6);
  // DR no quadro: compara a corrente que vai com a que volta
  const dr = (() => { const g = new T.Group(); g.add(K.caixa(0.1, 0.13, 0.065, 0xf4f4f0, { rug: 0.4 }));
    const bt = K.cilindro(0.011, 0.01, 0x2f6fe0); bt.rotation.x = PI / 2; bt.position.set(0.025, 0.035, 0.035); g.add(bt);
    const v = visor(0.06, 0.028, () => 'DR', (x, W, Hh, s) => { x.fillStyle = '#2f6fe0'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#fff'; x.font = `bold ${Hh * 0.8}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, W / 2, Hh / 2 + 1); }, { px: 128 });
    v.position.set(-0.012, 0.03, 0.0335); g.add(v);
    const al = new T.Group(); al.position.set(-0.015, 0.075, 0.032); g.add(al); const p = K.caixa(0.04, 0.045, 0.026, 0x2f6fe0); p.position.y = -0.0225; al.add(p); al.rotation.x = -0.55;
    g.userData.alavanca = al; g.userData.semColisao = true; g.position.set(-0.17, 0.22, 0.06); quadro.add(g); return g; })();
  E.entra(dr, "4:aparelho", { modo: 'pop', dur: 0.3, som: 'encaixe' });
  const fVai = fio(doQuadro(-0.2, 2.5, -3.4, 2.5).slice(0, 5), 0.011, 0xd23a2a, { de: "4:aparelho" });
  const fVolta = fio(doQuadro(-0.14, 2.56, -3.4, 2.56).slice(0, 5), 0.011, 0x2f6fe0, { de: "4:aparelho" });
  const tFalta = E.t("4:faltar");
  corrente(fVai, "4:vai", ["4:desliga", 0.25], { n: 40, vel: 0.9, raio: 0.014, cor: 0xff6a4a, ativo: energia, seed: 90 });
  corrente(fVolta, "4:volta", ["4:desliga", 0.25], { n: 40, vel: 0.9, raio: 0.014, cor: 0x7fb8ff, volta: true, ativo: t => energia(t) * (t > tFalta ? 0.8 : 1), seed: 91 });
  const painel = visor(0.62, 0.3, t => t < E.t("4:compara") || t > T_DR1 - 0.3 ? '' : t < E.t("4:volta") ? 'v' : energia(t) === 0 ? 'off' : t < tFalta ? 'eq' : 'falta', (x, W, Hh, s) => { if (!s) return;
    x.fillStyle = 'rgba(20,28,36,0.92)'; x.beginPath(); x.roundRect(2, 2, W - 4, Hh - 4, 18); x.fill(); x.textBaseline = 'middle'; x.font = `bold ${Hh * 0.2}px ${FONTE}`;
    const vai = s === 'off' ? '0,00' : '10,00', vol = s === 'off' ? '0,00' : s === 'falta' ? '9,97' : '10,00';
    x.textAlign = 'left'; x.fillStyle = '#ff7a5c'; x.fillText('VAI', W * 0.07, Hh * 0.3); x.fillStyle = '#7fb8ff'; if (s !== 'v') x.fillText('VOLTA', W * 0.07, Hh * 0.7);
    x.textAlign = 'right'; x.fillStyle = '#ffffff'; x.fillText(vai + ' A', W * 0.93, Hh * 0.3); if (s !== 'v') { x.fillStyle = s === 'falta' ? '#ff5a4a' : '#ffffff'; x.fillText(vol + ' A', W * 0.93, Hh * 0.7); } }, { transp: true, px: 360 });
  painel.rotation.y = PI / 2; painel.position.set(XF + 0.02, 2.2, QZ + 0.62); E.scene.add(painel);
  E.nota("FALTOU 0,03 A", [XF + 0.05, 1.98, QZ + 0.62], "4:faltar", "4:desliga");
  E.move(dr.userData.alavanca, "4:desliga", { rot: [0.55, 0, 0], dur: 0.12, som: 'clique', ganho: 1.6, inspeciona: false });
  E.move(dr.userData.alavanca, T_DR1 - 0.15, { rot: [-0.55, 0, 0], dur: 0.12, som: 'clique', inspeciona: false });
  E.certo(QP(-0.17, 0.5, 0.15), ["4:Esse", 0.5]);
  E.rotulo("DR", dr, "4:DR", ["4:DR>", 0.9], [0, 0.18, 0.05]);
  KM.push(["4:Então", 'idle', 0.3], ["4:aparelho", 'press', 0.2], ["4:compara", 'reach', 0.3], ["4:faltar", 'worried', 0.3], ["4:desliga", 'worried', 0.15], ["4:hora", 'cheer', 0.3], [T_DR1 - 0.2, 'press', 0.15], ["4:DR", 'cheer', 0.3], ["4:É#4", 'idle', 0.3]);
  // obrigatório no banheiro e na cozinha
  E.anda(m, ["4:É#4", 0.1], ["4:banheiro", 0.0], [-1.3, -1.4]);
  E.anda(m, ["4:banheiro", 0.05], ["4:cozinha>", 0.0], [-1.65, -2.15], { vira: -2.75 });
  E.nota("BANHEIRO", [2.4, 1.6, -2.4], "4:banheiro", ["5:ini", 0.1], { cor: '#2BB24C' }); E.certo([2.4, 1.35, -2.4], "4:banheiro");
  E.nota("COZINHA", [-3.1, 1.55, -2.4], "4:cozinha", ["5:ini", 0.4], { cor: '#2BB24C' }); E.certo([-3.1, 1.3, -2.4], "4:cozinha");

  // ================================================================= BLOCO 5 — espelho, benjamim, carregador, parabéns
  const espelho = K.em(K.caixa(0.15, 0.22, 0.01, 0xfbfbf8, { rug: 0.35 }), TX, TY - 0.11, ZB + 0.002, "espelho da tomada"); E.permite(espelho, [tomada, reboco, cx42]); E.fixo(espelho);
  E.entra(espelho, "5:espelho", { modo: 'desliza', dur: 0.3, de: [0, 0, 0.25], som: 'encaixe' });
  const benja = (cor = 0xf7f7f2) => { const g = new T.Group(); g.add(K.caixa(0.09, 0.09, 0.09, cor, { rug: 0.4 }));
    for (const [x, y, z, ry] of [[0, 0.045, 0.046, 0], [0.046, 0.045, 0, PI / 2], [-0.046, 0.045, 0, -PI / 2]]) for (const dx of [-0.014, 0.014]) { const f = K.cilindro(0.005, 0.004, 0x222222, { seg: 8 }); f.rotation.set(PI / 2, 0, 0); const h = new T.Group(); h.add(f); f.position.set(dx, 0, 0); h.position.set(x, y, z); h.rotation.y = ry; g.add(h); }
    g.userData.semColisao = true; return g; };
  const b1 = benja(); K.em(b1, TX, TY - 0.045, TZ + 0.07); E.entra(b1, "5:benjamim", { modo: 'desliza', dur: 0.25, de: [0, 0, 0.3], som: 'encaixe' });
  const b2 = benja(0xf2f2ec); K.em(b2, TX, TY - 0.045, TZ + 0.165); E.entra(b2, "5:era", { modo: 'desliza', dur: 0.2, de: [0, 0, 0.3], som: 'encaixe' });
  const b3 = benja(0xeeeeea); K.em(b3, TX + 0.095, TY - 0.045, TZ + 0.165); E.entra(b3, "5:só", { modo: 'desliza', dur: 0.2, de: [0.3, 0, 0], som: 'encaixe' });
  const plugs = [[TX - 0.05, TZ + 0.165, 0xe5483a], [TX + 0.14, TZ + 0.165, 0x2b2d31], [TX + 0.095, TZ + 0.21, 0x2f6fe0], [TX, TZ + 0.21, 0x2bb24c]].map(([x, z, cor], i) => {
    const p = K.caixa(0.035, 0.05, 0.035, cor); p.userData.semColisao = true; K.em(p, x, TY - 0.025, z); E.entra(p, ["5:só", 0.1 + i * 0.12], { modo: 'pop', dur: 0.15, silencioso: i % 2 === 1, inspeciona: i === 1 });
    fio([[x, TY, z], [x + (i - 1.5) * 0.05, TY - 0.2, z + 0.1], [x + (i - 1.5) * 0.12, 0.05, z + 0.3]], 0.006, cor, { suave: true, de: ["5:só", 0.1 + i * 0.12] }); return p; });
  E.nota("SÓ POR HOJE", [TX + 0.12, TY + 0.22, TZ + 0.1], "5:era", "5:Agora");
  KM.push(["5:Coloque", 'wave', 0.3], ["5:espelho", 'idle', 0.3], ["5:benjamim", 'cheer', 0.3], ["5:hoje", 'shrug', 0.3]);
  // carregador no benjamim e o celular carregando
  const cel = K.em(K.caixa(0.085, 0.012, 0.16, 0x1d1f22, { rug: 0.3 }), -2.5, 0.913, ZB + 0.3, "celular"); cel.rotation.y = 0.3; E.permite(cel, pia);
  const tCar = E.t("5:carregador");
  const tela = visor(0.072, 0.145, t => t < tCar ? 'off' : String(Math.min(100, Math.floor(8 + (t - tCar) * 9))), (x, W, Hh, s) => { x.fillStyle = s === 'off' ? '#0d0f12' : '#123a24'; x.fillRect(0, 0, W, Hh); if (s === 'off') return;
    x.strokeStyle = '#7dff9a'; x.lineWidth = 6; x.strokeRect(W * 0.25, Hh * 0.3, W * 0.5, Hh * 0.4); x.fillStyle = '#7dff9a'; x.fillRect(W * 0.25, Hh * 0.7 - Hh * 0.4 * (+s / 100), W * 0.5, Hh * 0.4 * (+s / 100));
    x.font = `bold ${W * 0.24}px ${FONTE}`; x.textAlign = 'center'; x.fillText(s + '%', W / 2, Hh * 0.88); }, { px: 128 });
  tela.rotation.x = -PI / 2; tela.position.set(0, 0.0065, 0); cel.add(tela);
  const carreg = K.caixa(0.05, 0.06, 0.04, 0xffffff, { rug: 0.4 }); carreg.userData.semColisao = true; K.em(carreg, TX - 0.046 - 0.026, TY - 0.03, TZ + 0.07); carreg.rotation.y = -PI / 2;
  E.entra(carreg, ["5:ligar", 0.1], { modo: 'desliza', dur: 0.25, de: [-0.25, 0, 0], som: 'encaixe', inspeciona: false });
  fio([[TX - 0.1, TY - 0.03, TZ + 0.07], [TX - 0.22, 0.7, TZ + 0.14], [-2.32, 0.92, ZB + 0.3], [-2.43, 0.92, ZB + 0.3]], 0.005, 0xffffff, { suave: true, cresce: ["5:o#2", "5:carregador>"] });
  E.certo([-2.45, 1.15, ZB + 0.3], ["5:carregador>", 0.05]); E.som('brilho', "5:carregador>", 0.8);
  KM.push(["5:Agora", 'reach', 0.3], ["5:carregador", 'press', 0.2], ["5:Parabéns", 'cheer', 0.3]);
  // parabéns: luz acesa, confete e o "comente"
  E.oculos(m, "5:Parabéns");
  E.confete([-1.6, 2.4, -1.6], "5:Parabéns");
  E.anda(m, ["5:Parabéns", 0.3], ["5:tomada", 0.4], [-1.2, 0.2], { vira: 0.15 });
  E.cta("ELETRICISTA", "BENJAMIM", "5:Se");
  E.confete([-1.2, 2.6, 0.2], "5:eletricista"); E.confete([-2.0, 2.4, -1.0], "5:benjamim#2"); E.som('pop', "5:Camadas", 1);
  KM.push(["5:tomada", 'wave', 0.3], ["5:Se", 'wave', 0.3], ["5:eletricista", 'jump', 0.3], ["5:Se#2", 'wave', 0.3], ["5:benjamim#2", 'jump', 0.3], ["5:segue", 'wave', 0.3], ["5:Camadas", 'cheer', 0.3]);

  // ================================================================= CÂMERA — "segura e pula": um plano a cada 2–3 s, o personagem sempre no quadro
  // bloco 1
  E.camera(0, [-2.6, 1.45, -0.6], [-1.75, 1.05, -2.7], 46);
  E.plano(["1:energia", -0.3], [-2.9, 1.8, 0.6], [-1.7, 1.45, -2.6], 50, { dur: 0.4 });
  E.corte("1:curto", [-2.5, 1.55, 0.1], [-1.75, 1.2, -2.6], 50);
  E.plano(["1:fogo", -0.2], [-2.8, 1.95, 0.6], [-1.85, 1.6, -2.6], 54, { dur: 0.4 });
  E.corte("1:Porque", [-2.75, 1.8, 0.2], [-1.85, 1.55, -2.8], 52);
  E.plano("1:corrente", [-2.5, 1.7, 0.0], [-1.75, 1.5, -2.8], 52, { dur: 0.45 });
  E.corte("1:Mas", [-3.0, 1.75, 4.2], [-1.6, 1.3, -1.0], 54);
  E.plano(["1:sem", -0.3], [-1.0, 2.0, 13.0], [-4.2, 3.6, 4.0], 58, { dur: 0.5 });
  E.plano(["1:Então", 0.6], [-3.5, 1.6, 7.6], [-5.1, 1.0, 4.3], 46, { dur: 0.45 });
  E.plano(["1:relógio", -0.3], [-3.9, 1.4, 7.2], [-5.3, 1.0, 4.4], 46, { dur: 0.4 });
  E.plano(["1:casa", -0.5], [-5.3, 2.3, 6.8], [-2.6, 1.0, -1.2], 54, { dur: 0.45 });
  E.plano(T_G1 - 0.1, [-3.6, 1.7, 7.2], [-5.2, 1.3, 4.3], 46, { dur: 0.45 });
  // bloco 2
  E.corte("2:Mas", [-1.6, 2.2, 5.2], [-3.2, 1.5, -1.2], 54);
  E.plano(["2:chuveiro", -0.5], [0.0, 2.2, 6.6], [-0.2, 1.4, -2.0], 60, { dur: 0.45 });
  E.plano(["2:somam", -0.1], [-1.3, 2.1, 1.9], [-3.1, 1.7, -2.0], 56, { dur: 0.45 });
  E.plano(["2:Então", 0.2], [-1.2, 2.2, 2.0], [-3.0, 1.8, -1.6], 56, { dur: 0.45 });
  E.plano(["2:Mas#2", -0.4], [1.2, 1.9, 1.4], [2.0, 1.8, -2.9], 52, { dur: 0.45 });
  E.corte(["2:Então#2", 0.1], [-1.6, 1.6, 1.6], [-3.6, 1.35, -0.5], 48);
  E.plano("2:É#4", [-2.6, 1.9, 1.2], [-3.75, 1.45, -0.55], 50, { dur: 0.45 });
  E.plano(["2:perigoso", -0.3], [-1.6, 2.0, 1.4], [-3.7, 1.75, -0.6], 54, { dur: 0.45 });
  // bloco 3
  E.corte("3:Mas", [-2.75, 1.8, 0.2], [-1.8, 1.5, -2.8], 52);
  E.plano("3:Então", [-2.8, 1.95, 0.3], [-1.8, 1.65, -2.8], 54, { dur: 0.45 });
  E.plano(["3:caixinha", -0.3], [-2.6, 1.45, -0.4], [-1.8, 1.05, -2.85], 46, { dur: 0.4 });
  E.plano("3:Esse", [-2.8, 1.95, 0.3], [-1.8, 1.65, -2.8], 54, { dur: 0.45 });
  E.plano(["3:Mas#2", -0.2], [-2.3, 1.6, 0.0], [-0.8, 1.1, -2.4], 52, { dur: 0.45 });
  E.plano(["3:ela", -0.2], [-2.1, 1.4, -0.4], [-0.8, 1.0, -2.3], 50, { dur: 0.4 });
  E.corte("3:Então#2", [0.5, 0.95, 4.1], [1.3, -0.15, 1.6], 58);
  E.plano(["3:Esse#2", -0.3], [0.3, 0.7, 3.7], [0.95, -0.4, 1.6], 56, { dur: 0.45 });
  E.corte("3:É#4", [-0.6, 1.45, -1.3], [-1.85, 1.1, -2.95], 42);
  E.plano(["3:meio", -0.4], [-2.3, 1.15, -2.45], [-2.0, 1.0, -3.0], 36, { dur: 0.4 });
  // bloco 4
  E.corte("4:Mas", [-2.6, 1.5, -0.5], [-1.35, 1.0, -2.6], 50);
  E.corte(["4:e#2", -0.1], [-1.6, 1.7, 1.4], [-3.6, 1.5, -0.4], 50);
  E.plano(["4:compara", -0.3], [-1.5, 2.0, 1.9], [-3.6, 1.75, -0.1], 54, { dur: 0.45 });
  E.plano(["4:desliga", -0.25], [-1.0, 2.2, 2.4], [-2.6, 1.4, -1.2], 56, { dur: 0.4 });
  E.plano("4:Esse", [-1.6, 1.7, 1.4], [-3.6, 1.5, -0.4], 50, { dur: 0.45 });
  E.plano(["4:obrigatório", -0.2], [1.3, 1.85, 1.6], [1.9, 1.3, -2.5], 52, { dur: 0.45 });
  E.plano(["4:cozinha", -0.35], [-0.6, 1.9, 1.4], [-2.1, 1.3, -2.3], 52, { dur: 0.4 });
  // bloco 5
  E.corte("5:Coloque", [-2.4, 1.3, -1.45], [-1.95, 1.0, -2.95], 42);
  E.plano(["5:benjamim", -0.2], [-2.3, 1.2, -1.75], [-1.95, 0.98, -2.95], 38, { dur: 0.4 });
  E.plano(["5:Agora", -0.1], [-2.65, 1.4, -1.4], [-2.2, 0.95, -2.85], 44, { dur: 0.45 });
  E.plano(["5:Parabéns", -0.1], [0.6, 2.4, 4.4], [-1.0, 1.25, -1.4], 56, { dur: 0.5 });
  E.plano(["5:Se", -0.2], [0.2, 1.7, 3.2], [-1.2, 1.1, 0.0], 50, { dur: 0.45 });
  E.plano(["5:segue", -0.3], [2.5, 5.5, 10.5], [-1.5, 1.0, -0.5], 52, { dur: 0.6 });

  // poses durante as caminhadas: só "walk" (pose diferente no meio do passo faz o pé patinar)
  { const W = (m.userData._andar || []).map(([a, b]) => [a, b]); for (let i = KM.length - 1; i >= 0; i--) { const t = E.t(KM[i][0]); if (W.some(([a, b]) => t > a - 0.05 && t < b)) KM.splice(i, 1); } }
  E.anima(m, KM);
}
