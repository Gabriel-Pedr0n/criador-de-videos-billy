// =====================================================================
//  INSPETOR AUTOMÁTICO — procura "bugs" de cena sem precisar olhar o vídeo:
//  objetos atravessando outros, personagem dentro de objeto ou deslizando,
//  peças flutuando, câmera dentro de objeto, ações fora da tela/escondidas.
// =====================================================================
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { poseAt, makeChar, animateChar, POSES } from './chars.js';
import { W, H } from './engine.js';

export function instalarInspetor(E) {
  const V = () => new THREE.Vector3(), M4 = () => new THREE.Matrix4();
  const nome = o => o.name || `${o.userData.tipo || 'objeto'} nº${o.userData.sid}`;
  const visivel = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const emAnimacao = (o, t) => { const a = o.userData._an; if (!a) return false;
    if (a.ent && t >= a.ent.t0 - 1e-3 && t < a.ent.t0 + a.ent.dur + 0.04) return true;
    if (a.sai && t >= a.sai.t0 - 1e-3) return true;
    return a.moves.some(m => t >= m.t0 - 1e-3 && t < m.t0 + m.dur + 0.04); };
  const especial = (o, t) => (o.userData._livreAte || []).some(([a, b]) => t >= a - 0.02 && t <= b + 0.05) || (o.userData._janelas || []).some(([a, b]) => Math.abs(t - a) < 0.2 || Math.abs(t - b) < 0.2);
  const soEntrando = (o, t) => { if (especial(o, t)) return true; if (o.parent && o.parent !== E.scene && o.parent.userData && o.parent.userData._an && soEntrando(o.parent, t)) return true; const a = o.userData._an; return !!a && ((a.ent && t >= a.ent.t0 - 1e-3 && t < a.ent.t0 + a.ent.dur + 0.04) || (a.sai && t >= a.sai.t0 - 1e-3)); };
  const parente = (a, b) => { for (let p = a.parent; p; p = p.parent) if (p === b) return true; for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; };
  const permitido = (a, b) => E._permit.has(a.userData.sid + '|' + b.userData.sid) || E._permit.has(b.userData.sid + '|' + a.userData.sid) || E._permit.has(a.userData.sid + '|*') || E._permit.has(b.userData.sid + '|*');

  function locais(o) {
    if (o.userData._cx) return o.userData._cx;
    const L = [];
    if (o.userData.mascote) { const inv = M4().copy(o.matrixWorld).invert(), box = new THREE.Box3();
      o.traverse(m => { if (m.isMesh && !m.userData.semColisao && !(m.parent && m.parent.userData.semColisao)) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(M4().multiplyMatrices(inv, m.matrixWorld))); } });
      const c = box.getCenter(V()), s = box.getSize(V()); box.setFromCenterAndSize(c, V().set(s.x * 0.62, s.y * 0.96, s.z * 0.8)); L.push({ ref: o, box });
    } else if (o.userData.pecas) { const u = o.userData; L.push({ ref: o, box: new THREE.Box3(V().set(-u.larg / 2, 0, -u.esp / 2), V().set(u.larg / 2, u.alt, u.esp / 2)), muro: true });
    } else o.traverse(m => { if (!m.isMesh || m.isInstancedMesh || m.userData.semColisao) return; m.geometry.computeBoundingBox(); L.push({ ref: m, box: m.geometry.boundingBox }); });
    return (o.userData._cx = L);
  }
  function mundo(o, t) {            // caixas orientadas (encolhidas ~1 cm para ignorar simples encosto) + caixa alinhada
    const cx = [], aabb = new THREE.Box3();
    for (const l of locais(o)) {
      if (l.muro && ((o.userData.obra && E._tl(o, t) < o.userData.obra[1]) || (o.userData.ruina != null && E._tl(o, t) >= o.userData.ruina))) continue;
      const b = new OBB().fromBox3(l.box).applyMatrix4(l.ref.matrixWorld), cheia = b.clone();
      for (const k of ['x', 'y', 'z']) b.halfSize[k] = Math.max(1e-4, b.halfSize[k] - Math.min(0.012, b.halfSize[k] * 0.25));
      const a = l.box.clone().applyMatrix4(l.ref.matrixWorld); aabb.union(a); cx.push({ obb: b, cheia, aabb: a });
    }
    return { cx, aabb };
  }
  const sobrepoe = (a, b) => Math.min(a.max.x - b.min.x, b.max.x - a.min.x, a.max.y - b.min.y, b.max.y - a.min.y, a.max.z - b.min.z, b.max.z - a.min.z);

  function estado(t) {
    if (!E._sorted) { E.tracks.sort((a, b) => a.pri - b.pri || a.n - b.n); E._sorted = true; }
    for (const k of E.tracks) k.fn(t); E._cam(t); E.scene.updateMatrixWorld(true); E.cam.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- o corpo do personagem não pode entrar nele mesmo
  // (mão dentro da cabeça/capacete, braço dentro do tronco, mão dentro da outra, pé dentro do outro)
  const _p = V(), _q = V(), _m = M4();
  function pontos(c) {
    const U = c.userData, P = [], add = (parte, lado, grupo, x, y, z, r) => { P.push({ parte, lado, r, p: grupo.localToWorld(V().set(x, y, z)) }); };
    for (const [lado, A, El] of [['esquerda', U.armL, U.armL.children.find(k => k.isGroup)], ['direita', U.armR, U.armR.children.find(k => k.isGroup)]]) {
      const Hd = El.children.find(k => k.isGroup);
      add('cotovelo', lado, El, 0, 0, 0, 0.06); add('antebraço', lado, El, 0, -0.08, 0, 0.06); add('antebraço', lado, El, 0, -0.15, 0, 0.058);
      add('mão', lado, Hd, 0, -0.01, 0, 0.045); add('mão', lado, Hd, 0, -0.05, 0, 0.042); add('mão', lado, Hd, 0, -0.1, 0.01, 0.03); add('mão', lado, Hd, 0, -0.14, 0.01, 0.02);
    }
    for (const [lado, Lg, Kn] of [['esquerda', U.legL, U.kneeL], ['direita', U.legR, U.kneeR]]) {
      add('coxa', lado, Lg, 0, -0.12, 0, 0.095); add('canela', lado, Kn, 0, -0.12, 0, 0.062); add('pé', lado, Kn, 0, -0.265, 0.02, 0.075); add('pé', lado, Kn, 0, -0.265, 0.11, 0.06);
    }
    return P;
  }
  E.autoColisao = c => {
    const U = c.userData, P = pontos(c), out = {}, esc = c.getWorldScale(V()).x, reg = (a, b, d) => { const k = a + '|' + b; if (d > (out[k] || 0)) out[k] = d; };
    const head = U.head, spine = U.spine || head.parent;
    for (const q of P) {
      const braco = q.parte === 'mão' || q.parte === 'antebraço' || q.parte === 'cotovelo';
      if (braco) {
        // cabeça (esfera) + capacete (meia esfera + aba)
        _p.copy(q.p); head.worldToLocal(_p); const rl = q.r;
        let d = 0.2 + rl - _p.length(); if (_p.y > 0.06) d = Math.max(d, 0.215 + rl - _q.set(_p.x, _p.y - 0.06, _p.z).length());
        if (Math.abs(_p.y - 0.065) < 0.02 + rl * 0.6) d = Math.max(d, 0.253 + rl * 0.6 - Math.hypot(_p.x, _p.z));
        if (q.parte !== 'cotovelo' && d > 0) reg(`${q.parte} ${q.lado}`, 'cabeça/capacete', d * esc);
        // tronco (cápsula achatada)
        if (q.parte !== 'cotovelo') { _p.copy(q.p); spine.worldToLocal(_p); const z = _p.z / 0.78, y = Math.max(0.2, Math.min(0.36, _p.y)), dt = 0.215 + rl - Math.hypot(_p.x, _p.y - y, z);
          if (dt > 0) reg(`${q.parte} ${q.lado}`, 'tronco', dt * esc); }
      }
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j]; if (a.lado === b.lado) continue;
      const bracos = a.parte !== 'coxa' && a.parte !== 'canela' && a.parte !== 'pé', bracosB = b.parte !== 'coxa' && b.parte !== 'canela' && b.parte !== 'pé';
      if (a.parte === 'cotovelo' || b.parte === 'cotovelo' || (a.parte === 'coxa' && b.parte === 'coxa')) continue;
      const d = (a.r + b.r) * esc - a.p.distanceTo(b.p); if (d > 0) reg(`${a.parte} ${a.lado}`, `${b.parte} ${b.lado}` + (bracos !== bracosB ? '' : ''), d); }
    for (const q of P) { if (q.parte !== 'mão' && q.parte !== 'antebraço') continue;             // mão/antebraço dentro da própria perna ou da outra
      for (const w of P) { if (w.parte !== 'coxa' && w.parte !== 'canela') continue; const d = (q.r + w.r) * esc - q.p.distanceTo(w.p); if (d > 0) reg(`${q.parte} ${q.lado}`, `${w.parte} ${w.lado}`, d); } }
    return Object.entries(out).filter(([, d]) => d > 0.02).map(([k, d]) => [...k.split('|'), +d.toFixed(3)]);
  };
  // confere TODAS as poses do personagem (parado e se mexendo) — roda uma vez quando o motor muda
  E.auditarPoses = () => { const c = makeChar({ ph: 1.3 }); E.scene.add(c); const res = {};
    for (const nome of Object.keys(POSES)) { const pior = {};
      for (let t = 0; t < 3.2; t += 1 / 15) { animateChar(c, [[-5, nome, 0.3]], t); c.updateMatrixWorld(true); for (const [a, b, d] of E.autoColisao(c)) { const k = a + ' × ' + b; if (d > (pior[k] || 0)) pior[k] = d; } }
      if (Object.keys(pior).length) res[nome] = pior; }
    E.scene.remove(c); return JSON.stringify(res); };

  // ajuste automático: afasta braços/pernas aos poucos até a pose não ter mais nenhuma parte dentro da outra
  E.corrigirPoses = () => { const c = makeChar({ ph: 1.3 }); E.scene.add(c); const mud = {};
    const custo = nome => { let tot = 0; for (let t = 0; t < 3.2; t += 1 / 12) { animateChar(c, [[-5, nome, 0.3]], t); c.updateMatrixWorld(true); for (const [, , d] of E.autoColisao(c)) tot = Math.max(tot, d) + d * 0.2; } return tot; };
    const PAR = [['armL', 2], ['armR', 2], ['elL'], ['elR'], ['legL', 2], ['legR', 2], ['armL', 0], ['armR', 0]];
    const get = (P, k) => k.length > 1 ? P[k[0]][k[1]] : P[k[0]], set = (P, k, v) => { if (k.length > 1) P[k[0]][k[1]] = v; else P[k[0]] = v; };
    for (const nome of Object.keys(POSES)) { const P = POSES[nome]; let c0 = custo(nome); if (c0 <= 0) continue; const orig = JSON.parse(JSON.stringify(P));
      for (let it = 0; it < 80 && c0 > 0; it++) { let melhor = null;
        for (const k of PAR) for (const dv of [0.06, -0.06]) { const v = get(P, k); set(P, k, v + dv); const cc = custo(nome); set(P, k, v);
          if (cc < c0 - 1e-5 && (!melhor || cc < melhor[2])) melhor = [k, v + dv, cc]; }
        if (!melhor) break; set(P, melhor[0], +melhor[1].toFixed(3)); c0 = melhor[2]; }
      const d = {}; for (const k of PAR) if (Math.abs(get(P, k) - get(orig, k)) > 1e-6) d[k.join('.')] = [get(orig, k), get(P, k)];
      mud[nome] = { resta: +c0.toFixed(3), d, pose: { armL: P.armL, armR: P.armR, elL: P.elL, elR: P.elR, legL: P.legL, legR: P.legR } }; }
    E.scene.remove(c); return JSON.stringify(mud); };

  E.inspecionar = t => {
    estado(t);
    const S = E.solidos.filter(o => visivel(o)).map(o => ({ o, ...mundo(o, t), anim: soEntrando(o, t) })).filter(s => s.cx.length);
    const col = [], flut = [], objs = {};
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], b = S[j];
      if (a.anim || b.anim || (a.o.userData.terreno && b.o.userData.terreno) || parente(a.o, b.o) || permitido(a.o, b.o) || !a.aabb.intersectsBox(b.aabb)) continue;
      let prof = 0;
      for (const x of a.cx) for (const y of b.cx) if (x.aabb.intersectsBox(y.aabb) && x.obb.intersectsOBB(y.obb)) prof = Math.max(prof, sobrepoe(x.aabb, y.aabb));
      // sola do personagem encostando no chão em que pisa (até 3,5 cm) é contato, não atravessar
      if (prof > 0.02 && (a.o.userData.mascote || b.o.userData.mascote)) { const M = a.o.userData.mascote ? a : b, C = M === a ? b : a;
        const solo = C.cx.filter(y => y.aabb.intersectsBox(M.aabb)).every(y => y.aabb.max.y <= M.aabb.min.y + 0.035); if (solo) continue; }
      if (prof > 0.02) { col.push([nome(a.o), nome(b.o), +prof.toFixed(3), a.o.userData.mascote || b.o.userData.mascote ? 1 : 0]);
        if (E._debugCol) { const r = []; for (const x of a.cx) for (const y of b.cx) if (x.aabb.intersectsBox(y.aabb) && x.obb.intersectsOBB(y.obb)) r.push([x.ref && x.ref.name, x.aabb.min.toArray().map(v => +v.toFixed(2)), x.aabb.max.toArray().map(v => +v.toFixed(2)), y.ref && y.ref.name, y.aabb.min.toArray().map(v => +v.toFixed(2)), y.aabb.max.toArray().map(v => +v.toFixed(2))]); col[col.length - 1].push(r.slice(0, 3)); } }
    }
    for (const s of S) { const o = s.o, u = o.userData;
      if (!u.terreno) { const c = s.aabb.getCenter(V()); objs[u.sid] = [nome(o), +c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3), s.anim ? 1 : 0]; }
      if (u.terreno || u.fixo || s.anim || emAnimacao(o, t) || (o.parent && o.parent !== E.scene && E.solidos.includes(o.parent))) continue;
      const base = u.mascote ? o.getWorldPosition(V()).y : s.aabb.min.y, tol = u.mascote ? 0.06 : 0.035; let apoio = Math.abs(base - E.nivelChao) <= tol, melhor = -1e9;
      if (!apoio) for (const q of S) { if (q === s) continue;
        for (const y of q.cx) { const A = y.aabb; if (A.max.x < s.aabb.min.x + 0.01 || A.min.x > s.aabb.max.x - 0.01 || A.max.z < s.aabb.min.z + 0.01 || A.min.z > s.aabb.max.z - 0.01) continue;
          if (A.max.y >= base - tol && A.min.y <= base + tol) { apoio = true; break; } if (A.max.y < base) melhor = Math.max(melhor, A.max.y); }
        if (apoio) break; }
      if (!apoio) { if (base > E.nivelChao) melhor = Math.max(melhor, E.nivelChao); flut.push([nome(o), +(melhor > -1e8 ? base - melhor : base - E.nivelChao).toFixed(3), u.mascote ? 1 : 0]); }
    }
    const cp = E.cam.position; let dentro = null;
    for (const s of S) { for (const x of s.cx) if (x.cheia.containsPoint(cp)) { dentro = nome(s.o); break; } if (dentro) break; }
    const fora = !(E._furos || []).some(([x0, x1, z0, z1]) => cp.x > x0 && cp.x < x1 && cp.z > z0 && cp.z < z1);
    const masc = E.solidos.filter(o => o.userData.mascote && visivel(o)).map(o => { const p = o.getWorldPosition(V()), k = o.userData._keys, ps = k ? poseAt(k, t)[0] : {};
      const q = p.clone().setY(p.y + 0.9).project(E.cam), tela = q.z < 1 && Math.abs(q.x) < 1.05 && Math.abs(q.y) < 1.05 ? 1 : 0;
      return [nome(o), +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +(ps.walk || 0).toFixed(2), +(ps.y || 0).toFixed(2), tela, (o.parent && o.parent !== E.scene && E.solidos.includes(o.parent)) ? 1 : 0]; });
    const corpo = []; for (const o of E.solidos) if (o.userData.mascote && visivel(o)) { for (const [x, y, d] of E.autoColisao(o)) corpo.push([nome(o), x, y, d]);
      // mãos, braços e pés do personagem dentro de OUTROS objetos (a caixa do corpo não pega braço esticado)
      for (const q of pontos(o)) { if (q.parte === 'coxa' || q.parte === 'cotovelo') continue;
        for (const s2 of S) { if (s2.o === o || s2.o.userData.mascote || s2.anim || parente(s2.o, o) || permitido(s2.o, o)) continue;
          if (s2.cx.some(x => x.obb.containsPoint(q.p))) corpo.push([nome(o), `${q.parte} ${q.lado}`, `"${nome(s2.o)}"`, 0.03]); } } }
    // CABOS (fios, mangueiras, cordas = tubos sem colisão) atravessando o personagem: nada atravessa nada
    if (!E._cabos) { E._cabos = []; E.scene.traverse(x => { if (x.isMesh && x.userData.curva && (x.userData.L || 0) < 40 && !x.userData.ignoraCorpo) E._cabos.push(x); }); }
    for (const o of E.solidos) { if (!o.userData.mascote || !visivel(o)) continue; const U = o.userData, head = U.head, spine = U.spine || head.parent, P = pontos(o), pw = o.getWorldPosition(V()), pior = {};
      for (const cb of E._cabos) { if (!visivel(cb)) continue; const cv = cb.userData.curva, L = cb.userData.L, fr = cb.userData.k ?? 1, rr = cb.userData.raio || 0.012, n = Math.max(4, Math.ceil(L * fr / 0.04));
        if (cb.geometry.boundingSphere == null) cb.geometry.computeBoundingSphere(); const bs = cb.geometry.boundingSphere; if (bs.center.distanceTo(pw) > bs.radius + 1.6) continue;
        for (let i = 0; i <= n; i++) { const p = cv.getPointAt(Math.min(1, fr * i / n)); if (Math.abs(p.x - pw.x) > 0.7 || Math.abs(p.z - pw.z) > 0.7 || p.y < pw.y - 0.05 || p.y > pw.y + 2.0) continue;
          let d = 0, parte = '';
          _p.copy(p); head.worldToLocal(_p); let dh = 0.2 + rr - _p.length(); if (_p.y > 0.06) dh = Math.max(dh, 0.215 + rr - _q.set(_p.x, _p.y - 0.06, _p.z).length()); if (dh > d) { d = dh; parte = 'cabeça/capacete'; }
          _p.copy(p); spine.worldToLocal(_p); { const z = _p.z / 0.78, y = Math.max(0.2, Math.min(0.36, _p.y)), dt = 0.215 + rr - Math.hypot(_p.x, _p.y - y, z); if (dt > d) { d = dt; parte = 'tronco'; } }
          for (const q of P) { const dq = q.r + rr - q.p.distanceTo(p); if (dq > d) { d = dq; parte = `${q.parte} ${q.lado}`; } }
          if (d > 0.015) { const k = parte + '|' + (cb.name || 'cabo'); if (d > (pior[k] || 0)) pior[k] = d; } } }
      for (const [k, d] of Object.entries(pior)) { const [parte, cn] = k.split('|'); corpo.push([nome(o), parte, `cabo "${cn}" (fio/mangueira atravessando)`, +d.toFixed(3)]); } }
    // LIMBO: raio que sai da câmera para BAIXO e não bate em nada = buraco no mundo (vazio embaixo do chão, borda de corte sem preencher)
    let limbo = 0; { // renderiza pequeno, sem céu e com fundo magenta: pixel magenta olhando para baixo = vazio do mundo
      const W = 135, H = 240, R = E.renderer, rt = E._rtLimbo || (E._rtLimbo = new THREE.WebGLRenderTarget(W, H)), buf = E._bufLimbo || (E._bufLimbo = new Uint8Array(W * H * 4));
      const ceus = []; E.scene.traverse(x => { if (x.userData.ceu && x.visible) { ceus.push(x); x.visible = false; } });
      const bg = E.scene.background, fg = E.scene.fog; E.scene.background = new THREE.Color(1, 0, 1); E.scene.fog = null;
      const asp = E.cam.aspect; E.cam.aspect = W / H; E.cam.updateProjectionMatrix();
      R.setRenderTarget(rt); R.render(E.scene, E.cam); R.readRenderTargetPixels(rt, 0, 0, W, H, buf); R.setRenderTarget(null);
      E.cam.aspect = asp; E.cam.updateProjectionMatrix(); E.scene.background = bg; E.scene.fog = fg; ceus.forEach(x => { x.visible = true; });
      const v = V(), cp2 = E.cam.position;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (buf[k] > 235 && buf[k + 1] < 25 && buf[k + 2] > 235) {
        v.set((x + 0.5) / W * 2 - 1, (y + 0.5) / H * 2 - 1, 0.5).unproject(E.cam).sub(cp2).normalize(); if (v.y < -0.03) limbo++; } } }
    const al = E._alvo || V();
    return JSON.stringify({ t, col, flut, objs, masc, corpo, cam: { p: [+cp.x.toFixed(3), +cp.y.toFixed(3), +cp.z.toFixed(3)], a: [+al.x.toFixed(3), +al.y.toFixed(3), +al.z.toFixed(3)], dentro, limbo, corte: E.camKeys.some(k => (k.corte && Math.abs(k.t - t) < 0.05) || (k.chicote && t >= k.t - k.chicote - 0.04 && t <= k.t + 0.04)), abaixo: cp.y < E.nivelChao - 0.02 && fora } });
  };

  // cada ação (entrada de peça, X, check, etiqueta) precisa acontecer DENTRO do quadro, visível e num tamanho que dê para notar
  E.inspecionarAcoes = (t0, t1) => {
    const out = [], ray = new THREE.Raycaster(), alvos = [];
    E.scene.traverse(m => { if (m.isMesh && !(m.geometry.boundingSphere && m.geometry.boundingSphere.radius > 800) && !(m.material.transparent && m.material.opacity < 0.6) && m.material.side !== THREE.BackSide) alvos.push(m); });
    for (const a of E.acoes) { if (a.t0 < t0 - 1e-3 || a.t0 >= t1) continue;
      if (a.tipo === 'movimento' && a.obj && a.obj.userData.mascote) continue;      // personagem andando fora do quadro não é erro (a presença dele é medida à parte)
      const ta = a.t0 + Math.min(a.dur || 0.5, 0.8) * 0.9; estado(ta);
      let c, raio = 0, desc = a.desc;
      if (a.obj) { if (!visivel(a.obj)) continue; const b = new THREE.Box3().setFromObject(a.obj); if (b.isEmpty()) continue; c = b.getCenter(V()); raio = b.getSize(V()).length() / 2; desc = `${a.tipo} de "${nome(a.obj)}"`;
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let i = 0; i < 8; i++) { const p = V().set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(E.cam); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
        const tam = Math.max((x1 - x0) / 2, (y1 - y0) / 2 * (H / W) * (W / H));
        if (tam < 0.035) out.push({ t: +ta.toFixed(2), nivel: 'aviso', msg: `${desc}: a peça ocupa só ${(tam * 100).toFixed(1)}% da tela — pequena demais para notar (aproxime a câmera)` });
      } else c = a.pt().clone();
      const p = c.clone().project(E.cam), sx = p.x * 0.5 + 0.5, sy = -p.y * 0.5 + 0.5;
      if (p.z > 1 || sx < 0.04 || sx > 0.96 || sy < 0.07 || sy > 0.84) { out.push({ t: +ta.toFixed(2), nivel: 'erro', msg: `${desc}: acontece FORA do quadro (posição na tela ${Math.round(sx * 100)}% × ${Math.round(sy * 100)}%)` }); continue; }
      if (a.obj) { const d = c.distanceTo(E.cam.position); ray.set(E.cam.position, c.clone().sub(E.cam.position).normalize()); ray.far = d;
        const meus = new Set(); a.obj.traverse(m => meus.add(m));
        const h = ray.intersectObjects(alvos, false).find(x => !meus.has(x.object) && visivel(x.object));
        if (h && h.distance < d - raio - 0.05) { let q = h.object; while (q.parent && q.parent !== E.scene && !E.solidos.includes(q)) q = q.parent;
          out.push({ t: +ta.toFixed(2), nivel: 'erro', msg: `${desc}: fica ESCONDIDO atrás de "${E.solidos.includes(q) ? nome(q) : 'cenário'}"` }); } }
    }
    return JSON.stringify(out);
  };
}
