// VOCÊ CONSTRÓI UM AR-CONDICIONADO — cena completa (6 blocos)
// Quarto em corte (frente aberta, câmera em +Z): x -3.2..1.3, fundo ZB = -2.8. Parede lateral x 1.30..1.44 com porta (z -0.95..-0.05).
// Quintal à direita: condensadora em (2.45, -2.25). Muro do vizinho em x = 4.35 com a condensadora dele.
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

  const lerp = (a, b, k) => a + (b - a) * k;
  const VENT_GIRA = 0, VENT_EIXO = [0, 0, 1];
  const tt = q => E.t(q);
  const KM = [];

  // ================================================================= MUNDO
  K.mundoBairro({ lote: { x0: -6, x1: 6, z0: -5, z1: 4 }, muro: false, sombra: 9 });
  const ZB = -2.8, H = 2.6, XD = 1.37;                                      // fundo; pé-direito; parede lateral (centro)
  const corParede = 0xf3e6d3, corExt = 0xe9d8bb;
  const piso = K.revestido(4.5, 3.6, { cor: '#c99a6b', rejunte: '#a87a50', tam: 0.6 }); piso.children[0].position.y = 0; piso.rotation.x = -PI / 2; piso.position.set(-0.95, 0.006, -1.0); E.scene.add(piso);
  const contra = K.em(K.caixa(4.75, 0.08, 3.75, 0xb9ab95), -0.95, -0.082, -1.0, "contrapiso"); E.fixo(contra);
  const fundo = K.em(K.parede(4.75, H, 0.14, { tipo: 'reboco', cor: corParede }), -0.95, 0, ZB - 0.07, "parede do fundo");
  const parE = K.em(K.parede(3.75, H, 0.14, { tipo: 'reboco', cor: corParede }), -3.27, 0, -1.0, "parede esquerda"); parE.rotation.y = PI / 2;
  // parede lateral com a porta para o quintal: local x = -(z + 1.0)
  const parD = K.em(K.parede(3.75, H, 0.14, { tipo: 'reboco', cor: corParede, vaos: [{ x: -0.5, y: 0, w: 1.0, h: 2.1 }] }), XD, 0, -1.0, "parede lateral"); parD.rotation.y = PI / 2;
  E.permite([fundo, parE, parD], contra); E.permite(fundo, [parE, parD]);
  for (const [w, d, x, z] of [[4.9, 0.2, -0.95, ZB - 0.07], [0.2, 3.9, -3.27, -1.0], [0.2, 3.9, XD, -1.0]]) { const c = K.caixa(w, 0.1, d, corExt); c.userData.semColisao = true; K.em(c, x, H, z); }
  { const bat = K.caixa(0.06, 2.1, 0.06, 0xffffff); bat.userData.semColisao = true; K.em(bat, XD, 0, -1.02); const bat2 = K.caixa(0.06, 2.1, 0.06, 0xffffff); bat2.userData.semColisao = true; K.em(bat2, XD, 0, 0.02);
    const verga = K.caixa(0.16, 0.06, 1.06, 0xffffff); verga.userData.semColisao = true; K.em(verga, XD, 2.1, -0.5); }
  // janela na parede do fundo (luz do dia entrando)
  { const j = K.janela(0.9, 0.8); j.userData.semColisao = true; j.traverse(x => x.userData.semColisao = true); K.em(j, -2.3, 1.2, ZB + 0.01); }
  // quintal: laje da condensadora, muro do vizinho
  const laje = K.em(K.caixa(1.15, 0.1, 0.62, 0xbfb8ac, { rug: 0.95 }), 2.45, 0, -2.25, "laje da condensadora"); E.fixo(laje);
  const muroViz = K.em(K.parede(4.6, 2.3, 0.16, { tipo: 'tijolo' }), 4.35, 0, -1.2, "muro do vizinho"); muroViz.rotation.y = PI / 2; E.fixo(muroViz);

  // ================================================================= MÓVEIS
  const cama = await E.modelo('cama.glb', { comprimento: 1.9 }); K.em(cama, -2.35, 0, -1.82, "cama"); E.permite(cama, [piso, contra]);
  const mesa = K.em(K.caixa(0.46, 0.82, 0.44, 0xb07a4a, { rug: 0.7 }), -1.15, 0, -1.95, "mesinha");
  { const g = K.caixa(0.36, 0.03, 0.02, 0x7a5232); g.userData.semColisao = true; K.em(g, -1.15, 0.55, -1.72); }
  // termômetro de parede (visor)
  const TEMP = t => {
    if (t < tt("1:quarenta")) return Math.round(lerp(33, 40, sm(t / tt("1:quarenta"))));
    const a = tt("4:sopra"), b = tt("4:evaporadora>");
    if (t < a) return 40; if (t < b) return Math.round(lerp(40, 22, sm((t - a) / (b - a))));
    const d1 = tt("6:dezoito"), d2 = tt("6:vinte"), d3 = tt("6:três"), d4 = tt("6:graus>"), bt = tt("6:botão");
    if (t >= d1 && t < d2) return 18; if (t >= d2 && t < d3) return 23; if (t >= d3 && t < d4) return 18; if (t >= d4 && t < bt) return 23;
    return t >= bt ? 23 : 22; };
  const termo = visor(0.44, 0.2, t => TEMP(t), (x, W, Hh, v) => {
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(3, 3, W - 6, Hh - 6, 16); x.fill(); x.lineWidth = 5; x.strokeStyle = '#2b2d31'; x.stroke();
    x.fillStyle = v >= 30 ? '#e5483a' : v <= 20 ? '#2f7fe0' : '#2bb24c'; x.font = `bold ${Hh * 0.62}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(v + ' °C', W / 2, Hh / 2 + 3); }, { px: 256 });
  termo.position.set(-1.15, 1.78, ZB + 0.012); E.scene.add(termo);

  // ventilador de mesa (o jeito óbvio) — frente para +X, soprando no personagem
  const vent = await E.modelo('ventilador1.glb', { altura: 0.55, giraY: VENT_GIRA }); K.em(vent, -1.15, 0.82, -1.95, "ventilador"); E.permite(vent, mesa);
  const aspas = vent.getObjectByName('aspas'); const T_VL = 0.15, T_VD = tt("1:Mas");
  if (aspas) { const r0 = aspas.rotation.clone(); E.cada(t => { const k = t < T_VL ? 0 : t < T_VD ? (t - T_VL) * 28 : (T_VD - T_VL) * 28; aspas.rotation.copy(r0); aspas.rotateOnAxis(new T.Vector3(...VENT_EIXO), k); }); }

  // ================================================================= PERSONAGEM
  const m = E.mascote({ pos: [-0.35, 0, -1.9], rotY: -0.55 });
  E.vira(m, 0.9, 0.0, 0.4);

  // ================================================================= CIRCUITO DO GÁS (canos de cobre)
  const COBRE = 0xc8794a, ZC = -2.68;
  // serpentina da evaporadora (zigue-zague dentro da caixa da parede)
  const serpE = fio([[-0.78, 2.25, ZC], [0.05, 2.25, ZC], [0.05, 2.17, ZC], [-0.78, 2.17, ZC], [-0.78, 2.09, ZC], [0.05, 2.09, ZC], [0.05, 2.02, ZC], [-0.85, 2.02, ZC]], 0.013, COBRE, { metal: 0.6, rug: 0.35, cresce: ["1:passa", "1:quarto#2>"], raioCanto: 0.035, nome: 'serpentina da evaporadora' });
  // linha de sucção (gás) — da serpentina até o compressor lá fora
  const P_SUC = [[-0.85, 2.02, ZC], [-0.97, 2.02, ZC], [-0.97, 2.44, -2.7], [1.52, 2.44, -2.7], [1.52, 0.8, -2.7], [2.72, 0.8, -2.62], [2.72, 0.5, -2.36]];
  const suc = fio(P_SUC, 0.02, COBRE, { metal: 0.6, rug: 0.35, cresce: ["2:ficar", ["2:Então", 0.35]], raioCanto: 0.08, nome: 'linha de gás' });
  // compressor
  const comp = new T.Group(); const compC = K.cilindro(0.11, 0.33, 0x24272b, { metal: 0.35, rug: 0.4 }); comp.add(compC);
  { const tampa = K.esfera(0.11, 0x24272b, { metal: 0.35, rug: 0.4 }); tampa.position.y = 0.22; tampa.scale.y = 0.5; compC.add(tampa); }
  K.em(comp, 2.72, 0.1, -2.3, "compressor"); E.permite(comp, laje);
  // descarga: compressor -> serpentina da condensadora
  const desc = fio([[2.66, 0.35, -2.22], [2.55, 0.5, -2.32], [2.52, 0.64, -2.38]], 0.016, COBRE, { metal: 0.6, rug: 0.35, cresce: ["3:Mas", "3:gás"], suave: true, nome: 'descarga' });
  // serpentina da condensadora (colunas verticais)
  const PS = []; { const xs = [2.52, 2.44, 2.36, 2.28, 2.2, 2.12, 2.05]; xs.forEach((x, i) => { const up = i % 2 === 0; PS.push([x, up ? 0.64 : 0.2, -2.38], [x, up ? 0.2 : 0.64, -2.38]); }); }
  const serpC = fio(PS, 0.012, COBRE, { metal: 0.6, rug: 0.35, cresce: ["3:passa", "3:fora"], raioCanto: 0.035, nome: 'serpentina da condensadora' });
  // linha de líquido: serpentina -> válvula -> quarto -> serpentina da evaporadora
  const ultS = PS[PS.length - 1];
  const liq1 = fio([ultS, [1.98, 0.2, -2.5], [1.62, 0.2, -2.6], [1.62, 0.84, -2.6]], 0.011, COBRE, { metal: 0.6, rug: 0.35, cresce: ["3:líquido#2", "3:novo>"], raioCanto: 0.06 });
  const liq2 = fio([[1.62, 1.02, -2.6], [1.62, 2.36, -2.6], [-0.9, 2.36, -2.6], [-0.9, 2.25, ZC], [-0.78, 2.25, ZC]], 0.011, COBRE, { metal: 0.6, rug: 0.35, cresce: ["4:gela", "4:hora>"], raioCanto: 0.06 });
  // válvula de expansão (latão) com o "furinho"
  const valv = new T.Group(); { const c = K.cilindro(0.032, 0.18, 0xc9a23a, { metal: 0.7, rug: 0.3 }); valv.add(c); const a = K.anel(0.034, 0.008, 0xb08a2a, { metal: 0.7 }); a.position.y = 0.09; valv.add(a);
    const cab = K.cilindro(0.02, 0.06, 0xb08a2a, { metal: 0.7 }); cab.rotation.z = PI / 2; cab.position.set(0.05, 0.1, 0); valv.add(cab); }
  K.em(valv, 1.62, 0.84, -2.6, "válvula de expansão"); valv.traverse(x => x.userData.semColisao = true);
  // caixa da condensadora (aparece no "Essa é a condensadora")
  const CX = 2.45, CZ = -2.25, CW = 0.86, CH = 0.62, CD = 0.36, CY = 0.1;
  const casca = new T.Group(); { const cor = 0xf2f2ef, ap = (w, h, d, x, y, z) => { const b = K.caixa(w, h, d, cor, { rug: 0.5 }); b.position.set(x, y, z); casca.add(b); return b; };
    ap(CW, 0.02, CD, 0, CH - 0.02, 0); ap(0.02, CH, CD, -CW / 2 + 0.01, 0, 0); ap(0.02, CH, CD, CW / 2 - 0.01, 0, 0); ap(CW, CH, 0.02, 0, 0, -CD / 2 + 0.01);
    ap(0.3, CH, 0.02, CW / 2 - 0.15, 0, CD / 2 - 0.01); ap(CW - 0.3, 0.06, 0.02, -0.15, 0, CD / 2 - 0.01); ap(CW - 0.3, 0.06, 0.02, -0.15, CH - 0.06, CD / 2 - 0.01);
    const gr = K.anel(0.23, 0.012, 0x3a3d42); gr.rotation.x = 0; gr.children[0].rotation.x = 0; gr.position.set(-0.15, CH / 2, CD / 2 - 0.005); gr.children[0].position.y = 0; casca.add(gr);
    for (const dy of [-0.15, -0.075, 0, 0.075, 0.15]) { const g = K.caixa(0.44, 0.006, 0.006, 0x3a3d42); g.position.set(-0.15, CH / 2 + dy - 0.003, CD / 2); casca.add(g); } }
  K.em(casca, CX, CY, CZ, "condensadora"); E.permite(casca, [comp, laje]); E.permite(comp, casca);
  // hélice da condensadora
  const helice = new T.Group(), heliR = new T.Group(); helice.add(heliR); for (let i = 0; i < 3; i++) { const p = K.caixa(0.075, 0.2, 0.012, 0x2b2d31); const h = new T.Group(); h.add(p); h.rotation.z = i * 2 * PI / 3; heliR.add(h); }
  { const cub = K.cilindro(0.04, 0.05, 0x1d1f22); cub.rotation.x = PI / 2; heliR.add(cub); }
  helice.traverse(x => x.userData.semColisao = true); K.em(helice, CX - 0.15, CY + CH / 2, CZ + 0.1);
  const T_HL = tt("3:ventilador"); E.cada(t => { heliR.rotation.z = t < T_HL ? 0 : -(t - T_HL) * 14; });
  // aletas e ventilador da evaporadora (dentro da caixa)
  const aletas = new T.Group(); for (let i = 0; i < 20; i++) { const a = K.caixa(0.004, 0.27, 0.09, 0xb9c3cc, { metal: 0.6, rug: 0.3 }); a.position.set(-0.78 + i * 0.043, 0, 0); aletas.add(a); }
  aletas.traverse(x => x.userData.semColisao = true); K.em(aletas, 0, 1.99, ZC);
  const rolo = K.cilindro(0.04, 0.8, 0x3a6f9a, { rug: 0.5 }); rolo.rotation.z = PI / 2; const roloG = new T.Group(); roloG.add(rolo); roloG.traverse(x => x.userData.semColisao = true); K.em(roloG, -0.36, 1.985, -2.58);
  { const T_RL = tt("4:ventilador"); E.cada(t => { rolo.rotation.x = t < T_RL ? 0 : (t - T_RL) * 20; }); }
  // a evaporadora (modelo) — aparece no "Essa é a evaporadora"
  const evap = await E.modelo('evaporadora.glb', { comprimento: 1.05 }); const ED = evap.userData.dim;
  K.em(evap, -0.36, 1.93, ZB + ED.z / 2 + 0.005, "evaporadora"); E.permite(evap, fundo); E.fixo(evap);

  // ================================================================= AR QUENTE / FRIO NO QUARTO
  const ROOM = { x0: -2.9, x1: 1.1, y0: 0.3, y1: 2.4, z0: -2.6, z1: -0.6 };
  const pontoSala = s => [lerp(ROOM.x0, ROOM.x1, s[0]), lerp(ROOM.y0, ROOM.y1, s[1]), lerp(ROOM.z0, ROOM.z1, s[2])];
  // calor parado no quarto até o frio chegar
  const T_LEVA = tt("1:leva"), T_FRIO = tt("4:sopra");
  E.particulas({ n: 70, raio: 0.022, cores: [0xff7a2a, 0xffa23a, 0xff5a2a], op: 0.85, de: 0, ate: T_FRIO + 1.6, fin: 0.1, fout: 1.2, seed: 5, pos: (i, tau, s, amb) => {
    const t = tau; let p = pontoSala(s); p = [p[0] + Math.sin(t * 0.9 + i) * 0.08, p[1] + Math.sin(t * 0.7 + i * 2) * 0.06, p[2] + Math.cos(t * 0.8 + i) * 0.08];
    if (t > T_LEVA && t < T_LEVA + 2.6 && i % 2 === 0) { const k = sm((t - T_LEVA) / 1.6); const alvo = [lerp(-0.78, 0.05, s[3]), 2.14, ZC + 0.12]; p = [lerp(p[0], alvo[0], k), lerp(p[1], alvo[1], k), lerp(p[2], alvo[2], k)]; if (k >= 0.99) return null; }
    if (t >= T_LEVA + 2.6 && i % 2 === 0 && t < tt("2:ficar")) return null;
    return [...p, amb * 0.9]; } });
  // frio saindo da evaporadora e tomando o quarto
  E.particulas({ n: 90, raio: 0.02, cores: [0x5ab8ff, 0x8fd3ff, 0x2f7fe0], op: 0.9, de: T_FRIO, ate: tt("6:fim"), fin: 0.3, fout: 0.5, seed: 9, pos: (i, tau, s, amb) => {
    const L = 2.4, k = ((tau * 0.55 + s[0] * L) % L) / L, x = lerp(-0.75, 0.05, s[1]) + (s[2] - 0.5) * k * 1.6, y = 1.95 - k * 1.5 + Math.sin(tau * 2 + i) * 0.03, z = -2.5 + k * 2.2;
    if (tau * 0.55 < s[0] * 0) return null; const frente = Math.min(1, tau * 0.6); if (k > frente) return null; return [x, y, z, amb * (1 - k * 0.4)]; } });

  // ================================================================= BLOCO 1 — ventilador no calor de 40 °C
  // vento quente do ventilador na cara do personagem
  E.particulas({ n: 70, raio: 0.02, cores: [0xff8a2a, 0xffb03a, 0xff5a2a], de: 0.2, ate: tt("1:Mas"), fin: 0.3, fout: 0.3, seed: 11, pos: (i, tau, s, amb) => {
    const L = 0.95, k = ((tau * 1.4 + s[0] * L) % L) / L, ab = 0.05 + k * 0.18; return [-0.98 + k * 0.62, 1.08 + k * 0.38 + (s[1] - 0.5) * ab, -1.95 + (s[2] - 0.5) * ab * 1.6, amb]; } });
  E.vento(0.3, tt("1:Mas"), { area: { x0: -0.95, x1: -0.3, y0: 1.05, y1: 1.5, z0: -2.1, z1: -1.75 }, vel: 2.2, n: 14, comp: 0.18 });
  E.som('vento', 0.15, 0.35, T_VD - 0.15);
  E.nota("40 °C", [-1.15, 2.02, ZB + 0.05], "1:quarenta", "1:Porque");
  E.errado(vent, "1:frio", "1:Porque", { x: [-1.15, 1.55, -1.9] });
  E.nota("VENTO DE FORNO", [-0.75, 1.55, -1.8], "1:vento", "1:Porque");
  // porque: o ventilador só faz o mesmo ar quente girar no quarto
  E.particulas({ n: 60, raio: 0.026, cores: [0xff7a2a, 0xffa23a], de: "1:Porque", ate: ["1:Mas", 0.2], fin: 0.3, fout: 0.3, seed: 13, pos: (i, tau, s, amb) => {
    const a = tau * 1.6 + s[0] * 6.283; return [-0.85 + Math.cos(a) * 1.2, 1.15 + Math.sin(a) * 0.55 * (0.6 + s[1] * 0.4), -1.7 + Math.sin(a) * 0.5 + (s[2] - 0.5) * 0.2, amb]; } });
  E.nota("SÓ MEXE O AR", [-1.7, 1.6, -1.3], "1:mexe", "1:Mas");
  E.nota("CALOR FICA", [-0.3, 2.0, -1.7], "1:calor", "1:Mas");
  E.rebobina(vent, "1:Mas", ["1:Mas", 0.75]);
  // suor que seca e gela a pele
  const HX = -0.35, HY = 1.5, HZ = -1.9;
  E.particulas({ n: 14, raio: 0.018, cor: 0x3fa8ff, de: "1:suor", ate: "1:Então", fin: 0.2, fout: 0.3, seed: 17, pos: (i, tau, s, amb) => {
    const a = -1.2 + s[0] * 2.4, y = HY - 0.05 + s[1] * 0.12 - tau * 0.05; return [HX + Math.sin(a) * 0.215, y, HZ + Math.cos(a) * 0.215, amb * Math.max(0, 1 - tau / 2.2)]; } });
  E.particulas({ n: 26, raio: 0.02, cores: [0xffffff, 0xff8a2a], op: 0.8, de: "1:seca", ate: "1:Então", fin: 0.2, fout: 0.3, seed: 19, pos: (i, tau, s, amb) => {
    const k = (tau * 0.6 + s[0]) % 1, a = -1.2 + s[1] * 2.4; return [HX + Math.sin(a) * (0.23 + k * 0.1), HY + 0.05 + k * 0.6, HZ + Math.cos(a) * (0.23 + k * 0.1), amb * (1 - k)]; } });
  E.nota("SUOR SECA = GELA", [HX, HY + 0.42, HZ + 0.1], "1:suor", "1:Então", { cor: '#2F6FE0' });
  E.nota("ROUBAR O CALOR", [-0.9, 2.1, -1.7], "1:roubar", "1:suor");
  // então: um cano no quarto com um líquido que ferve mesmo gelado
  corrente(serpE, "1:líquido", "2:Mas", { cor: 0x3fa8ff, n: 60, vel: 0.9, raio: 0.016, cresce: 1.2 });
  E.particulas({ n: 40, raio: 0.012, cor: 0xffffff, op: 0.9, de: "1:ferve", ate: "2:Mas", fin: 0.2, fout: 0.3, seed: 23, pos: (i, tau, s, amb) => {
    const cv = serpE.userData.curva, u = s[0], p = cv.getPointAt(u), k = (tau * 1.8 + s[1]) % 1; return [p.x + (s[2] - 0.5) * 0.02, p.y + k * 0.05, p.z + 0.012 + k * 0.03, amb * (1 - k)]; } });
  E.nota("FERVE GELADO", [-0.35, 2.36, -2.55], "1:ferve", "1:Ele", { cor: '#2F6FE0' });
  E.nota("LEVA O CALOR", [0.35, 1.85, -2.4], "1:leva", "1:Esse");
  E.rotulo("FLUIDO REFRIGERANTE", [-0.36, 2.42, -2.6], "1:Esse", "2:Mas");
  E.destaca(serpE, "1:fluido", ["1:fluido", 1.0]);

  // ================================================================= BLOCO 2 — gás quente sai; compressor espreme
  aquece(serpE, "2:gás", "3:Mas", { forca: 0.55, sobe: 0.6 });
  corrente(serpE, "2:Mas", ["2:Então", 0.3], { cor: 0xff7a2a, n: 50, vel: 1.1, raio: 0.016, seed: 3 });
  corrente(suc, "2:ficar", "6:fim", { cor: 0xff8a3a, n: 120, vel: 1.4, raio: 0.018, cresce: 2.2, seed: 4 });
  E.nota("GÁS QUENTE", [0.45, 2.15, -2.45], "2:gás", "2:ficar");
  E.nota("NÃO PODE FICAR AQUI", [0.1, 1.5, -1.8], "2:não", "2:Então");
  // personagem sai pela porta até o quintal
  E.anda(m, ["2:e", 0.0], ["2:ficar", 0.35], [0.8, -0.5]);
  E.anda(m, ["2:ficar", 0.4], ["2:Então", 0.0], [1.95, -0.5]);
  E.anda(m, ["2:Então", 0.05], ["2:coloca", 0.3], [2.0, -1.55], { vira: 0.35 });
  // o motor aparece e espreme o gás
  E.entra(comp, "2:motor", { modo: 'cai' });
  const T_ESP = tt("2:espreme");
  E.cada(t => { const on = (t >= T_ESP && t < tt("3:Mas")) ? 1 : (t >= tt("6:Mas") ? 0 : (t >= tt("3:Mas") ? 0.35 : 0)); const extra = t >= tt("2:É#3") && t < tt("3:Mas") ? 1.8 : 1;
    compC.position.x = on ? Math.sin(t * 90) * 0.004 * extra : 0; compC.position.z = on ? Math.cos(t * 77) * 0.003 * extra : 0; });
  E.par([2.45, 0.28, -2.3], [2.99, 0.28, -2.3], 'aperto', "2:espreme", "2:Esse");
  E.particulas({ n: 40, raio: 0.016, cores: [0xff5a2a, 0xff8a2a], de: "2:espreme", ate: "2:Esse", fin: 0.3, fout: 0.3, seed: 29, pos: (i, tau, s, amb) => {
    const r = 0.17 * Math.max(0.35, 1 - tau / 2.6), a = s[0] * 6.283 + tau * 2; return [2.72 + Math.cos(a) * r * s[1], 0.2 + s[2] * 0.25, -2.3 + Math.sin(a) * r * s[1], amb]; } });
  const T_Q0 = tt("2:espreme"), T_Q1 = tt("2:rua");
  const termoGas = visor(0.4, 0.15, t => t < T_Q0 ? -1 : Math.round(lerp(40, 70, sm((t - T_Q0) / (T_Q1 - T_Q0)))), (x, W, Hh, v) => { if (v < 0) return;
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(3, 3, W - 6, Hh - 6, Hh / 2 - 3); x.fill(); x.fillStyle = v > 55 ? '#e5483a' : '#f0a020'; x.font = `bold ${Hh * 0.55}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GÁS ' + v + ' °C', W / 2, Hh / 2 + 2); }, { transp: true });
  termoGas.position.set(2.75, 0.95, -2.2); E.scene.add(termoGas); E.cada(t => { termoGas.visible = t >= T_Q0 && t < tt("3:Então"); });
  E.nota("RUA 40 °C", [2.2, 1.18, -2.2], "2:rua", "3:Então");
  E.rotulo("COMPRESSOR", comp, "2:Esse#3", "2:É#3", [0, 0.55, 0]);
  // barulho
  const ondas = [0, 1, 2].map(i => { const a = K.anel(0.2, 0.008, 0xffffff); a.traverse(x => x.userData.semColisao = true); a.children[0].material = a.children[0].material.clone(); K.em(a, 2.72, 0.32, -2.3); const t0 = tt("2:É#3") + i * 0.4, t1 = tt("3:Mas");
    E.cada(t => { const k = ((t - t0) % 1.2) / 1.2; a.visible = t >= t0 && t < t1; a.scale.setScalar(1 + k * 2.5); a.children[0].material.opacity = 1 - k; a.children[0].material.transparent = true; }); return a; });
  E.nota("BARULHO", [3.05, 0.95, -2.2], "2:barulho", "3:Mas");
  E.som('motor', "2:espreme", 0.7, tt("3:Mas") - tt("2:espreme"));

  // ================================================================= BLOCO 3 — serpentina, hélice, vira líquido
  corrente(desc, "3:gás", "6:fim", { cor: 0xff5a2a, n: 14, vel: 0.8, raio: 0.017, seed: 31 });
  E.nota("AINDA É GÁS", [2.55, 0.95, -2.3], "3:ainda", "3:Então");
  E.acelera("3:passa", "3:fora>");
  corrente(serpC, "3:fora", "6:fim", { cor: 0xff7a2a, n: 70, vel: 0.7, raio: 0.016, seed: 33, ativo: t => 1 });
  aquece(serpC, "3:fora", "3:perde", { forca: 0.6 });
  E.entra(helice, "3:ventilador", { modo: 'pop', inspeciona: false });
  // vento soprando pela serpentina, levando o calor para fora
  E.particulas({ n: 60, raio: 0.02, cores: [0xff8a2a, 0xffb03a, 0xffffff], de: "3:soprando", ate: "6:fim", fin: 0.4, fout: 0.4, seed: 37, pos: (i, tau, s, amb) => {
    const L = 1.1, k = ((tau * 1.3 + s[0] * L) % L) / L, a = s[1] * 6.283, r = 0.2 * Math.sqrt(s[2]); return [CX - 0.15 + Math.cos(a) * r * (1 + k), CY + CH / 2 + Math.sin(a) * r * (1 + k), CZ + 0.2 + k * 0.9, amb * (1 - k)]; } });
  E.nota("O CALOR SAI", [CX - 0.15, CY + CH + 0.35, CZ + 0.3], "3:perde", "3:Essa");
  // vira líquido: bolinhas azuis no fim da serpentina e na linha de líquido
  corrente(liq1, "3:vira", "6:fim", { cor: 0x3fa8ff, n: 18, vel: 0.5, raio: 0.014, seed: 41 });
  E.nota("VIROU LÍQUIDO", [1.8, 0.95, -2.4], "3:líquido#2", "3:Essa", { cor: '#2F6FE0' });
  // assopra o café
  const cafe = (() => { const g = new T.Group(); const x = K.cilindro(0.04, 0.08, 0xffffff, { rug: 0.4, rTopo: 0.045 }); g.add(x); const c = K.cilindro(0.04, 0.005, 0x4a2a12); c.position.y = 0.072; g.add(c); return g; })();
  E.segura(m, cafe, 'direita', { pos: [0, -0.09, 0.05] }); E.janelas(cafe, [["3:como", "3:Ele#2"]]);
  E.particulas({ n: 16, raio: 0.014, cor: 0xffffff, op: 0.7, de: "3:assopra", ate: "3:Ele#2", fin: 0.2, fout: 0.2, seed: 43, pos: (i, tau, s, amb) => { const v = new T.Vector3(); cafe.getWorldPosition(v); const k = (tau * 0.9 + s[0]) % 1; return [v.x + (s[1] - 0.5) * 0.05 + k * 0.08, v.y + 0.1 + k * 0.25, v.z + (s[2] - 0.5) * 0.05, amb * (1 - k)]; } });
  // casca da condensadora
  E.entra(casca, "3:Essa", { modo: 'surge', dur: 0.5, inspeciona: false });
  E.raioX(casca, ["3:condensadora", 0.6], "6:fim", 0.28);
  E.rotulo("CONDENSADORA", casca, "3:condensadora", "3:É#4", [0, 0.85, 0]);
  E.anda(m, ["3:condensadora>", 0.05], ["3:sai", 0.0], [3.2, -1.2], { vira: 0.6 });
  // vizinho: condensadora no muro soprando vento quente
  const viz = new T.Group(); { const c = K.caixa(0.34, 0.55, 0.78, 0xeeeeea, { rug: 0.5 }); viz.add(c); const gr = K.anel(0.2, 0.012, 0x3a3d42); gr.children[0].rotation.set(0, PI / 2, 0); gr.position.set(-0.175, 0.27, -0.12); viz.add(gr);
    const sup = K.caixa(0.5, 0.04, 0.04, 0x8a8f94, { metal: 0.5 }); sup.position.set(0.1, -0.04, 0.3); viz.add(sup); const sup2 = sup.clone(); sup2.position.z = -0.3; viz.add(sup2); }
  viz.traverse(x => x.userData.semColisao = true); K.em(viz, 4.1, 1.35, -1.25, "condensadora do vizinho"); E.fixo(viz);
  E.particulas({ n: 50, raio: 0.022, cores: [0xff7a2a, 0xffb03a, 0xff5a2a], de: "3:É#4", ate: "4:Então", fin: 0.3, fout: 0.4, seed: 47, pos: (i, tau, s, amb) => {
    const L = 0.9, k = ((tau * 1.2 + s[0] * L) % L) / L, a = s[1] * 6.283, r = 0.18 * Math.sqrt(s[2]); return [3.92 - k * 0.85, 1.62 + Math.sin(a) * r * (1 + k) - k * 0.1, -1.37 + Math.cos(a) * r * (1 + k), amb * (1 - k * 0.6)]; } });
  E.vento("3:vento", "4:Então", { area: { x0: 3.0, x1: 3.9, y0: 1.35, y1: 1.85, z0: -1.55, z1: -1.15 }, vel: -2.2, n: 10, comp: 0.18 });
  E.nota("VENTO QUENTE", [3.6, 2.15, -1.3], "3:vento", "4:Mas");

  // ================================================================= BLOCO 4 — válvula de expansão e evaporadora
  E.anda(m, ["4:Mas", 0.05], ["4:apertado", 0.2], [2.35, -1.6], { vira: -0.2 });
  E.nota("APERTADO DEMAIS", [1.95, 1.2, -2.45], "4:apertado", "4:Então");
  E.entra(valv, "4:furinho", { modo: 'pop', inspeciona: false });
  // o "furinho": bolinhas passando uma a uma e saindo geladas
  corrente(liq2, "4:gela", "6:fim", { cor: 0x9fdcff, n: 90, vel: 1.1, raio: 0.013, cresce: 1.2, seed: 53 });
  E.particulas({ n: 30, raio: 0.012, cor: 0xffffff, op: 0.9, de: "4:gela", ate: "4:Essa", fin: 0.2, fout: 0.3, seed: 59, pos: (i, tau, s, amb) => { const y = 1.0 + s[0] * 1.2; if (y > 1.0 + tau * 1.4) return null; const a = s[1] * 6.283;
    return [1.62 + Math.cos(a) * 0.018, y, -2.6 + Math.sin(a) * 0.018, amb * (0.6 + 0.4 * Math.sin(tau * 9 + i))]; } });
  pinta(liq2, "4:gela", "6:fim", 0xbfe8ff, { sobe: 0.4, brilho: 0.25, forca: 0.85 });
  const T_P0 = tt("4:despenca"), T_P1 = tt("4:despenca>") + 0.3;
  const mano = visor(0.32, 0.32, t => { if (t < tt("4:furinho")) return -1; const k = t < T_P0 ? 0.88 : t < T_P1 ? lerp(0.88, 0.12, sm((t - T_P0) / (T_P1 - T_P0))) : 0.12; return Math.round(k * 40) / 40; }, (x, W, Hh, v) => { if (v < 0) return;
    const c = W / 2; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(c, c, c - 4, 0, 2 * PI); x.fill(); x.lineWidth = 8; x.strokeStyle = '#2b2d31'; x.stroke();
    x.lineWidth = 14; x.strokeStyle = '#2bb24c'; x.beginPath(); x.arc(c, c, c - 26, PI * 0.75, PI * 1.25); x.stroke(); x.strokeStyle = '#e5483a'; x.beginPath(); x.arc(c, c, c - 26, PI * 1.75, PI * 2.25); x.stroke();
    const a = PI * 0.75 + v * PI * 1.5; x.strokeStyle = '#1d1f22'; x.lineWidth = 9; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(a) * (c - 34), c + Math.sin(a) * (c - 34)); x.stroke();
    x.fillStyle = '#1d1f22'; x.font = `bold ${W * 0.11}px ${FONTE}`; x.textAlign = 'center'; x.fillText('PRESSÃO', c, Hh * 0.8); }, { transp: true, px: 256 });
  mano.position.set(1.95, 1.0, -2.45); E.scene.add(mano); E.cada(t => { mano.visible = t >= tt("4:furinho") && t < tt("4:Mas#2"); });
  E.nota("GELA NA HORA", [1.9, 1.62, -2.45], "4:gela", "4:Essa", { cor: '#2F6FE0' });
  // spray que gela a lata
  const lata = (() => { const g = new T.Group(); g.add(K.cilindro(0.035, 0.16, 0xe5483a, { metal: 0.4, rug: 0.35 })); const b = K.cilindro(0.012, 0.025, 0xffffff); b.position.y = 0.16; g.add(b); return g; })();
  E.segura(m, lata, 'direita', { pos: [0, -0.12, 0.04] }); E.janelas(lata, [["4:como", ["4:Essa", 0.2]]]);
  E.particulas({ n: 30, raio: 0.016, cor: 0xffffff, op: 0.8, de: "4:spray", ate: ["4:Essa", 0.2], fin: 0.1, fout: 0.2, seed: 61, pos: (i, tau, s, amb) => { const v = new T.Vector3(); lata.getWorldPosition(v); const k = (tau * 2.2 + s[0]) % 1; return [v.x + 0.05 + k * 0.4, v.y + 0.17 + (s[1] - 0.5) * k * 0.15, v.z + (s[2] - 0.5) * k * 0.15, amb * (1 - k)]; } });
  E.rotulo("VÁLVULA DE EXPANSÃO", valv, "4:Essa", "4:Mas#2", [0.05, 0.42, 0.1]);
  // volta para dentro do quarto
  E.anda(m, ["4:Mas#2", 0.05], ["4:precisa", 0.35], [1.95, -0.5]);
  E.anda(m, ["4:precisa", 0.4], ["4:ar", 0.1], [0.8, -0.5]);
  E.anda(m, ["4:ar", 0.15], ["4:Então#2", 0.1], [0.3, -1.7], { vira: 0.0 });
  E.entra(aletas, "4:aletas", { modo: 'cresce', inspeciona: false }); E.entra(roloG, "4:ventilador", { modo: 'pop', inspeciona: false });
  E.entra(evap, "4:Essa#2", { modo: 'surge', dur: 0.45 });
  E.raioX(evap, ["4:evaporadora", 0.9], "5:Esse", 0.25);
  E.rotulo("EVAPORADORA", evap, "4:Essa#2", "5:Mas", [0, 0.35, 0.2]);
  E.vento("4:sopra", "4:evaporadora>", { area: { x0: -0.7, x1: 0.1, y0: 1.5, y1: 1.85, z0: -2.3, z1: -1.4 }, vel: 1.5, n: 10, comp: 0.15 });

  // ================================================================= BLOCO 5 — dreno
  // umidade do ar virando gotas na serpentina
  E.particulas({ n: 40, raio: 0.016, cor: 0x2f6fe0, op: 0.85, de: "5:umidade", ate: "5:Então", fin: 0.3, fout: 0.3, seed: 67, pos: (i, tau, s, amb) => {
    const k = Math.min(1, ((tau * 0.5 + s[0]) % 1.2)); const a = [lerp(-1.2, 0.6, s[1]), lerp(1.2, 1.8, s[2]), -1.6], b = [lerp(-0.75, 0.0, s[1]), 2.05, ZC + 0.1]; if (k >= 1) return null;
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), amb]; } });
  E.nota("UMIDADE", [0.5, 1.7, -2.0], "5:umidade", "5:Então", { cor: '#2F6FE0' });
  // gotas escorrendo pela parede + mancha
  const mancha = new T.Mesh(new T.PlaneGeometry(0.9, 1.7), new T.MeshStandardMaterial({ color: 0x6b6f5a, transparent: true, opacity: 0, roughness: 1, depthWrite: false })); mancha.userData.semColisao = true;
  mancha.position.set(-0.36, 1.05, ZB + 0.004); E.scene.add(mancha);
  { const a = tt("5:escorrem"), b = tt("5:Então"); E.cada(t => { mancha.material.opacity = t < a ? 0 : t < b ? 0.35 * sm((t - a) / 1.8) : Math.max(0, 0.35 * (1 - (t - b) / 0.6)); mancha.visible = t > a && t < b + 0.6; }); }
  E.particulas({ n: 26, raio: 0.02, cor: 0x3fa8ff, de: "5:gotas", ate: "5:Então", fin: 0.2, fout: 0.2, seed: 71, pos: (i, tau, s, amb) => { const k = (tau * 0.45 + s[0]) % 1; return [lerp(-0.75, 0.05, s[1]), 1.92 - k * 1.7, ZB + 0.015, amb]; } });
  E.errado(mancha, "5:parede", "5:Então", { x: [-0.36, 1.2, ZB + 0.1] });
  // copo de refrigerante gelado suando
  const copo = (() => { const g = new T.Group(); const v = K.cilindro(0.045, 0.13, 0xd8f0ff, { op: 0.55, rug: 0.1 }); g.add(v); const r = K.cilindro(0.04, 0.1, 0x5a2a12, { op: 0.9 }); r.position.y = 0.01; g.add(r); return g; })();
  copo.traverse(x => x.userData.semColisao = true); K.em(copo, -1.15, 0.82, -1.85, "copo"); E.entra(copo, "5:copo", { modo: 'pop' });
  E.particulas({ n: 24, raio: 0.008, cor: 0x9fdcff, de: "5:refrigerante", ate: "5:Então", fin: 0.4, fout: 0.2, seed: 73, pos: (i, tau, s, amb) => { const a = s[0] * 6.283; return [-1.15 + Math.cos(a) * 0.047, 0.84 + s[1] * 0.1 - Math.max(0, tau - 0.6) * s[2] * 0.03, -1.85 + Math.sin(a) * 0.047, amb]; } });
  E.rebobina(mancha, "5:Então", ["5:Então", 0.55], { para: "5:escorrem" });
  // bandeja + mangueira até lá fora (termina acima do personagem)
  const bandeja = K.caixa(0.85, 0.03, 0.12, 0x9aa3ab, { metal: 0.4 }); bandeja.traverse(x => x.userData.semColisao = true); K.em(bandeja, -0.36, 1.955, ZC + 0.02);
  E.entra(bandeja, "5:bandeja", { modo: 'desliza', de: [0, 0, 0.3], inspeciona: false });
  const P_DR = [[0.08, 1.965, ZC + 0.02], [0.3, 1.95, -2.62], [1.3, 1.92, -2.62], [1.5, 1.9, -2.6], [1.5, 1.88, -1.15], [1.72, 1.86, -1.12]];
  const dreno = fio(P_DR, 0.013, 0xeef1f3, { rug: 0.6, cresce: ["5:mangueira", "5:fora>"], raioCanto: 0.08, nome: 'mangueira do dreno' });
  corrente(dreno, "5:levam", "6:fim", { cor: 0x3fa8ff, n: 40, vel: 0.9, raio: 0.012, seed: 79 });
  E.rotulo("DRENO", [1.55, 2.12, -1.13], "5:Esse", "5:É#4");
  E.destaca(dreno, "5:dreno", ["5:dreno", 1.0]);
  E.anda(m, ["5:mangueira", 0.0], ["5:água", 0.0], [0.8, -0.5]);
  E.anda(m, ["5:água", 0.05], ["5:Esse", 0.0], [1.95, -0.5]);
  E.anda(m, ["5:Esse", 0.05], ["5:dreno>", 0.15], [1.8, -1.12], { vira: 0.55 });
  E.gotas([1.74, 1.84, -1.12], "5:pinga", "5:fim", { alt: 0.1, n: 3, espalha: 0.01 });
  E.particulas({ n: 14, raio: 0.014, cor: 0x3fa8ff, de: "5:cabeça", ate: ["5:cabeça", 0.8], fin: 0.02, fout: 0.3, seed: 83, pos: (i, tau, s, amb) => { const a = s[0] * 6.283, v = 0.5 + s[1] * 0.6;
    return [1.76 + Math.cos(a) * v * tau, 1.76 + 1.2 * tau - 4.9 * tau * tau, -1.1 + Math.sin(a) * v * tau, amb]; } });
  E.nota("PINGA!", [2.15, 2.05, -1.0], "5:pinga", "5:fim", { cor: '#2F6FE0' });

  // ================================================================= BLOCO 6 — inverter, controle, parabéns
  // liga/desliga no máximo
  const ciclo = t => { const a = tt("6:Mas"), b = tt("6:Então"), c = tt("6:girar"), d = tt("6:temperatura>");
    if (t < a) return t >= tt("3:Mas") ? 1 : 0; if (t < b) return (Math.floor((t - a) / 0.55) % 2 === 0) ? 1 : 0; if (t < c) return 1; if (t < d) return lerp(1, 0.4, sm((t - c) / (d - c))); return 0.4; };
  E.cada(t => { if (t < tt("6:Mas")) return; const k = ciclo(t); compC.position.x = k > 0.05 ? Math.sin(t * 90) * 0.005 * k : 0; compC.position.z = k > 0.05 ? Math.cos(t * 77) * 0.004 * k : 0; });
  const vel = visor(0.38, 0.15, t => t < tt("6:Mas") ? -1 : Math.round(ciclo(t) * 100), (x, W, Hh, v) => { if (v < 0) return;
    x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(3, 3, W - 6, Hh - 6, Hh / 2 - 3); x.fill(); x.fillStyle = v > 80 ? '#e5483a' : v < 5 ? '#7a7f86' : '#2bb24c'; x.font = `bold ${Hh * 0.55}px ${FONTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MOTOR ' + v + '%', W / 2, Hh / 2 + 2); }, { transp: true });
  vel.position.set(2.1, 1.0, -2.2); E.scene.add(vel); E.cada(t => { vel.visible = t >= tt("6:Mas") && t < tt("6:Coloque"); });
  const T_C0 = tt("6:conta"), T_C1 = tt("6:Então"), T_C2 = tt("6:girar"), T_C3 = tt("6:inverter");
  const conta = visor(0.56, 0.26, t => { if (t < T_C0) return -1; if (t < T_C1) return Math.round(lerp(0.3, 1, sm((t - T_C0) / (T_C1 - T_C0))) * 40) / 40; if (t < T_C2) return 1; if (t < T_C3) return Math.round(lerp(1, 0.45, sm((t - T_C2) / (T_C3 - T_C2))) * 40) / 40; return 0.45; },
    (x, W, Hh, v) => { if (v < 0) return; x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(3, 3, W - 6, Hh - 6, 18); x.fill(); x.lineWidth = 5; x.strokeStyle = '#2b2d31'; x.stroke();
      x.fillStyle = '#2b2d31'; x.font = `bold ${Hh * 0.18}px ${FONTE}`; x.textAlign = 'left'; x.fillText('CONTA DE LUZ', 18, Hh * 0.28); x.font = `bold ${Hh * 0.4}px ${FONTE}`; x.fillText('R$', 18, Hh * 0.78);
      const bx = W * 0.3, bw = W * 0.64 * v; x.fillStyle = '#e6e6e6'; x.fillRect(bx, Hh * 0.45, W * 0.64, Hh * 0.35); x.fillStyle = v > 0.7 ? '#e5483a' : '#2bb24c'; x.fillRect(bx, Hh * 0.45, bw, Hh * 0.35); }, { transp: true });
  conta.position.set(2.25, 1.35, -2.2); E.scene.add(conta); E.cada(t => { conta.visible = t >= T_C0 && t < tt("6:Coloque"); });
  E.nota("LIGA E DESLIGA", [2.6, 1.0, -1.95], "6:liga", "6:conta");
  E.nota("QUARTO 22 °C", [2.05, 1.85, -2.0], "6:quarto", "6:Esse", { cor: '#2BB24C' });
  E.certo([2.3, 1.62, -2.0], "6:temperatura");
  E.rotulo("INVERTER", comp, "6:Esse", "6:Coloque", [0, 0.6, 0.1]);
  // volta para dentro: controle, pilhas, briga 18 x 23
  E.anda(m, ["6:Coloque", -0.25], ["6:controle", 0.0], [1.95, -0.5]);
  E.anda(m, ["6:controle", 0.05], ["6:duas", 0.0], [0.8, -0.5]);
  E.anda(m, ["6:duas", 0.05], ["6:briga", -0.1], [0.3, -1.7], { vira: 0.0 });
  const ctrl = await E.modelo('controle.glb', { comprimento: 0.16 }); ctrl.userData._cx = [];
  E.segura(m, ctrl, 'direita', { pos: [0, -0.08, 0.04], rot: [PI / 2, 0, 0] }); E.janelas(ctrl, [["6:controle", "6:fim"]]);
  const pilhas = [0, 1].map(i => { const p = K.cilindro(0.012, 0.05, 0x2b2d31); const g = new T.Group(); g.add(p); const c = K.cilindro(0.0125, 0.02, 0xd9a520); c.position.y = 0.035; g.add(c); g.traverse(x => x.userData.semColisao = true);
    K.em(g, 0.48 + i * 0.05, 1.25, -1.3); E.janelas(g, [[["6:pilhas", i * 0.12], "6:briga"]]); return g; });
  E.nota("18 °C", [-0.75, 1.95, -1.6], "6:dezoito", "6:Agora", { cor: '#2F6FE0' });
  E.nota("23 °C", [0.45, 2.05, -1.6], "6:vinte", "6:Agora", { cor: '#E5483A' });
  E.nota("BRIGA", [0.1, 2.25, -1.6], "6:briga", "6:Agora");
  // aperta o botão: bip, frio e check
  E.som('ding', "6:botão", 0.8); E.certo([-0.36, 2.5, -2.4], "6:botão");
  E.oculos(m, "6:Parabéns");
  E.confete([0.2, 2.4, -1.2], "6:Parabéns");
  E.cta("FRIGORISTA", "VENTILADOR", "6:Se#2");
  E.confete([0.2, 2.6, -1.0], "6:frigorista"); E.confete([-0.6, 2.4, -1.6], "6:ventilador");

  // ================================================================= ATUAÇÃO DO BILLY — participa, mexe nas peças, reage; comemora só no "Parabéns"
  KM.push(
    [0, 'press', 0.15], [0.9, 'calor', 0.4], ["1:quarenta", 'abana', 0.3], ["1:frio", 'shrug', 0.3], ["1:vento", 'calor', 0.25], ["1:cara", 'abana', 0.3],
    ["1:Porque", 'explica', 0.3], ["1:tira", 'hatUp', 0.3], ["1:Mas", 'calor', 0.3], ["1:esfriar", 'explica', 0.3], ["1:suor", 'calor', 0.3], ["1:gela", 'abana', 0.3],
    ["1:Então", 'explica', 0.3], ["1:cano", 'aponta', 0.3], ["1:ferve", 'explica', 0.3], ["1:leva", 'aponta', 0.3], ["1:Esse", 'aponta', 0.25], ["1:refrigerante>", 'joinha', 0.3],
    ["2:Mas", 'explica', 0.3], ["2:motor", 'mexe', 0.3], ["2:gás#2", 'explica', 0.3], ["2:Esse#3", 'aponta', 0.3], ["2:É#3", 'worried', 0.3], ["2:barulho", 'shrug', 0.3],
    ["3:Mas", 'explica', 0.3], ["3:passa", 'mexe', 0.3], ["3:ventilador", 'aponta', 0.3], ["3:como", 'idle', 0.25], ["3:assopra", 'blow', 0.25], ["3:Ele#2", 'explica', 0.3],
    ["3:Essa", 'aponta', 0.3], ["3:vento", 'abana', 0.3], ["3:vizinho", 'hatUp', 0.3],
    ["4:apertado", 'explica', 0.3], ["4:Então", 'mexe', 0.3], ["4:A", 'explica', 0.3], ["4:gela", 'frio', 0.3], ["4:como", 'idle', 0.25], ["4:spray", 'press', 0.25],
    ["4:Essa", 'aponta', 0.3], ["4:Então#2", 'explica', 0.3], ["4:canos", 'aponta', 0.3], ["4:ventilador", 'explica', 0.3], ["4:sopra", 'joinha', 0.3], ["4:Essa#2", 'aponta', 0.3],
    ["5:Mas", 'explica', 0.3], ["5:gotas", 'worried', 0.3], ["5:copo", 'explica', 0.3], ["5:Então", 'explica', 0.3], ["5:bandeja", 'mexe', 0.3], ["5:dreno>", 'aponta', 0.3],
    ["5:É#4", 'explica', 0.3], ["5:cabeça", 'hatUp', 0.2], ["5:fim", 'shrug', 0.3],
    ["6:Mas", 'explica', 0.3], ["6:liga", 'worried', 0.3], ["6:conta", 'hatUp', 0.3], ["6:Então", 'explica', 0.3], ["6:girar", 'aponta', 0.3], ["6:temperatura", 'joinha', 0.3], ["6:Esse", 'aponta', 0.3],
    ["6:briga", 'shrug', 0.3], ["6:vinte", 'explica', 0.3], ["6:graus>", 'idle', 0.3], ["6:apertar", 'press', 0.2], ["6:botão>", 'joinha', 0.3], ["6:Parabéns", 'cheer', 0.3],
    ["6:construiu", 'joinha', 0.3], ["6:Se#2", 'explica', 0.3], ["6:frigorista", 'joinha', 0.3], ["6:Se#3", 'explica', 0.3], ["6:ventilador", 'joinha', 0.3]);
  // vira para a peça quando mexe nela/aponta, e volta para a câmera
  E.vira(m, ["2:motor", -0.1], 0.9); E.vira(m, ["2:gás#2", -0.1], 0.35);
  E.vira(m, ["3:passa", -0.1], 0.8); E.vira(m, ["3:ventilador>", 0.2], 0.35);
  E.vira(m, ["4:Então", -0.1], -2.3); E.vira(m, ["4:A", 0.0], -0.2);
  E.vira(m, ["5:bandeja", -0.1], -2.6); E.vira(m, ["5:água", -0.3], 0.0);

  // ================================================================= CÂMERA — "segura e pula"
  // bloco 1
  E.camera(0, [-0.6, 1.4, 0.9], [-0.75, 1.15, -1.95], 52);
  E.plano(["1:vento", -0.3], [-0.7, 1.45, 0.75], [-0.75, 1.3, -1.95], 50, { dur: 0.4 });
  E.corte("1:Porque", [0.7, 2.5, 1.7], [-0.85, 1.05, -1.7], 56);
  E.plano(["1:calor", -0.3], [0.3, 2.0, 0.9], [-0.7, 1.2, -1.9], 54, { dur: 0.45 });
  E.corte("1:Mas", [-0.45, 1.55, 0.6], [-0.6, 1.35, -1.95], 50);
  E.plano(["1:alguma", -0.2], [-0.2, 1.5, 0.5], [-0.45, 1.35, -1.9], 48, { dur: 0.4 });
  E.plano(["1:suor", -0.3], [-0.3, 1.55, 0.0], [-0.35, 1.4, -1.9], 44, { dur: 0.4 });
  E.plano(["1:Então", -0.1], [-0.15, 1.75, 0.35], [-0.35, 1.8, -2.6], 52, { dur: 0.45 });
  E.plano(["1:ferve", -0.3], [-0.3, 2.05, -1.15], [-0.36, 2.12, -2.7], 46, { dur: 0.4 });
  E.plano(["1:leva", -0.2], [-0.1, 1.8, 0.5], [-0.35, 1.75, -2.6], 52, { dur: 0.45 });
  // bloco 2
  E.plano(["2:gás", -0.3], [0.35, 1.85, 0.4], [-0.15, 1.85, -2.6], 52, { dur: 0.45 });
  E.corte(["2:e", 0.0], [1.37, 1.9, 4.3], [1.05, 1.1, -1.3], 56);
  E.plano(["2:Então", 0.2], [2.3, 1.45, 1.3], [2.25, 0.75, -1.95], 52, { dur: 0.5 });
  E.plano(["2:gás#2", -0.3], [2.85, 0.95, -1.1], [2.7, 0.42, -2.3], 45, { dur: 0.4 });
  E.plano(["2:Esse#3", -0.3], [2.3, 1.45, 1.3], [2.25, 0.75, -1.95], 52, { dur: 0.45 });
  E.plano(["2:caixa", -0.3], [2.5, 1.6, 1.4], [2.3, 0.75, -1.9], 56, { dur: 0.45 });
  // bloco 3
  E.corte("3:Mas", [2.15, 1.25, 0.6], [2.15, 0.6, -2.3], 54);
  E.plano(["3:como", -0.2], [2.1, 1.5, 0.1], [2.0, 1.3, -1.55], 46, { dur: 0.4 });
  E.plano(["3:Ele#2", -0.2], [2.15, 1.25, 0.6], [2.15, 0.6, -2.3], 54, { dur: 0.45 });
  E.plano(["3:Essa", -0.2], [2.5, 1.6, 1.4], [2.25, 0.8, -1.9], 54, { dur: 0.45 });
  E.plano(["3:condensadora>", 0.0], [2.5, 1.6, 1.4], [2.6, 0.9, -1.6], 56, { dur: 0.5 });
  E.plano(["3:É#4", -0.1], [3.0, 1.6, 1.4], [3.55, 1.35, -1.3], 54, { dur: 0.45 });
  // bloco 4
  E.plano(["4:Mas", 0.1], [2.5, 1.6, 1.4], [2.6, 0.9, -1.6], 56, { dur: 0.5 });
  E.plano(["4:Então", -0.2], [1.75, 1.5, 0.4], [1.95, 1.0, -2.2], 52, { dur: 0.45 });
  E.plano(["4:furinho", -0.4], [1.85, 1.1, -1.7], [1.62, 0.9, -2.6], 40, { dur: 0.4 });
  E.plano(["4:gela", -0.3], [1.75, 1.6, 0.6], [1.9, 1.3, -2.3], 52, { dur: 0.45 });
  E.plano(["4:como", -0.2], [2.25, 1.5, 0.1], [2.45, 1.3, -1.6], 50, { dur: 0.4 });
  E.plano(["4:Essa", -0.3], [1.75, 1.5, 0.4], [1.95, 1.0, -2.2], 52, { dur: 0.45 });
  E.corte(["4:Mas#2", 0.0], [1.37, 1.9, 4.3], [1.05, 1.1, -1.3], 56);
  E.corte(["4:Então#2", 0.0], [-0.1, 1.65, 1.4], [-0.25, 1.7, -2.4], 54);
  E.plano(["4:canos", -0.3], [-0.3, 2.05, -1.2], [-0.36, 2.1, -2.7], 46, { dur: 0.4 });
  E.plano(["4:ventilador", -0.3], [-0.1, 1.6, 1.4], [-0.25, 1.5, -2.3], 54, { dur: 0.45 });
  // bloco 5
  E.plano(["5:Mas", -0.1], [-0.1, 1.6, 1.4], [-0.25, 1.5, -2.3], 54, { dur: 0.45 });
  E.plano(["5:gotas", -0.3], [-0.2, 1.4, 1.3], [-0.3, 1.2, -2.4], 54, { dur: 0.45 });
  E.plano(["5:copo", -0.3], [-0.75, 1.2, -0.95], [-1.15, 0.95, -1.9], 42, { dur: 0.4 });
  E.plano(["5:Então", -0.1], [-0.1, 1.65, 1.4], [-0.25, 1.65, -2.4], 54, { dur: 0.45 });
  E.corte(["5:mangueira", 0.0], [1.37, 1.95, 4.2], [1.1, 1.3, -1.4], 56);
  E.corte(["5:Esse", 0.3], [2.9, 1.55, 0.35], [1.7, 1.5, -1.15], 50);
  // bloco 6
  E.corte("6:Mas", [2.4, 1.55, 1.4], [2.2, 0.85, -1.9], 54);
  E.plano(["6:girar", -0.3], [2.95, 0.9, -1.0], [2.72, 0.4, -2.3], 45, { dur: 0.4 });
  E.plano(["6:quarto", -0.3], [2.4, 1.55, 1.4], [2.2, 0.95, -1.9], 54, { dur: 0.45 });
  E.corte(["6:Coloque", -0.25], [1.37, 1.9, 4.3], [1.05, 1.1, -1.3], 56);
  E.corte(["6:briga", -0.1], [-0.25, 1.7, 1.5], [-0.3, 1.55, -2.0], 56);
  E.plano(["6:Agora", -0.1], [0.15, 1.6, 0.6], [-0.05, 1.6, -2.0], 50, { dur: 0.4 });
  E.plano(["6:Parabéns", -0.1], [1.2, 3.2, 6.8], [0.7, 1.2, -1.3], 56, { dur: 0.6 });
  E.plano(["6:Se#2", -0.2], [0.55, 1.9, 2.4], [0.2, 1.3, -1.4], 52, { dur: 0.45 });

  // poses durante as caminhadas: só "walk"
  { const W = (m.userData._andar || []).map(([a, b]) => [a, b]); for (let i = KM.length - 1; i >= 0; i--) { const t = E.t(KM[i][0]); if (W.some(([a, b]) => t > a - 0.05 && t < b)) KM.splice(i, 1); } }
  E.anima(m, KM);
}
