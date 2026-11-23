// =====================================================================
//  AÇÕES v2 — o que os vídeos mais virais do formato usam e o v1 não tinha:
//  nota (pílula branca), medida, rebobinar ◀◀, acelerar ▶▶, desabar/tombar,
//  raio-X, setas de força, partículas (umidade, gotas, vento, confete),
//  personagem andando sozinho, óculos, cartão final "comente".
// =====================================================================
import * as THREE from 'three';
import { U } from './engine.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function instalarExtras(E) {
  const { cl, ease, easeOut, V3 } = U, _e = new THREE.Euler();
  const livre = (o, a, b) => (o.userData._livreAte = o.userData._livreAte || []).push([a, b]);

  // ------------------------------------------------------------ TEXTO NA CENA
  // pílula branca com bolinha colorida: nomeia a CAUSA do problema ("TERRA FOFA", "PESO", "UMIDADE")
  E.nota = (txt, ponto, de, ate, o = {}) => {
    const t0 = E.t(de), t1 = ate == null ? t0 + 2.2 : E.t(ate), pt = E.ponto(ponto, o.desloc);
    E.eventos.notas.push({ id: 'n' + (E._id++), txt: txt.toUpperCase(), cor: o.cor || '#E5483A', t0, t1, pt });
    E.acoes.push({ tipo: 'nota', desc: 'nota ' + txt.toUpperCase(), pt, t0, dur: 0.5 }); E.som('tick', t0, 0.9);
  };
  // linha de medida com o valor escrito ("QUASE 2 m")
  E.medida = (a, b, txt, de, ate, o = {}) => {
    const A = V3(a), B = V3(b), t0 = E.t(de), t1 = ate == null ? t0 + 2.5 : E.t(ate), len = A.distanceTo(B), esp = o.esp || Math.max(0.012, len * 0.014);
    const g = new THREE.Group(), M = new THREE.MeshBasicMaterial({ color: o.cor || 0xffd23f });
    const barra = new THREE.Mesh(new THREE.BoxGeometry(1, esp, esp), M); barra.position.x = 0.5; const corpo = new THREE.Group(); corpo.add(barra);
    const tk = () => new THREE.Mesh(new THREE.BoxGeometry(esp, esp * 8, esp), M), ta = tk(), tb = tk(); g.add(corpo, ta, tb);
    g.position.copy(A); g.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize()); E.scene.add(g);
    E.track(t => { g.visible = t >= t0 && t < t1; if (!g.visible) return; const k = easeOut((t - t0) / 0.4); corpo.scale.x = Math.max(1e-3, len * k); tb.position.x = len * k; }, 1);
    const pt = E.ponto(A.clone().lerp(B, 0.5), o.desloc);
    E.eventos.medidas.push({ id: 'd' + (E._id++), txt, t0: t0 + 0.2, t1, pt }); E.acoes.push({ tipo: 'medida', desc: 'medida ' + txt, pt, t0, dur: 0.5 }); E.som('sobe', t0, 0.6);
  };
  // cartão final: SABIA? COMENTE "X" / NÃO SABIA? COMENTE "Y"
  E.cta = (sabia, naoSabia, quando) => { const t0 = E.t(quando); E.eventos.cta = { t0: +t0.toFixed(3), a: sabia.toUpperCase(), b: naoSabia.toUpperCase() }; E.som('pop', t0, 1); E.som('pop', t0 + 0.9, 1); };

  // ------------------------------------------------------------ TEMPO: ACELERAR E REBOBINAR
  // ▶▶ no canto enquanto a obra corre em câmera rápida (use junto com E.constroi / várias E.entra)
  E.acelera = (de, ate) => { const t0 = E.t(de), t1 = E.t(ate); E.eventos.icones.push({ tipo: 'acelera', t0, t1 }); E.som('acelera', t0, 0.7, t1 - t0); };
  // ◀◀ o jeito errado "desacontece": os objetos voltam no tempo até sumirem (ou até {para: quando})
  E.rebobina = (objs, de, ate, o = {}) => {
    const t0 = E.t(de), t1 = E.t(ate);
    for (const x of [objs].flat()) { const a = x.userData._an, u = x.userData;
      let alvo = o.para != null ? E.t(o.para) : Math.min(a && a.ent ? a.ent.t0 : 1e9, u.obra ? u.obra[0] : 1e9, a && a.moves.length ? a.moves[0].t0 : 1e9) - 0.05;
      if (alvo > 1e8) alvo = t0 - 1;
      u._warp = t => t < t0 ? t : t >= t1 ? alvo : t0 + (alvo - t0) * ease((t - t0) / (t1 - t0));
      livre(x, t0, t1);
      if (o.para == null) E.track(t => { if (t >= t1) x.visible = false; }, 1);
    }
    E.eventos.icones.push({ tipo: 'rebobina', t0, t1 }); E.som('rebobina', t0, 0.8, t1 - t0);
  };

  // ------------------------------------------------------------ CONSEQUÊNCIA: DESABAR / TOMBAR
  // parede de K.blocos desmorona tijolo por tijolo (dir = para onde cai, [x, z]); outros objetos tombam inteiros
  E.desaba = (muro, quando, o = {}) => {
    const u = muro.userData; if (!u.pecas) return E.tomba(muro, quando, o);
    const td = E.t(quando), B = u.pecas, im = u.inst, n = B.length, R = rng(o.seed || 17), g = 9.8, f = o.forca ?? 1, chao = o.chao ?? 0;
    const dir = new THREE.Vector3(o.dir ? o.dir[0] : 0, 0, o.dir ? o.dir[1] : 1).normalize(), bh = im.geometry.parameters.height;
    const D = B.map(b => { const atraso = (1 - b.y / u.alt) * 0.22 + R() * 0.1, emp = (0.5 + b.y * 1.2) * f, vx = dir.x * emp + (R() - 0.5) * 1.1 * f, vz = dir.z * emp + (R() - 0.5) * 1.1 * f, vy = R() * 1.1, yg = chao + bh / 2 + R() * 0.02;
      return { atraso, vx, vz, vy, yg, th: (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, b.y - yg))) / g, ax: Math.round((R() - 0.5) * 6) * Math.PI / 2, ay: (R() - 0.5) * 5, az: Math.round((R() - 0.5) * 4) * Math.PI / 2 }; });
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    E.track(tr => { const t = E._tl(muro, tr);
      if (t < td) { if (!u.obra) { Q.identity(); B.forEach((b, i) => im.setMatrixAt(i, M.compose(P.set(b.x, b.y, b.z), Q, S.set(b.sx || 1, 1, 1)))); im.instanceMatrix.needsUpdate = true; } return; }
      for (let i = 0; i < n; i++) { const b = B[i], d = D[i], tau = Math.max(0, t - td - d.atraso), k = Math.min(tau, d.th), fr = d.th > 0 ? k / d.th : 1, desl = tau > d.th ? (1 - Math.exp(-(tau - d.th) * 6)) * 0.1 : 0;
        P.set(b.x + d.vx * (k + desl), Math.max(d.yg, b.y + d.vy * k - 0.5 * g * k * k), b.z + d.vz * (k + desl)); Q.setFromEuler(_e.set(d.ax * fr, d.ay * fr, d.az * fr));
        im.setMatrixAt(i, M.compose(P, Q, S.set(b.sx || 1, 1, 1))); }
      im.instanceMatrix.needsUpdate = true; }, 0);
    u.ruina = td; muro.updateWorldMatrix(true, false); const w0 = muro.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < 4; i++) E.poeira([w0.x + (i - 1.5) * u.larg / 4 + dir.x * 0.5, w0.y + 0.1, w0.z + dir.z * 0.5], td + 0.3 + i * 0.07, { raio: 0.5 + u.alt * 0.25, n: 12, dur: 1.0 });
    E.acoes.push({ tipo: 'desabamento', obj: muro, t0: td, dur: 0.5 }); E.som('desaba', td + 0.15, 1);
  };
  // objeto inteiro tomba girando sobre a quina da base (prédio, coluna, muro pronto)
  E.tomba = (obj, quando, o = {}) => {
    const td = E.t(quando), dur = o.dur || 1.0, ang = (o.ang ?? 90) * Math.PI / 180, dir = new THREE.Vector3(o.dir ? o.dir[0] : 0, 0, o.dir ? o.dir[1] : 1).normalize();
    E._an(obj); obj.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), h = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const piv = new THREE.Vector3(c.x + dir.x * h.x, bb.min.y, c.z + dir.z * h.z), eixo = new THREE.Vector3(dir.z, 0, -dir.x), q = new THREE.Quaternion();
    if (obj.parent && obj.parent !== E.scene) obj.parent.worldToLocal(piv);
    E.track(tr => { const t = E._tl(obj, tr), k = (t - td) / dur; if (k <= 0) return;
      const kk = Math.min(1, k), th = k <= 1 ? ang * kk * kk * kk : ang * (1 - 0.05 * Math.exp(-(k - 1) * 8) * Math.abs(Math.sin((k - 1) * 13)));
      q.setFromAxisAngle(eixo, th); obj.position.sub(piv).applyQuaternion(q).add(piv); obj.quaternion.premultiply(q); }, 0);
    livre(obj, td, td + dur + 0.4);
    E.poeira([piv.x + dir.x * h.y * 1.2, bb.min.y + 0.1, piv.z + dir.z * h.y * 1.2], td + dur * 0.92, { raio: 0.5 + h.y * 0.5, n: 16, dur: 1.2 });
    E.poeira([piv.x + dir.x * h.y * 0.4, bb.min.y + 0.1, piv.z + dir.z * h.y * 0.4], td + dur * 0.96, { raio: 0.4 + h.y * 0.4, n: 12, dur: 1.1 });
    E.acoes.push({ tipo: 'tombamento', obj, t0: td, dur }); E.som('desaba', td + dur * 0.85, 1);
  };

  // ------------------------------------------------------------ VER POR DENTRO
  // raio-X: o objeto fica transparente para mostrar o que tem dentro/atrás
  E.raioX = (objs, de, ate, op = 0.22) => { const t0 = E.t(de), t1 = E.t(ate);
    for (const x of [objs].flat()) { const a = E._an(x); E._own(x); a.fade = true; (a.xray = a.xray || []).push({ t0, t1, op }); } E.som('brilho', t0, 0.6); };

  // ------------------------------------------------------------ FORÇAS
  const flecha = (a, b, t0, t1, o) => {
    const len = a.distanceTo(b), r = o.raio || Math.max(0.018, len * 0.055), g = new THREE.Group(), cor = o.cor ?? 0xe5483a;
    const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, emissive: cor, emissiveIntensity: 0.35 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), m); c.position.y = 0.5; const corpo = new THREE.Group(); corpo.add(c);
    const p = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 5.5, 14), m); g.add(corpo, p);
    const dir = b.clone().sub(a).normalize(); g.position.copy(a); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); E.scene.add(g);
    E.track(t => { g.visible = t >= t0 && t < t1; if (!g.visible) return; const k = easeOut((t - t0) / 0.3), out = cl((t1 - t) / 0.2), L = Math.max(1e-3, (len - r * 5.5) * k);
      corpo.scale.set(out, L, out); p.position.y = L + r * 2.75; p.scale.setScalar(Math.max(1e-3, out * cl(k * 3))); g.position.copy(a).addScaledVector(dir, (Math.sin(t * 7) * 0.5 + 0.5) * len * 0.07); }, 1);
    return g;
  };
  // setas([[de, para], ...], t0, t1, {cor})
  E.setas = (lista, de, ate, o = {}) => { const t0 = E.t(de), t1 = E.t(ate); lista.forEach((p, i) => flecha(V3(p[0]), V3(p[1]), t0 + i * (o.passo ?? 0.07), t1, o)); if (o.som !== false) E.som('whoosh', t0, 0.5); };
  // peso: setas vermelhas apertando o objeto de cima para baixo
  E.peso = (alvo, de, ate, o = {}) => { alvo.updateWorldMatrix(true, true); const bb = new THREE.Box3().setFromObject(alvo), n = o.n || 3, alt = o.alt ?? Math.max(0.45, (bb.max.y - bb.min.y) * 0.35), L = [];
    const aoLongoX = (bb.max.x - bb.min.x) >= (bb.max.z - bb.min.z);
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = aoLongoX ? bb.min.x + (bb.max.x - bb.min.x) * f : (bb.min.x + bb.max.x) / 2, z = aoLongoX ? (bb.min.z + bb.max.z) / 2 : bb.min.z + (bb.max.z - bb.min.z) * f;
      L.push([[x, bb.max.y + alt + 0.08, z], [x, bb.max.y + 0.05, z]]); }
    E.setas(L, de, ate, { cor: 0xe5483a, ...o }); };
  // par(a, b, 'aperto' | 'puxao', t0, t1): duas setas se encontrando (azul) ou se afastando (vermelho)
  E.par = (a, b, tipo, de, ate, o = {}) => { const A = V3(a), B = V3(b), q1 = A.clone().lerp(B, 0.44), q2 = A.clone().lerp(B, 0.56);
    E.setas(tipo === 'aperto' ? [[A, q1], [B, q2]] : [[q1, A], [q2, B]], de, ate, { cor: tipo === 'aperto' ? 0x2f7fe0 : 0xe5483a, passo: 0, ...o }); };

  // ------------------------------------------------------------ PARTÍCULAS
  // genérico: pos(i, tau, [4 sorteios], ambiente 0..1) -> [x, y, z, escala?, [rx, ry, rz]?] ou null (escondida)
  E.particulas = (o) => {
    const N = o.n || 60, t0 = E.t(o.de), t1 = E.t(o.ate), geo = o.geo || new THREE.SphereGeometry(o.raio || 0.02, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: o.cores ? 0xffffff : (o.cor ?? 0x2f6fe0), transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, side: THREE.DoubleSide });
    const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; E.scene.add(im);
    if (o.cores) { const c = new THREE.Color(); for (let i = 0; i < N; i++) im.setColorAt(i, c.set(o.cores[i % o.cores.length])); }
    const R = rng(o.seed || 23), S = Array.from({ length: N }, () => [R(), R(), R(), R()]), M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3();
    E.track(t => { im.visible = t >= t0 && t < t1; if (!im.visible) return; const amb = cl((t - t0) / (o.fin ?? 0.4)) * cl((t1 - t) / (o.fout ?? 0.4));
      for (let i = 0; i < N; i++) { const r = o.pos(i, t - t0, S[i], amb);
        if (!r) { P.set(0, -999, 0); Sc.setScalar(1e-4); Q.identity(); } else { P.set(r[0], r[1], r[2]); Sc.setScalar(Math.max(1e-4, r[3] ?? 1)); if (r[4]) Q.setFromEuler(_e.set(r[4][0], r[4][1], r[4][2])); else Q.identity(); }
        im.setMatrixAt(i, M.compose(P, Q, Sc)); }
      im.instanceMatrix.needsUpdate = true; }, 1);
    return im;
  };
  // umidade subindo por dentro da parede/solo: bolinhas azuis que sobem aos poucos. reg = {x0,x1,y0,y1,z0,z1}
  E.umidade = (reg, de, ate, o = {}) => { const H = reg.y1 - reg.y0, vel = o.vel ?? 0.35;
    E.particulas({ n: o.n || 70, raio: o.raio || 0.022, cor: o.cor ?? 0x2f6fe0, de, ate, seed: o.seed, pos: (i, tau, s, amb) => { const y = (tau * vel * (0.6 + s[3] * 0.8) + s[1] * H) % H, frente = Math.min(H, tau * vel * 1.6);
      if (y > frente) return null; return [reg.x0 + s[0] * (reg.x1 - reg.x0) + Math.sin(tau * 2 + s[3] * 6) * 0.012, reg.y0 + y, reg.z0 + s[2] * (reg.z1 - reg.z0), amb * cl((H - y) / (H * 0.15))]; } }); };
  // goteira: gotas caindo de um ponto
  E.gotas = (ponto, de, ate, o = {}) => { const p = V3(ponto), alt = o.alt ?? 1.5, T = Math.sqrt(2 * alt / 9.8) + 0.25;
    E.particulas({ n: o.n || 5, raio: o.raio || 0.022, cor: o.cor ?? 0x3fa8ff, de, ate, pos: (i, tau, s, amb) => { const k = (tau + s[0] * T) % T, y = p.y - 4.9 * k * k; if (y < p.y - alt) return null;
      return [p.x + (s[1] - 0.5) * (o.espalha ?? 0.04), y, p.z + (s[2] - 0.5) * (o.espalha ?? 0.04), amb]; } });
    const t0 = E.t(de), t1 = E.t(ate); for (let t = t0 + 0.2; t < t1; t += 0.45) E.som('pinga', t, 0.7); };
  // vento: riscos brancos correndo. o = {area:{x0,x1,y0,y1,z0,z1}, vel, n}
  E.vento = (de, ate, o = {}) => { const a = o.area || { x0: -6, x1: 6, y0: 0.3, y1: 4, z0: -3, z1: 3 }, L = a.x1 - a.x0, vel = o.vel ?? 9;
    E.particulas({ n: o.n || 26, geo: new THREE.BoxGeometry(o.comp ?? 0.9, 0.012, 0.012), cor: 0xffffff, op: 0.7, de, ate, pos: (i, tau, s, amb) => {
      const x = a.x0 + ((tau * vel * (0.7 + s[3] * 0.6) + s[0] * L) % L); return [x, a.y0 + s[1] * (a.y1 - a.y0), a.z0 + s[2] * (a.z1 - a.z0), amb]; } });
    const t0 = E.t(de); E.som('vento', t0, 0.8, E.t(ate) - t0); };
  // confete: explosão colorida de comemoração
  E.confete = (ponto, quando, o = {}) => { const p = V3(ponto), t0 = E.t(quando), dur = o.dur ?? 2.8;
    E.particulas({ n: o.n || 110, geo: new THREE.PlaneGeometry(0.07, 0.04), cores: [0xffd23f, 0xe5483a, 0x3fa8ff, 0x3cc45a, 0xff7bd0, 0xffffff], de: t0, ate: t0 + dur, fin: 0.01, fout: 0.5, pos: (i, tau, s, amb) => {
      const a = s[0] * 6.283, sp = (0.6 + s[1] * 1.8) * (o.forca ?? 1), vy = (2.5 + s[2] * 3) * (o.forca ?? 1), d = 1 - Math.exp(-tau * 1.6);
      return [p.x + Math.cos(a) * sp * d, p.y + vy * d * 0.62 - 0.9 * tau * tau * 0.5 - 0.35 * tau, p.z + Math.sin(a) * sp * d, amb, [tau * (3 + s[3] * 6), tau * (2 + s[1] * 5), s[2] * 6]]; } });
    E.som('fanfarra', t0, 1); };

  // ------------------------------------------------------------ PERSONAGEM
  // anda(m, de, ate, [x, z]): vira para o destino, caminha com a pose certa e para. {vira: ângulo final}
  E.anda = (m, de, ate, dest, o = {}) => {
    const t0 = E.t(de), t1 = E.t(ate), a = E._an(m), p0 = a.base.p.clone();
    for (const mv of a.moves) if (mv.t0 < t0) { if (mv.para) p0.copy(mv.para); if (mv.por) p0.add(mv.por); }
    const d = dest.length === 2 ? new THREE.Vector3(dest[0], p0.y, dest[1]) : V3(dest);
    E.move(m, t0 - 0.12, { rot: [0, Math.atan2(d.x - p0.x, d.z - p0.z), 0], dur: 0.25 }); E.move(m, t0, { para: d, dur: t1 - t0, linear: true });
    if (o.vira != null) E.move(m, t1 - 0.05, { rot: [0, o.vira, 0], dur: 0.3 });
    (m.userData._andar = m.userData._andar || []).push([t0, t1]); m.userData._keys = null;
    const passos = Math.max(2, Math.round((t1 - t0) * 3)); for (let i = 0; i < passos; i++) E.som('passo', t0 + (t1 - t0) * (i + 0.5) / passos, 0.5);
    m.userData._vel = Math.max(m.userData._vel || 0, p0.distanceTo(d) / Math.max(0.01, t1 - t0));
  };
  // segura(m, objeto, 'direita'|'esquerda', {pos, rot}): o personagem segura uma ferramenta na mão
  E.segura = (m, obj, lado = 'direita', o = {}) => { const A = lado === 'direita' ? m.userData.armR : m.userData.armL, El = A.children.find(k => k.isGroup), Hd = El.children.find(k => k.isGroup);
    obj.position.set(...(o.pos || [0, -0.06, 0])); if (o.rot) obj.rotation.set(...o.rot); obj.traverse(x => { x.userData.semColisao = true; }); Hd.add(obj); return obj; };
  // monta(m, veiculo, [x, y, z], rotY): o personagem vai sentado/de pé EM CIMA do veículo e anda junto com ele
  E.monta = (m, veiculo, pos, rotY = 0) => { veiculo.add(m); m.position.set(...pos); m.rotation.set(0, rotY, 0); const a = m.userData._an; if (a) { a.base.p.copy(m.position); a.base.q.copy(m.quaternion); } return m; };
  // pá de obra pronta para segurar
  E.pa = () => { const g = new THREE.Group(), cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0xa9793f, roughness: 0.8 }));
    cabo.rotation.x = Math.PI / 2; cabo.position.z = 0.3; const lam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.26), new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.4, metalness: 0.6 })); lam.position.set(0, -0.01, 0.8);
    cabo.castShadow = lam.castShadow = true; g.add(cabo, lam); return g; };
  // janelas(obj, [[de, ate], ...]): o objeto só existe nesses trechos (entra e sai com um "pop" rápido).
  // Serve para o personagem trocar de lugar: some da calçada enquanto dirige o rolo, volta depois.
  E.janelas = (obj, lista) => { const J = lista.map(([a, b]) => [E.t(a), E.t(b)]); E._an(obj); obj.userData._janelas = J;
    E.track(t => { let k = 0; for (const [a, b] of J) if (t >= a && t < b) k = Math.min(1, (t - a) / 0.14, (b - t) / 0.1);
      obj.visible = k > 0; if (k > 0 && k < 1) obj.scale.multiplyScalar(Math.max(0.02, k)); }, 1);
    for (const [a] of J) if (a > 0.3) E.som('pop', a, 0.5); return obj; };
  // farois(veiculo, {y, z, x, larg, alt}): faróis de LED levemente acesos (barra branca fria + halo suave).
  // Vale para modelos carregados com E.modelo (frente virada para +X). y e z são frações da altura e da meia largura.
  let _halo = null;
  E.farois = (v, o = {}) => { const d = v.userData.dim || { x: 3, y: 1.5, z: 1.8 }, g = new THREE.Group();
    if (!_halo) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(225,240,255,0.75)'); gr.addColorStop(0.5, 'rgba(170,205,255,0.22)'); gr.addColorStop(1, 'rgba(150,190,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      _halo = new THREE.CanvasTexture(c); _halo.colorSpace = THREE.SRGBColorSpace; }
    const led = new THREE.MeshBasicMaterial({ color: 0xf2f9ff }), halo = (p, tam) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o.brilho ?? 0.5 })); sp.scale.setScalar(tam); sp.position.copy(p); g.add(sp); };
    // 1) SUBSTITUI os faróis do próprio modelo: acha as faces amarelas da frente e troca o material delas por LED
    v.updateWorldMatrix(true, true); const inv = new THREE.Matrix4().copy(v.matrixWorld).invert(), grupos = { 1: [], '-1': [] }, P = new THREE.Vector3(); let achou = 0;
    v.traverse(m => { if (!m.isMesh || !m.material.map || !m.material.map.image || !m.geometry.attributes.uv) return;
      const im = m.material.map.image, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0);
      const px = cx.getImageData(0, 0, cv.width, cv.height).data, geo = m.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
      const fica = [], sai = [], M = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2], u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, w = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
        const k = (Math.min(cv.height - 1, Math.floor((((w % 1) + 1) % 1) * cv.height)) * cv.width + Math.min(cv.width - 1, Math.floor((((u % 1) + 1) % 1) * cv.width))) * 4, R = px[k], G = px[k + 1], B = px[k + 2];
        P.set((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3).applyMatrix4(M);
        if (R > 190 && G > 150 && B < 130 && R - B > 90 && P.x > d.x * 0.2) { sai.push(a, b, c); grupos[P.z >= 0 ? 1 : -1].push(P.clone()); } else fica.push(a, b, c); }
      if (!sai.length) return; achou += sai.length / 3;
      const g2 = geo.clone(); g2.setIndex(sai); geo.setIndex(fica); const lm = new THREE.Mesh(g2, led); lm.userData.semColisao = true; m.add(lm); });
    if (achou) { for (const s of [1, -1]) { const L = grupos[s]; if (!L.length) continue; const c = L.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / L.length); c.x += 0.06; halo(c, o.halo ?? 0.55); } }
    else {      // 2) modelo sem farol próprio: cria duas barras de LED
      const lw = o.larg ?? d.z * 0.2, lh = o.alt ?? d.y * 0.045, xf = d.x / 2 * (o.x ?? 1) + 0.012, y = d.y * (o.y ?? 0.4);
      for (const s of [1, -1]) { const z = s * d.z / 2 * (o.z ?? 0.62), b = new THREE.Mesh(new THREE.BoxGeometry(0.03, lh, lw), led); b.position.set(xf, y, z); g.add(b); halo(new THREE.Vector3(xf + 0.05, y, z), o.halo ?? Math.max(0.45, lw * 2.4)); } }
    g.traverse(x => { x.userData.semColisao = true; x.castShadow = false; }); v.add(g); return g; };
  // E.voz(m, nome, quando, {ganho, dur}): o personagem faz um barulho de comunicação SEM palavras (voz fininha): wii (escorregador),
  // uhu (alegria), hum (curioso), ops (susto leve), ai (dor), uau (admiração), brr (frio), haha (risada), ufa (alívio), eba (animado).
  // A boca abre no ritmo do som. Máx. 1 por fala; ponha nos vãos entre palavras, nunca por cima da narração.
  const DUR_VOZ = { wii: 1.2, uhu: 0.7, hum: 0.5, ops: 0.35, ai: 0.4, uau: 0.75, brr: 0.8, haha: 0.8, ufa: 0.7, eba: 0.5 }, N_VOZ = { wii: 3, uhu: 3, hum: 1.5, ops: 1, ai: 1, uau: 2, brr: 6, haha: 3, ufa: 1, eba: 2 };
  E.voz = (m, nome, quando, o = {}) => { if (!DUR_VOZ[nome]) throw new Error('voz desconhecida: ' + nome + ' (use ' + Object.keys(DUR_VOZ).join(', ') + ')');
    const t0 = E.t(quando), d = o.dur ?? DUR_VOZ[nome]; (m.userData.vozes = m.userData.vozes || []).push({ t0, t1: t0 + d, n: N_VOZ[nome] });
    E.eventos.vozes = E.eventos.vozes || []; E.eventos.vozes.push({ nome, t0: +t0.toFixed(3), t1: +(t0 + d).toFixed(3) });
    E.som('v_' + nome, t0, o.ganho ?? 1, d); };
  // vira(m, quando, ângulo): gira o personagem (0 = de frente para +z)
  E.vira = (m, quando, ang, dur = 0.3) => E.move(m, quando, { rot: [0, ang, 0], dur });
  // óculos escuros (o toque de humor do final)
  E.oculos = (m, quando) => { const h = m.userData.head, g = new THREE.Group(), M = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.25, metalness: 0.3 });
    for (const x of [-0.076, 0.076]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.072, 0.02), M); l.position.set(x, 0.03, 0.2); g.add(l); }
    const ponte = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.016), M); ponte.position.set(0, 0.048, 0.2); g.add(ponte);
    for (const x of [-0.142, 0.142]) { const hs = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.2), M); hs.position.set(x, 0.048, 0.1); g.add(hs); }
    h.add(g); E.entra(g, quando, { modo: 'pop', silencioso: true }); E.som('brilho', E.t(quando), 0.8); return g; };

  // E.rota(obj, t0, dur, pontos, {eixo, ry, som, inspeciona}) — veículo andando por uma lista de pontos com velocidade
  // constante; as rodas da frente e de trás (distância 'eixo') seguem o chão definido pelos próprios pontos, o corpo
  // fica na média e inclina entre elas. Use para descer/subir rampa. ry = giro em Y do veículo (PI se anda de ré no eixo X).
  E.rota = (o, t0, dur, pts, op = {}) => { t0 = E.t(t0); const ry = op.ry || 0, E2 = (op.eixo ?? 3) / 2, seg = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2])]);
    const tot = seg.reduce((a, q) => a + q[2], 0), em = sAt => { let s0 = Math.max(0, Math.min(tot, sAt)); for (const [a, b, d] of seg) { if (s0 <= d + 1e-9) { const k = d ? s0 / d : 0; return a.map((v, n) => v + (b[n] - v) * k); } s0 -= d; } return pts[pts.length - 1]; };
    const yEm = sAt => sAt < 0 ? pts[0][1] : sAt > tot ? pts[pts.length - 1][1] : em(sAt)[1], N = Math.max(2, Math.ceil(tot / 0.3)), sg = pts[pts.length - 1][0] >= pts[0][0] ? 1 : -1;
    for (let k = 1; k <= N; k++) { const sa = tot * k / N, c = em(sa), yf = yEm(sa + E2), yr = yEm(sa - E2), w = Math.atan((yf - yr) / (2 * E2)) * sg;
      E.move(o, t0 + dur * (k - 1) / N, { para: [c[0], (yf + yr) / 2, c[2]], rot: [0, ry, ry ? -w : w], dur: dur / N, linear: true, som: k === 1 ? op.som : undefined, inspeciona: k === 1 ? op.inspeciona : false }); }
    return t0 + dur; };
}
