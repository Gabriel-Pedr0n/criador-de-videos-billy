// =====================================================================
//  MUNDO EM CAMADAS — motor "VOCÊ CONSTRÓI" (v1)
//  Tudo é calculado a partir do tempo t (sem estado), então qualquer
//  quadro pode ser renderizado isolado, em qualquer ordem, em paralelo.
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeChar, animateChar } from './chars.js';
import { makeKit } from './kit.js';
import { instalarInspetor } from './inspetor.js';
import { instalarExtras } from './extras.js';

export const W = 720, H = 1280;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = cl(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - cl(x), 3);
const backOut = x => { x = cl(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bounceOut = x => { x = cl(x); const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const softBounce = x => 1 - (1 - bounceOut(x)) * 0.55 - (1 - easeOut(x)) * 0.45;   // queda com quique leve
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const V3 = a => (a && a.isVector3) ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]);
export const U = { cl, ease, easeOut, backOut, bounceOut, V3, norm };

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Engine {
  constructor(proj, tempo) {
    this.proj = proj; this.tempo = tempo; this.THREE = THREE;
    this.tracks = []; this.camKeys = []; this._id = 0;
    this.eventos = { rotulos: [], marcas: [], sons: [], notas: [], medidas: [], icones: [], cta: null };
    this.solidos = []; this.acoes = []; this._permit = new Set(); this.nivelChao = 0; this._sid = 0;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(45, W / H, 0.03, 3000);
    this.K = makeKit(this);
    this.rand = rng(7);
    instalarInspetor(this);
    instalarExtras(this);
  }

  // ------------------------------------------------------------ INSPEÇÃO (o que o sistema confere sozinho)
  registrar(obj, nome) { if (obj.userData.sid == null) { obj.userData.sid = ++this._sid; this.solidos.push(obj); } if (nome) obj.name = nome; return obj; }
  nome(obj, nome) { obj.name = nome; return obj; }
  // permite(a, b): 'a' PODE ficar dentro/atravessar 'b' de propósito (ex.: ferragem dentro do concreto). permite(a) libera 'a' com tudo.
  permite(a, b) { for (const x of [a].flat()) { this.registrar(x); if (b == null) this._permit.add(x.userData.sid + '|*'); else for (const y of [b].flat()) { this.registrar(y); this._permit.add(x.userData.sid + '|' + y.userData.sid); } } }
  // fixo(obj): peça presa na parede/teto ou suspensa de propósito (não precisa de apoio embaixo)
  fixo(...objs) { objs.flat().forEach(o => { o.userData.fixo = true; }); }

  // ------------------------------------------------------------ TEMPO
  // "2:brocas"  -> instante em que "brocas" começa a ser falada no bloco 2
  // "2:brocas>" -> fim da palavra      "2:brocas#2" -> 2ª vez que aparece
  // "2:ini" / "2:fim" -> começo/fim do bloco   "2@3.5" -> 3,5 s depois do início do bloco 2
  // ["2:brocas", 0.4] -> com deslocamento     número -> tempo global em segundos
  t(q, off = 0) {
    if (Array.isArray(q)) return this.t(q[0], (q[1] || 0) + off);
    if (typeof q === 'number') return q + off;
    const m = /^(\d+)\s*([:@])\s*(.+?)(?:#(\d+))?(>)?$/.exec(String(q).trim());
    if (!m) throw new Error('tempo inválido: ' + q);
    const b = this.tempo.blocos.find(x => String(x.id) === m[1]);
    if (!b) throw new Error('bloco não existe: ' + q);
    if (m[2] === '@') return b.ini + parseFloat(m[3]) + off;
    if (m[3] === 'ini') return b.ini + off;
    if (m[3] === 'fim') return b.fim + off;
    const alvo = norm(m[3]), n = parseInt(m[4] || '1');
    let c = 0;
    for (const [w, s, e] of b.palavras) if (norm(w) === alvo && ++c === n) return (m[5] ? e : s) + off;
    throw new Error(`palavra "${m[3]}" (#${n}) não está no bloco ${m[1]}. Palavras: ` + b.palavras.map(x => x[0]).join(' '));
  }
  bloco(id) { return this.tempo.blocos.find(x => String(x.id) === String(id)); }
  get total() { return this.tempo.total; }

  // ------------------------------------------------------------ INFRA
  track(fn, pri = 1) { this.tracks.push({ fn, pri, n: this.tracks.length }); return fn; }
  cada(fn) { return this.track(fn, 1); }                    // callback livre por quadro: fn(t)
  som(nome, quando, ganho = 1, dur = 0) { this.eventos.sons.push({ nome, t: +this.t(quando).toFixed(3), g: ganho, dur }); }
  ponto(p, off) {                                           // ponto no mundo: [x,y,z] | Vector3 | Object3D
    const o = off ? V3(off) : null, v = new THREE.Vector3();
    if (p && p.isObject3D) return () => { p.getWorldPosition(v); if (o) v.add(o); return v; };
    const f = V3(p); if (o) f.add(o); return () => v.copy(f);
  }
  _own(obj) {                                               // materiais próprios (para tingir / esmaecer)
    if (obj.userData._mats) return obj.userData._mats;
    const list = [];
    obj.traverse(m => { if (!m.isMesh) return;
      const arr = Array.isArray(m.material) ? m.material : [m.material];
      const cl2 = arr.map(x => { const c = x.clone(); list.push({ m: c, cor: c.color ? c.color.clone() : null, op: c.opacity, tr: c.transparent }); return c; });
      m.material = Array.isArray(m.material) ? cl2 : cl2[0]; });
    return (obj.userData._mats = list);
  }
  _an(obj) {
    if (obj.userData._an) return obj.userData._an;
    const a = { base: { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone() }, moves: [], ent: null, sai: null, vis0: obj.visible };
    obj.userData._an = a; this.track(t => this._evalObj(obj, a, t), 0); return a;
  }
  // tempo local do objeto (E.rebobina faz o tempo dele andar para trás)
  _tl(obj, t) { const w = obj.userData._warp; return w ? w(t) : t; }
  _evalObj(o, a, t) {
    t = this._tl(o, t);
    const p = o.position.copy(a.base.p), q = o.quaternion.copy(a.base.q), s = o.scale.copy(a.base.s);
    let vis = a.vis0, op = 1;
    for (const m of a.moves) {
      const k = (t - m.t0) / m.dur; if (k <= 0) break;
      const e = m.linear ? cl(k) : ease(k);
      if (m.para) p.lerp(m.para, e);
      if (m.por) p.addScaledVector(m.por, e);
      if (m.rot) q.slerp(m.rot, e);
      if (m.gira) q.multiply(_q.setFromEuler(_e.set(m.gira[0] * e, m.gira[1] * e, m.gira[2] * e)));
      if (m.escala) s.lerp(m.escala, e);
    }
    if (a.ent) { const n = a.ent, k = (t - n.t0) / n.dur;
      if (k < 0) vis = false; else { vis = true;
        if (n.modo === 'cai') p.y += (1 - softBounce(k)) * n.alt;
        else if (n.modo === 'cresce') s[n.eixo] *= Math.max(1e-3, easeOut(k));
        else if (n.modo === 'pop') s.multiplyScalar(Math.max(1e-3, backOut(k)));
        else if (n.modo === 'desliza') p.addScaledVector(n.de, 1 - easeOut(k));
        else if (n.modo === 'surge') op *= cl(k);
      } }
    if (a.sai) { const n = a.sai, k = (t - n.t0) / n.dur;
      if (k >= 1) vis = false; else if (k > 0) {
        if (n.modo === 'pop') s.multiplyScalar(Math.max(1e-3, 1 - ease(k)));
        else if (n.modo === 'desliza') p.addScaledVector(n.de, ease(k));
        else op *= 1 - cl(k);
      } }
    if (a.xray) for (const x of a.xray) op *= 1 - (1 - x.op) * cl((t - x.t0) / 0.35) * cl((x.t1 - t) / 0.35);
    o.visible = vis;
    if (o.userData._mats && a.fade) for (const x of o.userData._mats) { const tr = x.tr || op < 0.999; if (x.m.transparent !== tr) { x.m.transparent = tr; x.m.needsUpdate = true; } x.m.opacity = x.op * op; x.m.depthWrite = x.tr ? false : op > 0.97; }
  }

  // ------------------------------------------------------------ AÇÕES
  // modo: 'cai' (desce e quica) | 'cresce' (eixo y) | 'pop' | 'desliza' (de:[dx,dy,dz]) | 'surge' (transparência) | 'nada'
  entra(obj, quando, o = {}) {
    const a = this._an(obj), modo = o.modo || 'cai';
    a.ent = { t0: this.t(quando), modo, dur: o.dur || (modo === 'cai' ? 0.55 : 0.4), alt: o.alt ?? 1.2, eixo: o.eixo || 'y', de: V3(o.de || [0, 0, 1]) };
    if (modo === 'surge') { this._own(obj); a.fade = true; }
    if (!o.silencioso && o.inspeciona !== false) this.acoes.push({ tipo: 'entrada', obj, t0: a.ent.t0, dur: a.ent.dur });
    if (o.som !== null && !o.silencioso) this.som(o.som || { cai: 'tum', pop: 'pop', cresce: 'sobe', desliza: 'encaixe', surge: 'brilho', nada: 'tick' }[modo], a.ent.t0 + (modo === 'cai' ? a.ent.dur * 0.36 : 0), o.ganho ?? 1);
    return obj;
  }
  sai(obj, quando, o = {}) {
    const a = this._an(obj), modo = o.modo || 'some';
    a.sai = { t0: this.t(quando), modo, dur: o.dur || 0.3, de: V3(o.de || [0, 1, 0]) };
    if (modo === 'some') { this._own(obj); a.fade = true; }
    return obj;
  }
  // move(obj, quando, {para:[x,y,z] | por:[dx,dy,dz], rot:[rx,ry,rz], gira:[rx,ry,rz], escala:n|[x,y,z], dur, linear})
  move(obj, quando, o = {}) {
    const a = this._an(obj), m = { t0: this.t(quando), dur: o.dur || 0.6, linear: !!o.linear };
    if (o.para) m.para = V3(o.para); if (o.por) m.por = V3(o.por);
    if (o.rot) m.rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(...o.rot));
    if (o.gira) m.gira = o.gira;
    if (o.escala != null) m.escala = typeof o.escala === 'number' ? new THREE.Vector3(o.escala, o.escala, o.escala) : V3(o.escala);
    a.moves.push(m); a.moves.sort((x, y) => x.t0 - y.t0); if (o.inspeciona !== false) this.acoes.push({ tipo: 'movimento', obj, t0: m.t0, dur: m.dur });
    if (o.som) this.som(o.som, m.t0, o.ganho ?? 1);
    return obj;
  }
  // muro/piso de K.blocos: aparece peça por peça
  constroi(muro, de, ate, o = {}) {
    const t0 = this.t(de), t1 = this.t(ate), B = muro.userData.pecas, im = muro.userData.inst, n = B.length, d = o.dur || 0.28, alt = o.alt ?? 0.5;
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    this.track(tr => { const t = this._tl(muro, tr);
      if (muro.userData.ruina != null && t >= muro.userData.ruina) return;      // E.desaba assume a partir daqui
      for (let i = 0; i < n; i++) {
        const ti = t0 + (t1 - t0 - d) * (n > 1 ? i / (n - 1) : 0), k = (t - ti) / d, b = B[i];
        if (k <= 0) S.set(1e-4, 1e-4, 1e-4); else { const e = 0.6 + 0.4 * easeOut(k); S.set(e * (b.sx || 1), e, e); }
        P.set(b.x, b.y + (k > 0 ? (1 - softBounce(k)) * alt : 0), b.z); Q.copy(b.q || _qi);
        im.setMatrixAt(i, M.compose(P, Q, S));
      }
      im.instanceMatrix.needsUpdate = true;
    }, 0);
    muro.userData.obra = [t0, t1]; this.acoes.push({ tipo: 'construção', obj: muro, t0: t1 - 0.3, dur: 0.3 });
    const passos = Math.min(n, Math.max(3, Math.round((t1 - t0) * 5)));
    for (let i = 0; i < passos; i++) this.som('bloco', t0 + (t1 - t0) * i / passos + 0.1, 0.55);
    return muro;
  }
  // tinta: várias "pinturas" temporárias (erro vermelho, destaque amarelo) convivem no mesmo objeto
  _tinge(obj, sp) {
    const u = obj.userData; if (!u._tintas) { u._tintas = []; const mats = this._own(obj), c = new THREE.Color();
      this.track(t => { for (const x of mats) { if (!x.cor) continue; x.m.color.copy(x.cor); let em = 0, er = 0, eg = 0, eb = 0;
        for (const k of u._tintas) { const a = cl((t - k.t0) / k.fin) * cl((k.t1 - t) / k.fout) * (k.pulso ? 0.65 + 0.35 * Math.sin((t - k.t0) * k.pulso) : 1); if (a <= 0) continue;
          x.m.color.lerp(k.cor, a * k.forca); er += k.cor.r * a * k.emis; eg += k.cor.g * a * k.emis; eb += k.cor.b * a * k.emis; em = 1; }
        if (x.m.emissive) x.m.emissive.setRGB(er, eg, eb); } }, 1); }
    u._tintas.push({ fin: 0.18, fout: 0.25, forca: 0.7, emis: 0.2, ...sp, cor: new THREE.Color(sp.cor) });
  }
  // jeito ERRADO: peça fica vermelha + X vermelho na tela
  errado(objs, de, ate, o = {}) {
    const t0 = this.t(de), t1 = this.t(ate), L = Array.isArray(objs) ? objs : [objs];
    for (const x of L) this._tinge(x, { t0, t1, cor: o.cor || 0xff5a5a, forca: o.forca ?? 0.72, emis: 0.25 });
    if (o.x !== false) this.marca('x', o.x || L[0], t0 + 0.1, t1, o.desloc);
    this.som('erro', t0, 0.9);
  }
  // destaque amarelo pulsando (o objeto "acende" quando o nome dele é falado)
  destaca(objs, de, ate, o = {}) {
    const t0 = this.t(de), t1 = ate == null ? t0 + 1.0 : this.t(ate);
    for (const x of [objs].flat()) this._tinge(x, { t0, t1, cor: o.cor || 0xffd23f, forca: o.forca ?? 0.55, emis: 0.45, pulso: 9, fin: 0.12, fout: 0.3 });
  }
  // jeito CERTO: check verde
  certo(ponto, quando, dur = 1.3, desloc) { const t0 = this.t(quando); this.marca('ok', ponto, t0, t0 + dur, desloc); this.som('ding', t0, 0.9); }
  marca(tipo, ponto, t0, t1, desloc) { const pt = this.ponto(ponto, desloc); this.eventos.marcas.push({ id: 'm' + (this._id++), tipo, t0, t1, pt }); this.acoes.push({ tipo: 'marca', desc: tipo === 'x' ? 'X vermelho' : 'check verde', pt, t0, dur: 0.5 }); }
  // etiqueta amarela do termo técnico
  rotulo(txt, ponto, de, ate, desloc, o = {}) {
    const t0 = this.t(de), t1 = ate == null ? t0 + 2.0 : this.t(ate);
    if (ponto && ponto.isObject3D && o.destaca !== false) this.destaca(ponto, t0, t0 + 1.0);
    const pt = this.ponto(ponto, desloc); this.eventos.rotulos.push({ id: 'r' + (this._id++), txt: txt.toUpperCase(), t0, t1, pt }); this.acoes.push({ tipo: 'etiqueta', desc: 'etiqueta ' + txt.toUpperCase(), pt, t0, dur: 0.5 });
    this.som('termo', t0, 0.8);
  }
  // seta 3D de fluxo (água, força, ar)
  seta(de, para, t0q, t1q, o = {}) {
    const a = V3(de), b = V3(para), t0 = this.t(t0q), t1 = this.t(t1q), len = a.distanceTo(b), r = o.raio || len * 0.05;
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: o.cor || 0x4aa8ff, roughness: 0.5, emissive: o.cor || 0x4aa8ff, emissiveIntensity: 0.25 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), m); c.position.y = 0.5; const corpo = new THREE.Group(); corpo.add(c);
    const p = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 5, 16), m); g.add(corpo, p);
    g.position.copy(a); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); this.scene.add(g);
    const dir = b.clone().sub(a).normalize();
    this.track(t => { const k = easeOut((t - t0) / 0.35), out = cl((t1 - t) / 0.2); g.visible = t >= t0 && t < t1;
      const L = Math.max(1e-3, (len - r * 5) * k); corpo.scale.set(out, L, out); p.position.y = L + r * 2.5; p.scale.setScalar(Math.max(1e-3, out * cl(k * 3)));
      g.position.copy(a).addScaledVector(dir, Math.sin(t * 6) * len * 0.03); }, 1);
    this.som('whoosh', t0, 0.5); return g;
  }
  // chuva sobre uma área: {centro:[x,z], tam:[w,d], topo}
  chuva(de, ate, o = {}) {
    const t0 = this.t(de), t1 = this.t(ate), N = o.n || 500, [cx, cz] = o.centro || [0, 0], [sw, sd] = o.tam || [14, 14], topo = o.topo || 9;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.42, 0.012), new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.75 }), N);
    im.frustumCulled = false; this.scene.add(im);
    const R = rng(11), S = Array.from({ length: N }, () => [R(), R(), R(), 0.8 + R() * 0.5]), M = new THREE.Matrix4();
    this.track(t => { im.visible = t >= t0 && t < t1; if (!im.visible) return;
      const a = cl((t - t0) / 0.6) * cl((t1 - t) / 0.6); im.count = Math.max(1, Math.floor(N * a));
      for (let i = 0; i < im.count; i++) { const s = S[i], y = topo - ((t * 11 * s[3] + s[2] * topo) % topo);
        M.makeTranslation(cx + (s[0] - 0.5) * sw, y, cz + (s[1] - 0.5) * sd); im.setMatrixAt(i, M); }
      im.instanceMatrix.needsUpdate = true; }, 1);
    this.som('chuva', t0, 0.7, t1 - t0);
  }
  // poeira / respingo: nuvenzinha de bolinhas que abre e some
  poeira(ponto, quando, o = {}) {
    const t0 = this.t(quando), c = V3(ponto), N = o.n || 10, R = rng(3 + this._id++), g = new THREE.Group(), d = o.dur || 0.7, raio = o.raio || 0.35;
    const mat = new THREE.MeshStandardMaterial({ color: o.cor || 0xb9a183, roughness: 1, transparent: true });
    const P = []; for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(raio * (0.18 + R() * 0.2), 8, 6), mat); g.add(m); P.push([R() * 6.28, 0.4 + R() * 0.6, R()]); }
    g.position.copy(c); this.scene.add(g);
    this.track(t => { const k = (t - t0) / d; g.visible = k > 0 && k < 1; if (!g.visible) return; mat.opacity = 0.85 * (1 - k);
      g.children.forEach((m, i) => { const [a, r, h] = P[i], e = easeOut(k); m.position.set(Math.cos(a) * raio * r * e, h * raio * e * (o.sobe ?? 0.8), Math.sin(a) * raio * r * e); m.scale.setScalar(0.5 + e); }); }, 1);
  }

  // ------------------------------------------------------------ CÂMERA CONTÍNUA
  // cam(quando, posição, alvo, fov). Um único plano: o motor interpola suave entre os pontos.
  camera(quando, pos, alvo, fov = 45) { this.camKeys.push({ t: this.t(quando), p: V3(pos), a: V3(alvo), f: fov }); this.camKeys.sort((x, y) => x.t - y.t); }
  // PLANO ("segura e pula", como as referências): a câmera SEGURA o enquadramento atual até 'quando' e então
  // vai rápido e suave (0,3–0,6 s, sem embalo) para o novo enquadramento, e segura de novo.
  plano(quando, pos, alvo, fov = 45, o = {}) { const t = this.t(quando), dur = o.dur ?? 0.45, K = this.camKeys, ant = K.filter(k => k.t <= t).pop();
    if (ant) K.push({ t, p: ant.p.clone(), a: ant.a.clone(), f: ant.f, ease: true });
    K.push({ t: t + dur, p: V3(pos), a: V3(alvo), f: fov, ease: true, chicote: dur }); K.sort((x, y) => x.t - y.t); }
  // CORTE seco: a imagem troca de uma vez (fora → dentro, mudança de escala, interior). A inspeção aceita o salto da câmera aqui.
  corte(quando, pos, alvo, fov = 45) { const t = this.t(quando), K = this.camKeys, ant = K.filter(k => k.t <= t).pop();
    if (ant) K.push({ t: t - 0.001, p: ant.p.clone(), a: ant.a.clone(), f: ant.f, ease: true });
    K.push({ t, p: V3(pos), a: V3(alvo), f: fov, ease: true, corte: true }); K.sort((x, y) => x.t - y.t); }
  _cam(t) {
    const K = this.camKeys, c = this.cam; if (!K.length) return;
    let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
    const k0 = K[i], k1 = K[Math.min(i + 1, K.length - 1)], dt = Math.max(1e-6, k1.t - k0.t), u = cl((t - k0.t) / dt);
    const tan = (j, key) => { if (K[j].ease) return key === 'f' ? 0 : new THREE.Vector3(); const a = K[Math.max(0, j - 1)], b = K[Math.min(K.length - 1, j + 1)], d = Math.max(1e-6, b.t - a.t);
      return key === 'f' ? (b.f - a.f) / d : b[key].clone().sub(a[key]).divideScalar(d); };
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const herm = key => k0[key].clone().multiplyScalar(h00).addScaledVector(tan(i, key), h10 * dt).addScaledVector(k1[key], h01).addScaledVector(tan(i + 1, key), h11 * dt);
    const p = K.length === 1 ? k0.p.clone() : herm('p'), a = K.length === 1 ? k0.a.clone() : herm('a');
    const f = K.length === 1 ? k0.f : h00 * k0.f + h10 * dt * tan(i, 'f') + h01 * k1.f + h11 * dt * tan(i + 1, 'f');
    // respiração: a câmera nunca fica parada
    const d = p.distanceTo(a), w = 0.012 * d;
    p.x += Math.sin(t * 0.53) * w; p.y += Math.sin(t * 0.41 + 1.3) * w * 0.6; p.z += Math.cos(t * 0.47 + 0.6) * w;
    c.position.copy(p); c.fov = f; c.updateProjectionMatrix(); c.lookAt(a); this._alvo = a;
  }

  // ------------------------------------------------------------ MASCOTE
  mascote(o = {}) {
    const c = makeChar({ ph: o.fase ?? 1.3, ...o }); if (o.pos) c.position.set(...o.pos); if (o.rotY != null) c.rotation.y = o.rotY;
    if (o.escala) c.scale.setScalar(o.escala); this.scene.add(c); c.userData.mascote = true; c.userData.tipo = 'personagem'; this.registrar(c, o.nome || 'personagem');
    this.track(t => animateChar(c, this._keysDe(c), t), 2); return c;
  }
  // anima(mascote, [[quando, 'pose', dur], ...]) — poses: idle, walk, wave, cheer, jump, point(reach), scared, worried, shrug, ache, dizzy...
  anima(c, keys) { c.userData._poses = keys.map(k => [this.t(k[0]), k[1], k[2] ?? 0.5]); c.userData._keys = null; }
  _keysDe(c) {
    const U = c.userData; if (U._keys) return U._keys;
    const base = (U._poses && U._poses.length ? U._poses : [[-1, 'idle', 0.3]]).slice().sort((a, b) => a[0] - b[0]);
    if (base[0][0] > -0.5) base.unshift([-1, base[0][1], 0.3]);
    const K = base.slice();
    for (const [a, b] of (U._andar || [])) { let antes = 'idle'; for (const k of base) if (k[0] <= b && k[1] !== 'walk') antes = k[1]; K.push([a, 'walk', 0.18], [b - 0.12, antes, 0.3]); }
    return (U._keys = K.sort((x, y) => x[0] - y[0]));
  }

  // modelo(arquivo.glb, {altura | comprimento | escala, giraY, cor}) — devolve o modelo centralizado, com a base em y=0.
  // Para a inspeção ele conta como UMA caixa (rápido e sem falsos alarmes entre as pecinhas do próprio modelo).
  async modelo(arq, o = {}) {
    const tent = [`../projetos/${this.proj.slug}/modelos/${arq}`, `../modelos/${arq}`]; let gltf = null, err;
    for (const u of tent) { try { gltf = await new GLTFLoader().loadAsync(u); break; } catch (e) { err = e; } }
    if (!gltf) throw new Error('modelo não encontrado: ' + arq + ' — ' + err);
    const g = gltf.scene, mats = new Set();
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x)); } });
    for (const m of mats) {                                  // materiais antigos "specular-glossiness" (Sketchfab): recupera cor e textura
      const sg = m.userData && m.userData.gltfExtensions && m.userData.gltfExtensions.KHR_materials_pbrSpecularGlossiness;
      if (sg) { if (sg.diffuseFactor) m.color.setRGB(sg.diffuseFactor[0], sg.diffuseFactor[1], sg.diffuseFactor[2]);
        if (sg.diffuseTexture) { const t = await gltf.parser.getDependency('texture', sg.diffuseTexture.index); t.colorSpace = THREE.SRGBColorSpace; m.map = t; }
        m.metalness = 0; m.roughness = 0.75; m.needsUpdate = true; }
      if (o.cor != null) m.color.set(o.cor);
      if (o.apaga && m.map && m.map.image) {              // cobre trechos da textura (ex.: marca escrita no modelo): [[x0, y0, x1, y1, cor], ...] em pixels
        const im = m.map.image, cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
        for (const [x0, y0, x1, y1, cor] of o.apaga) { cx.fillStyle = cor || '#000000'; cx.fillRect(x0, y0, x1 - x0, y1 - y0); }
        const t = new THREE.CanvasTexture(cv); t.flipY = m.map.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT; t.magFilter = m.map.magFilter; t.minFilter = m.map.minFilter; m.map = t; m.needsUpdate = true; }
    }
    if (o.giraY) g.rotation.y = o.giraY;
    g.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(g), sz = b.getSize(new THREE.Vector3());
    const k = o.escala ?? (o.altura ? o.altura / sz.y : o.comprimento ? o.comprimento / Math.max(sz.x, sz.z) : 1);
    g.scale.multiplyScalar(k); g.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(g);
    const c = b.getCenter(new THREE.Vector3()); g.position.x -= c.x; g.position.z -= c.z; g.position.y -= b.min.y;
    const w = new THREE.Group(); w.add(g); sz = b.getSize(new THREE.Vector3());
    w.userData.tipo = arq.replace(/\.glb$/, ''); w.userData.dim = { x: sz.x, y: sz.y, z: sz.z };
    w.userData._cx = [{ ref: w, box: new THREE.Box3(new THREE.Vector3(-sz.x / 2, 0, -sz.z / 2), new THREE.Vector3(sz.x / 2, sz.y, sz.z / 2)) }];
    return w;
  }

  // ------------------------------------------------------------ QUADRO
  frame(t) {
    if (!this._sorted) { this.tracks.sort((a, b) => a.pri - b.pri || a.n - b.n); this._sorted = true; }
    for (const k of this.tracks) k.fn(t);
    this._cam(t);
    if (this.sol && this._alvo) { this.sol.target.position.copy(this._alvo); this.sol.position.copy(this._alvo).add(this.solDir); }
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.cam);
    const P = {}, v = new THREE.Vector3();
    for (const r of [...this.eventos.rotulos, ...this.eventos.marcas, ...this.eventos.notas, ...this.eventos.medidas]) if (t >= r.t0 - 0.05 && t <= r.t1 + 0.05) {
      v.copy(r.pt()).project(this.cam); P[r.id] = [+((v.x * 0.5 + 0.5) * W).toFixed(1), +((-v.y * 0.5 + 0.5) * H).toFixed(1), v.z < 1 ? 1 : 0]; }
    const cp = this.cam.position;
    return JSON.stringify({ img: this.renderer.domElement.toDataURL('image/jpeg', 0.93), P, cam: [+cp.x.toFixed(3), +cp.y.toFixed(3), +cp.z.toFixed(3)] });
  }
  listaEventos() {
    const e = this.eventos, r = x => +x.toFixed(3);
    return { rotulos: e.rotulos.map(x => ({ id: x.id, txt: x.txt, t0: r(x.t0), t1: r(x.t1) })), marcas: e.marcas.map(x => ({ id: x.id, tipo: x.tipo, t0: r(x.t0), t1: r(x.t1) })),
      notas: e.notas.map(x => ({ id: x.id, txt: x.txt, cor: x.cor, t0: r(x.t0), t1: r(x.t1) })), medidas: e.medidas.map(x => ({ id: x.id, txt: x.txt, t0: r(x.t0), t1: r(x.t1) })),
      icones: e.icones.map(x => ({ tipo: x.tipo, t0: r(x.t0), t1: r(x.t1) })), cta: e.cta,
      sons: e.sons.slice().sort((a, b) => a.t - b.t), cam: this.camKeys.map(k => r(k.t)) };
  }
}
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _e = new THREE.Euler();
