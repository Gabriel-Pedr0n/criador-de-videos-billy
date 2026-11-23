import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
// ===== BILLY (canal Billy Constrói) — rounded character with smooth, natural animation =====
// Joints: root > spine(hips) > [torso, arms(shoulder>elbow), head]; root > legs(hip>knee)
function makeChar(o = {}) {
  const g = new THREE.Group();
  const Pm = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const B = !o.simples;   // Billy completo (padrão)
  const skin = Pm(o.skin || 0xE8AE84, 0.68), shirt = Pm(o.shirt || 0xF2B820, 0.82), pants = Pm(o.pants || 0x22305E, 0.6), white = Pm(0xF6F6F6, 0.35),
    shoe = Pm(o.shoe || 0x2F6FD8, 0.45), blk = Pm(0x141414, 0.3), pink = Pm(0xF08C8C);
  const mesh = (geo, m, x, y, z, parent, sx = 1, sy = 1, sz = 1) => { const q = new THREE.Mesh(geo, m); q.position.set(x, y, z); q.scale.set(sx, sy, sz); q.castShadow = true; parent.add(q); return q; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 10, 24), sph = r => new THREE.SphereGeometry(r, 36, 26);
  const legs = {}, knees = {};
  for (const [nm, x] of [['legL', -0.1], ['legR', 0.1]]) {
    const L = new THREE.Group(); L.position.set(x, 0.62, 0); g.add(L);
    mesh(cap(0.105, 0.1), pants, 0, -0.06, 0, L);
    mesh(cap(0.07, 0.12), o.longPants ? pants : skin, 0, -0.17, 0, L);
    const K = new THREE.Group(); K.position.set(0, -0.3, 0); L.add(K);
    mesh(cap(0.066, 0.12), o.longPants ? pants : skin, 0, -0.12, 0, K);
    mesh(sph(0.1), shoe, 0, -0.265, 0.045, K, 1, 0.62, 1.45);
    mesh(new THREE.CylinderGeometry(0.098, 0.1, 0.03, 24), o.longPants ? blk : white, 0, -0.32, 0.045, K, 1, 1, 1.45);
    legs[nm] = L; knees[nm] = K;
  }
  const spine = new THREE.Group(); spine.position.set(0, 0.62, 0); g.add(spine);
  const torso = mesh(cap(0.215, 0.16), shirt, 0, 0.28, 0, spine, 1, 1, 0.78);
  if (!o.coat) {
    mesh(new THREE.TorusGeometry(0.13, 0.04, 12, 28), shirt, 0, 0.5, -0.02, spine, 1, 1, 0.8).rotation.x = Math.PI / 2;
    for (const x of [-0.05, 0.05]) mesh(cap(0.011, 0.11), white, x, 0.38, 0.165, spine);
  } else { mesh(cap(0.03, 0.3), white, 0, 0.33, 0.16, spine, 1.6, 1, 0.4); mesh(sph(0.03), Pm(0x8a1c1c), 0, 0.46, 0.17, spine, 1.5, 0.7, 0.5); }
  const arms = {}, elbows = {}, hands = {};
  for (const [nm, x] of [['armL', -0.27], ['armR', 0.27]]) {
    const A = new THREE.Group(); A.position.set(x, 0.46, 0); spine.add(A);
    mesh(cap(0.068, 0.08), shirt, 0, -0.08, 0, A);
    const E = new THREE.Group(); E.position.set(0, -0.19, 0); A.add(E);
    mesh(cap(0.064, 0.08), shirt, 0, -0.08, 0, E);
    const side = nm === 'armL' ? 1 : -1;            // palm faces the body: +x for left hand, -x for right
    const Hd = new THREE.Group(); Hd.position.set(0, -0.2, 0); E.add(Hd);
    mesh(sph(0.046), skin, 0, -0.036, 0, Hd, 0.6, 0.95, 1.05);                           // palm
    const fingers = [];
    for (let k = 0; k < 3; k++) {                                                      // index (front), middle, ring
      const zf = 0.027 - k * 0.027, len = [0.05, 0.055, 0.047][k];
      const b = new THREE.Group(); b.position.set(0, -0.07, zf); Hd.add(b);
      mesh(cap(0.0145, len * 0.5), skin, 0, -len * 0.42, 0, b);
      const t2 = new THREE.Group(); t2.position.set(0, -len * 0.9, 0); b.add(t2);
      mesh(cap(0.0138, len * 0.4), skin, 0, -len * 0.36, 0, t2);
      fingers.push([b, t2]);
    }
    const th = new THREE.Group(); th.position.set(side * 0.012, -0.03, 0.038); Hd.add(th);
    mesh(cap(0.016, 0.022), skin, 0, -0.024, 0, th);
    const th2 = new THREE.Group(); th2.position.set(0, -0.046, 0); th.add(th2);
    mesh(cap(0.0148, 0.018), skin, 0, -0.02, 0, th2);
    Hd.userData = { fingers, th, th2, side };
    arms[nm] = A; elbows[nm] = E; hands[nm] = Hd;
  }
  const head = new THREE.Group(); head.position.set(0, 0.74, 0); spine.add(head);
  mesh(sph(0.2), skin, 0, 0, 0, head, 1, 0.97, 0.95);
  const eyes = [];
  for (const x of [-0.072, 0.072]) {
    const e = new THREE.Group(); e.position.set(x, 0.025, 0.172); head.add(e); eyes.push(e);
    if (B) { // olho vivo: branco, íris castanha, pupila, dois brilhos
      mesh(sph(0.036), Pm(0xFBFBF8, 0.3), 0, 0, -0.004, e, 0.92, 1.12, 0.55); mesh(sph(0.024), Pm(0x6A3E1E, 0.3), 0.002, -0.002, 0.009, e, 1, 1.08, 0.5);
      mesh(sph(0.0125), blk, 0.002, -0.002, 0.016, e, 1, 1.05, 0.5); mesh(sph(0.0072), white, -0.008, 0.01, 0.021, e); mesh(sph(0.0035), white, 0.009, -0.011, 0.02, e);
    } else { mesh(sph(0.032), blk, 0, 0, 0, e, 1, 1.2, 0.6); mesh(sph(0.009), white, 0.01, 0.015, 0.018, e); }
    if (!o.beard) mesh(sph(0.034), B ? Pm(0xF4A3A0, 0.8) : pink, x * 1.5, -0.055, 0.155, head, 1.1, 0.55, 0.35);
  }
  mesh(sph(0.022), Pm(0xD9956C), 0, -0.012, 0.192, head);
  let mouth;
  if (B) { // sorriso aberto: boca em "D" com dentes em cima e língua embaixo (a animação estica a boca para falar)
    mouth = new THREE.Group(); mouth.position.set(0, -0.083, 0.177); mouth.rotation.x = -0.45; head.add(mouth);
    const D = (w, h, top) => { const sh = new THREE.Shape(); sh.moveTo(-w, top); sh.quadraticCurveTo(0, top + h * 0.12, w, top); sh.absellipse(0, top, w, h, 0, Math.PI, true); return new THREE.ShapeGeometry(sh, 24); };
    const mm = (geo, c, z) => { const q = new THREE.Mesh(geo, Pm(c, 0.5)); q.position.z = z; mouth.add(q); return q; };
    mm(D(0.037, 0.032, 0.006), 0x4E1712, 0.0); const den = mm(new THREE.PlaneGeometry(0.052, 0.01), 0xFFFFFF, 0.0015); den.position.y = 0.0015;
    const lin = mm(new THREE.CircleGeometry(0.015, 20), 0xE0706A, 0.001); lin.position.y = -0.016; lin.scale.set(1.15, 0.6, 1);
  } else mouth = mesh(sph(0.03), Pm(0x6B2A1A, 0.5), 0, -0.085, 0.178, head, 1.1, 0.8, 0.5);
  for (const x of [-0.2, 0.2]) mesh(sph(0.04), skin, x, 0, 0, head, 0.6, 1, 1);
  if (o.beard) { mesh(sph(0.15), Pm(0x9a9a9a, 0.9), 0, -0.12, 0.06, head, 1.05, 0.9, 0.85); mouth.position.set(0, -0.07, 0.2); }
  const hat = o.hat || 'helmet';
  if (hat === 'helmet') {
    const helM = new THREE.MeshPhysicalMaterial({ color: 0xF4F3EE, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.45 });
    const HG = new THREE.Group(); head.add(HG); g.userData.capacete = HG; if (B) { HG.rotation.x = -0.2; HG.position.set(0, 0.012, -0.012); }
    const hel = new THREE.Mesh(new THREE.SphereGeometry(0.215, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), helM); hel.castShadow = true; hel.position.y = 0.06; HG.add(hel);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.018, 14, 64), helM); brim.rotation.x = Math.PI / 2; brim.position.y = 0.065; HG.add(brim);
    const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.2, 8, 14), helM); ridge.rotation.x = Math.PI / 2; ridge.position.set(0, 0.27, 0); HG.add(ridge);
  } else if (hat === 'top') {
    const hm = Pm(0x1b1b22, 0.5); const hg = new THREE.Group(); hg.position.y = 0.13; head.add(hg);
    mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 32), hm, 0, 0, 0, hg); mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.3, 32), hm, 0, 0.16, 0, hg);
    mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.05, 32), Pm(0x8a1c1c), 0, 0.04, 0, hg); g.userData.hat = hg;
  } else if (hat === 'cap') {
    const hm = Pm(o.capCol || 0xd84a4a, 0.6); const c = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm); c.position.y = 0.05; head.add(c);
    mesh(sph(0.12), hm, 0, 0.06, 0.2, head, 1.2, 0.15, 1);
  }
  // ===== DETALHES (v3): roupa, rosto, capacete — só enfeite, não muda proporção nem articulações =====
  if (!o.simples) {
    const tom = (c, k) => { const q = new THREE.Color(c); q.offsetHSL(0, 0, k); return q; };
    const shirtD = Pm(tom(o.shirt || 0xF2B820, -0.07), 0.7), pantsD = Pm(tom(o.pants || 0x22305E, -0.05), 0.65), hair = Pm(o.hair || 0x7A4B2A, 0.85),
      metal = new THREE.MeshStandardMaterial({ color: 0xC9CED3, roughness: 0.3, metalness: 0.8 }), orange = Pm(0xFF7A1A, 0.45), skinD = Pm(0xD98F6A, 0.6);
    if (!o.coat) {
      // capuz nas costas, barra e bolso canguru do moletom
      mesh(sph(0.13), shirtD, 0, 0.47, -0.105, spine, 1.25, 0.62, 0.55);                                   // capuz caído nas costas
      mesh(new THREE.TorusGeometry(0.186, 0.022, 12, 48), shirtD, 0, 0.1, 0, spine, 1, 1, 0.8).rotation.x = Math.PI / 2;
      const bolso = mesh(new THREE.CapsuleGeometry(0.045, 0.14, 8, 16), shirtD, 0, 0.13, 0.152, spine, 1, 1, 0.32); bolso.rotation.z = Math.PI / 2;
      for (const x of [-0.105, 0.105]) { const b = mesh(cap(0.006, 0.07), Pm(tom(o.shirt || 0xF2B820, -0.18), 0.7), x, 0.135, 0.165, spine); b.rotation.z = x > 0 ? -0.35 : 0.35; }
      for (const x of [-0.05, 0.05]) mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.022, 14), metal, x, 0.31, 0.165, spine);   // pontas dos cordões
      if (o.nome !== false) { // crachá "BILLY" no peito (lado esquerdo dele)
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const cx = cv.getContext('2d');
        cx.fillStyle = '#FFFFFF'; cx.beginPath(); cx.roundRect(4, 4, 248, 104, 26); cx.fill(); cx.strokeStyle = '#22305E'; cx.lineWidth = 8; cx.stroke();
        cx.fillStyle = '#22305E'; cx.font = 'bold 66px Poppins, Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(o.nome || 'BILLY', 128, 60);
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.037), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, transparent: true })); tag.position.set(0.098, 0.405, 0.163); tag.rotation.set(-0.12, 0.42, 0); spine.add(tag); }
    }
    // punhos das mangas
    for (const E of Object.values(elbows)) mesh(new THREE.TorusGeometry(0.058, 0.017, 10, 28), o.coat ? white : shirtD, 0, -0.158, 0, E).rotation.x = Math.PI / 2;
    // cós e barra do short, faixa lateral
    for (const [nm, L] of Object.entries(legs)) { const sd = nm === 'legL' ? -1 : 1;
      if (!o.longPants) mesh(new THREE.TorusGeometry(0.098, 0.017, 10, 32), pantsD, 0, -0.135, 0, L).rotation.x = Math.PI / 2;
      mesh(cap(0.007, 0.13), white, sd * 0.104, -0.06, 0, L);
      // meia, lingueta, cadarço e biqueira do tênis
      const K = knees[nm]; if (!o.longPants) mesh(new THREE.CylinderGeometry(0.068, 0.07, 0.05, 24), white, 0, -0.225, 0.0, K);
      mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), shoe, 0, -0.225, 0.075, K).rotation.x = -0.35;
      for (let i = 0; i < 3; i++) { const c = mesh(cap(0.007, 0.06), white, 0, -0.247 - i * 0.006, 0.09 + i * 0.03, K); c.rotation.z = Math.PI / 2; }
      mesh(sph(0.07), white, 0, -0.29, 0.14, K, 1.15, 0.45, 0.8);
    }
    // rosto: íris castanha com dois brilhos, sobrancelhas, orelha com dobra, cabelo saindo do capacete
    // sobrancelhas grossas e expressivas (U.brows: a animação pode subir/descer)
    const brows = []; for (const x of [-0.074, 0.074]) { const bg = new THREE.Group(); bg.position.set(x, 0.083, 0.172); bg.rotation.set(-0.35, 0, x > 0 ? -0.16 : 0.16); head.add(bg); brows.push(bg);
      const b = mesh(cap(0.0088, 0.036), Pm(0x6B4123, 0.85), 0, 0, 0, bg, 1, 1, 0.6); b.rotation.z = Math.PI / 2; }
    g.userData.brows = brows;
    // ÓCULOS DE SOL do Billy (v2.8, pedido do dono do canal): retângulo largo de cantos bem arredondados, armação laranja grossa e
    // brilhante, lentes marrom-escuras com reflexo. Acompanham a curva do rosto (cilindro de raio RG) e cobrem os olhos.
    if (B && !o.semOculos) {
      const RG = 0.213, rr = (w, h, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
        sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
        sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };
      const dobra = (geo, cx, z0, suave) => { if (suave) { geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-5); } geo.translate(cx, 0, 0); const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, P.getZ(i) + Math.sqrt(RG * RG - x * x) + z0); } geo.computeVertexNormals(); return geo; };
      const GO = new THREE.Group(); GO.position.set(0, 0.012, 0); head.add(GO); g.userData.oculos = GO;
      const frameM = new THREE.MeshStandardMaterial({ color: 0xF2761C, roughness: 0.28, metalness: 0.0 });
      const lensM = new THREE.MeshStandardMaterial({ color: 0x1B0F09, roughness: 0.05, metalness: 0.45 });
      const glareM = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.42, depthWrite: false });
      for (const sx of [-1, 1]) {
        const cx = sx * 0.076;
        const fs = rr(0.132, 0.094, 0.036); fs.holes.push(rr(0.1, 0.064, 0.024));
        const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 });
        const fm = new THREE.Mesh(dobra(fg, cx, 0, true), frameM); fm.castShadow = false; GO.add(fm);
        const lg = new THREE.ExtrudeGeometry(rr(0.104, 0.068, 0.026), { depth: 0.006, bevelEnabled: false, curveSegments: 10 });
        const lm = new THREE.Mesh(dobra(lg, cx, 0.004), lensM); GO.add(lm);
        // reflexo: duas faixas inclinadas no canto de cima, de fora para dentro
        for (const [dx, w] of [[-0.022, 0.016], [0.004, 0.007]]) { const gs = new THREE.Shape(); gs.moveTo(0, 0); gs.lineTo(w, 0); gs.lineTo(w + 0.022, 0.044); gs.lineTo(0.022, 0.044); gs.closePath();
          const gg = new THREE.ShapeGeometry(gs); gg.translate(cx + dx - 0.018, -0.022, 0); const P = gg.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sqrt(RG * RG - P.getX(i) * P.getX(i)) + 0.0125);
          const gm = new THREE.Mesh(gg, glareM); gm.renderOrder = 3; GO.add(gm); }
      }
      // ponte grossa e hastes laranja que seguem a lateral da cabeça até a orelha
      const pg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.016), frameM); pg.position.set(0, 0.018, RG + 0.006); GO.add(pg);
      for (const sx of [-1, 1]) { const A = new THREE.Vector3(sx * 0.142, 0.018, 0.158), Bp = new THREE.Vector3(sx * 0.21, 0.016, 0.05), d = Bp.clone().sub(A);
        const hs = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, d.length()), frameM); hs.position.copy(A.clone().add(Bp).multiplyScalar(0.5)); hs.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()); GO.add(hs); }
    }
    // franja castanha escapando do capacete
    for (const [x, rz, l] of [[-0.075, 0.55, 0.03], [-0.045, 0.35, 0.036], [-0.012, 0.2, 0.03]]) { const t = mesh(cap(0.012, l), hair, x, 0.104, 0.166, head, 1, 1, 0.7); t.rotation.set(0.35, 0, rz); }
    // sardas
    for (const sx of [-1, 1]) for (const [dx, dy] of [[0.05, -0.03], [0.064, -0.041], [0.058, -0.052], [0.075, -0.03]]) mesh(sph(0.0036), Pm(0xC98B68, 0.8), sx * dx, dy, Math.sqrt(0.0361 - dx * dx - dy * dy) * 0.95 + 0.001, head, 1, 1, 0.15);
    // lápis atrás da orelha direita
    { const lp = new THREE.Group(); lp.position.set(-0.205, 0.075, 0.0); lp.rotation.set(0.25, 0, 1.25); head.add(lp);
      mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.12, 6), Pm(0xF5C518, 0.55), 0, 0, 0, lp); mesh(new THREE.CylinderGeometry(0.0098, 0.0098, 0.014, 12), metal, 0, -0.065, 0, lp);
      mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.016, 12), Pm(0xF08C9A, 0.7), 0, -0.079, 0, lp);
      const ponta = mesh(new THREE.ConeGeometry(0.0095, 0.028, 6), Pm(0xE8C9A0, 0.8), 0, 0.074, 0, lp); mesh(new THREE.ConeGeometry(0.0035, 0.01, 8), Pm(0x2A2A2A, 0.5), 0, 0.009, 0, ponta); }
    for (const x of [-0.072, 0.072]) { const b = mesh(cap(0.0085, 0.036), hair, x, 0.071, 0.176, head); b.rotation.z = Math.PI / 2 + (x > 0 ? -0.18 : 0.18); }
    for (const x of [-0.2, 0.2]) mesh(sph(0.022), skinD, x * 1.04, 0, 0.012, head, 0.5, 1, 1);
    if (hat !== 'top') for (const x of [-0.178, 0.178]) mesh(sph(0.034), hair, x, 0.05, 0.035, head, 0.45, 1, 0.85);   // costeletas
    if (hat === 'helmet') { // faixa refletiva laranja
      const fx = new THREE.Mesh(new THREE.TorusGeometry(0.2165, 0.0115, 10, 64), orange); fx.rotation.x = Math.PI / 2; fx.position.y = 0.11; (g.userData.capacete || head).add(fx);
    }
  }
  Object.assign(g.userData, { legL: legs.legL, legR: legs.legR, kneeL: knees.legL, kneeR: knees.legR, armL: arms.armL, armR: arms.armR,
    elbowL: elbows.armL, elbowR: elbows.armR, handL: hands.armL, handR: hands.armR, head, mouth, spine, torso, eyes, ph: o.ph !== undefined ? o.ph : Math.random() * 10 });
  return g;
}
function resetPose(c) {}

// ---------------- pose library (radians). arm x<0 = forward/up, elbow x<0 = bend, knee x>0 = bend
const POSES = {
  idle:     { armL: [0.06, 0, 0.12], armR: [0.06, 0, -0.12], elL: -0.25, elR: -0.25, legL: [0, 0, 0.02], legR: [0, 0, -0.02], knL: 0.05, knR: 0.05, head: [0, 0, 0], spine: [0, 0, 0], mouth: [1.1, 0.8], y: 0, flail: 0, idle: 1 },
  scaredLook: { armL: [-1.75, 0, 0.3], armR: [-0.55, 0, -0.45], elL: -1.75, elR: -0.95, legL: [0.05, 0, 0.05], legR: [-0.1, 0, -0.05], knL: 0.18, knR: 0.12, head: [-0.28, -0.3, 0.08], spine: [0.1, 0.1, 0], mouth: [1.15, 1.6], y: -0.02, flail: 0.15, idle: 0.6 },
  scared:   { armL: [-0.75, 0, 0.55], armR: [-0.75, 0, -0.55], elL: -1.3, elR: -1.3, legL: [0, 0, 0.06], legR: [0, 0, -0.06], knL: 0.15, knR: 0.15, head: [0.05, 0, 0], spine: [0.08, 0, 0], mouth: [1.2, 1.5], y: -0.02, flail: 0.12, idle: 0.6 },
  worried:  { armL: [-0.95, 0, 0.35], armR: [-0.95, 0, -0.35], elL: -1.25, elR: -1.25, legL: [0, 0, 0.04], legR: [0, 0, -0.04], knL: 0.12, knR: 0.12, head: [0.12, 0, 0], spine: [0.14, 0, 0], mouth: [1.15, 1.4], y: -0.01, flail: 0.1, idle: 0.6 },
  duck:     { armL: [-2.55, 0, 0.55], armR: [-2.55, 0, -0.55], elL: -1.85, elR: -1.85, legL: [-0.75, 0, 0.1], legR: [-0.75, 0, -0.1], knL: 1.3, knR: 1.3, head: [0.35, 0, 0], spine: [-0.5, 0, 0], mouth: [1.2, 1.8], y: -0.2, flail: 0.08, idle: 0.3 },
  reach:    { armL: [0.1, 0, 0.15], armR: [-1.25, 0, -0.05], elL: -0.3, elR: -0.25, legL: [0.05, 0, 0.02], legR: [-0.12, 0, -0.02], knL: 0.08, knR: 0.12, head: [0.18, -0.2, 0], spine: [-0.12, 0.18, 0], mouth: [1.1, 0.9], y: 0, flail: 0, idle: 0.7 },
  wave:     { armL: [0.1, 0, 0.15], armR: [-2.65, 0, -0.4], elL: -0.3, elR: -0.45, legL: [0, 0, 0.03], legR: [0, 0, -0.03], knL: 0.05, knR: 0.05, head: [-0.06, 0.15, 0.12], spine: [0, 0.05, -0.05], mouth: [1.6, 0.85], y: 0, flail: 0, idle: 1, wave: 1 },
  float:    { armL: [-2.55, 0, 0.4], armR: [-2.55, 0, -0.4], elL: -0.55, elR: -0.55, legL: [-0.45, 0, 0.12], legR: [0.25, 0, -0.12], knL: 0.7, knR: 0.35, head: [-0.25, 0, 0], spine: [0.08, 0, 0], mouth: [1.3, 1.9], y: 0, flail: 1, idle: 0.2 },
  press:    { armL: [0.08, 0, 0.12], armR: [-1.25, 0, 0.2], elL: -0.3, elR: -0.75, legL: [0, 0, 0.03], legR: [0, 0, -0.03], knL: 0.05, knR: 0.08, head: [0.05, -0.45, 0], spine: [0, -0.15, 0], mouth: [1.1, 0.8], y: 0, flail: 0, idle: 1 },
  squeezed: { armL: [-0.35, 0, 0.05], armR: [-0.35, 0, -0.05], elL: -1.35, elR: -1.35, legL: [0, 0, 0], legR: [0, 0, 0], knL: 0.06, knR: 0.06, head: [0.08, 0, 0.18], spine: [0, 0, 0.05], mouth: [1.2, 1.35], y: 0, flail: 0.05, idle: 0.8, shrug: 1 },
  jump:     { armL: [-2.85, 0, 0.25], armR: [-2.85, 0, -0.25], elL: -0.25, elR: -0.25, legL: [-0.7, 0, 0.1], legR: [-0.7, 0, -0.1], knL: 1.25, knR: 1.25, head: [-0.1, 0, 0], spine: [0, 0, 0], mouth: [1.5, 1.2], y: 0, flail: 0.2, idle: 0.2 },
  dizzy:    { armL: [0.15, 0, 0.5], armR: [0.15, 0, -0.5], elL: -0.2, elR: -0.2, legL: [0, 0, 0.12], legR: [0, 0, -0.12], knL: 0.25, knR: 0.25, head: [0.1, 0, 0], spine: [0, 0, 0], mouth: [1.2, 1.0], y: -0.03, flail: 0, idle: 0.5, dizzy: 1 },
  cheer:    { armL: [-2.75, 0, 0.35], armR: [-2.75, 0, -0.35], elL: -0.35, elR: -0.35, legL: [0, 0, 0.05], legR: [0, 0, -0.05], knL: 0.1, knR: 0.1, head: [-0.12, 0, 0], spine: [0.05, 0, 0], mouth: [1.5, 1.2], y: 0, flail: 0, idle: 0.6, bounce: 1 },
  hatUp:    { armL: [0.1, 0, 0.12], armR: [-2.75, 0, -0.15], elL: -0.3, elR: -0.6, legL: [0, 0, 0.03], legR: [0, 0, -0.03], knL: 0.05, knR: 0.05, head: [-0.05, 0, -0.08], spine: [0.04, 0, 0], mouth: [1.4, 0.9], y: 0, flail: 0, idle: 0.8 },
  chopUp:   { armL: [-0.4, 0, 0.2], armR: [-2.7, 0, -0.05], elL: -0.8, elR: -0.7, legL: [-0.15, 0, 0.05], legR: [0.15, 0, -0.05], knL: 0.15, knR: 0.1, head: [-0.15, 0, 0], spine: [0.15, 0, 0], mouth: [1.1, 0.8], y: 0, flail: 0, idle: 0.5 },
  chopDown: { armL: [-0.2, 0, 0.2], armR: [-0.2, 0, -0.05], elL: -0.5, elR: -0.15, legL: [-0.15, 0, 0.05], legR: [0.15, 0, -0.05], knL: 0.2, knR: 0.15, head: [0.15, 0, 0], spine: [-0.25, 0, 0], mouth: [1.1, 0.8], y: -0.02, flail: 0, idle: 0.5 },
  walk:     { armL: [0.05, 0, 0.1], armR: [0.05, 0, -0.1], elL: -0.35, elR: -0.35, legL: [0, 0, 0], legR: [0, 0, 0], knL: 0.05, knR: 0.05, head: [-0.05, 0, 0], spine: [-0.05, 0, 0], mouth: [1.4, 0.85], y: 0, flail: 0, idle: 0.6, walk: 1 },
};
POSES.ache = { armL: [-0.55, 0, 0.25], armR: [-0.55, 0, -0.25], elL: -1.5, elR: -1.5, legL: [-0.1, 0, 0.08], legR: [-0.1, 0, -0.08], knL: 0.35, knR: 0.35, head: [0.3, 0, 0.1], spine: [-0.3, 0, 0], mouth: [1.2, 0.6], y: -0.06, flail: 0.04, idle: 0.6 };
POSES.shrug = { armL: [-0.35, 0, 0.75], armR: [-0.35, 0, -0.75], elL: -1.3, elR: -1.3, legL: [0, 0, 0.04], legR: [0, 0, -0.04], knL: 0.05, knR: 0.05, head: [-0.05, 0, 0.15], spine: [0, 0, 0], mouth: [1.6, 0.8], y: 0, flail: 0, idle: 0.8 };
POSES.gulp = { armL: [0.05, 0, 0.15], armR: [-1.3, 0, -0.1], elL: -0.3, elR: -2.0, legL: [0, 0, 0.03], legR: [0, 0, -0.03], knL: 0.05, knR: 0.05, head: [-0.2, 0, 0], spine: [0.05, 0, 0], mouth: [0.9, 0.5], y: 0, flail: 0, idle: 0.4 };
POSES.chew = { armL: [0.06, 0, 0.12], armR: [0.06, 0, -0.12], elL: -0.25, elR: -0.25, legL: [0, 0, 0.02], legR: [0, 0, -0.02], knL: 0.05, knR: 0.05, head: [-0.05, 0, 0.05], spine: [0, 0, 0], mouth: [1.1, 0.8], y: 0, flail: 0, idle: 1, chew: 1 };
POSES.blow = { armL: [0.06, 0, 0.12], armR: [0.06, 0, -0.12], elL: -0.25, elR: -0.25, legL: [0, 0, 0.02], legR: [0, 0, -0.02], knL: 0.05, knR: 0.05, head: [-0.08, 0, 0], spine: [0.03, 0, 0], mouth: [0.7, 0.7], y: 0, flail: 0, idle: 0.5 };
const HP = {
  relax: [0.35, 0.35, 0.4, 0.4, 0.45, 0.45, 0.55, 0.35, 0, 0],
  open:  [0.05, 0.05, 0.05, 0.05, 0.08, 0.06, 0.95, 0.0, 0, 0],
  fist:  [1.5, 1.6, 1.55, 1.6, 1.6, 1.6, 0.25, 1.1, 0, 0],
  grip:  [1.15, 1.15, 1.2, 1.15, 1.25, 1.15, 0.9, 0.75, 0, 0],
  point: [0.0, 0.02, 1.55, 1.6, 1.6, 1.6, 0.3, 1.0, -0.15, 0],
  face:  [0.15, 0.1, 0.2, 0.12, 0.25, 0.15, 0.8, 0.2, 0.25, 0],
};
const HKEY = { idle: ['relax', 'relax'], scaredLook: ['face', 'open'], scared: ['open', 'open'], worried: ['open', 'open'], duck: ['open', 'open'],
  reach: ['relax', 'grip'], wave: ['relax', 'open'], float: ['open', 'open'], press: ['relax', 'point'], squeezed: ['fist', 'fist'], jump: ['open', 'open'],
  dizzy: ['relax', 'relax'], cheer: ['open', 'open'], hatUp: ['relax', 'grip'], chopUp: ['relax', 'grip'], chopDown: ['relax', 'grip'], walk: ['relax', 'relax'], ache: ['open', 'open'], shrug: ['open', 'open'], gulp: ['relax', 'face'], chew: ['relax', 'relax'], blow: ['relax', 'relax'] };
for (const k in POSES) { const h = HKEY[k] || ['relax', 'relax']; POSES[k].hL = HP[h[0]].slice(); POSES[k].hR = HP[h[1]].slice(); }
const NUMKEYS = ['chew', 'elL', 'elR', 'knL', 'knR', 'y', 'flail', 'idle', 'wave', 'shrug', 'dizzy', 'bounce', 'walk'];
const VECKEYS = ['armL', 'armR', 'legL', 'legR', 'head', 'spine'];
function mixPose(a, b, w) {
  const r = {};
  for (const k of VECKEYS) r[k] = [0, 1, 2].map(i => a[k][i] + (b[k][i] - a[k][i]) * w);
  for (const k of NUMKEYS) r[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * w;
  r.mouth = [0, 1].map(i => a.mouth[i] + (b.mouth[i] - a.mouth[i]) * w);
  r.hL = a.hL.map((v, i) => v + (b.hL[i] - v) * w); r.hR = a.hR.map((v, i) => v + (b.hR[i] - v) * w);
  return r;
}
// keys: [[time, poseName, transitionSeconds?], ...] sorted
function poseAt(keys, t) {
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  let pose = POSES[keys[0][1]];
  // replay chain so a transition starts from wherever the previous one was
  for (let j = 1; j <= i; j++) {
    const [tj, nm, d = 0.5] = keys[j];
    const w = clamp((t - tj) / d); const e = w * w * (3 - 2 * w);
    pose = mixPose(pose, POSES[nm], j === i ? e : 1);
  }
  const tk = i > 0 ? keys[i][0] : -99;
  return [pose, t - tk];
}
function animateChar(c, keys, t, extra = {}) {
  const U = c.userData, ph = U.ph;
  const [p, since] = poseAt(keys, t);
  const idle = p.idle, fl = p.flail;
  const s = (f, o = 0) => Math.sin(t * f + ph + o);
  // follow-through after a pose change (damped wobble)
  const ft = since >= 0 && since < 1.5 ? Math.sin(since * 13) * Math.exp(-since * 5.5) : 0;
  const breath = s(2.3) * 0.022;
  const set = (o, v, ax = 0, ay = 0, az = 0) => o.rotation.set(v[0] + ax, v[1] + ay, v[2] + az);
  set(U.spine, p.spine, breath + 0.02 * s(0.6, 1) * idle + 0.05 * ft, 0.05 * s(0.43, 2) * idle, 0.03 * s(0.9) * idle);
  U.torso.scale.set(1 + 0.012 * s(2.3), 1 + 0.018 * s(2.3), 0.78 * (1 + 0.012 * s(2.3)));
  // head: slow look-around + reaction wobble
  let hx = 0.04 * s(0.71, 3) * idle - 0.12 * ft, hy = 0.12 * s(0.37, 4) * idle, hz = 0.04 * s(0.53, 5) * idle;
  if (p.dizzy > 0) { hx += 0.14 * Math.sin(t * 5) * p.dizzy; hz += 0.18 * Math.cos(t * 5) * p.dizzy; }
  set(U.head, p.head, hx, hy, hz);
  // arms
  const sw = 0.05 * idle;
  let aLx = sw * s(1.1, 6) + fl * 0.35 * s(8.5, 0.3) + 0.15 * ft, aRx = sw * s(1.1, 7.5) + fl * 0.35 * s(8.1, 1.9) + 0.15 * ft;
  let aLz = fl * 0.2 * s(6.3, 2), aRz = -fl * 0.2 * s(6.7, 4);
  if (p.wave > 0) aRz += 0.35 * Math.sin(t * 7.5) * p.wave;
  if (p.shrug > 0) { aLz += 0.08 * s(3.1) * p.shrug; aRz -= 0.08 * s(3.1) * p.shrug; }
  if (p.bounce > 0) { aLz += 0.15 * Math.sin(t * 9 + ph) * p.bounce; aRz -= 0.15 * Math.sin(t * 9 + ph) * p.bounce; }
  set(U.armL, p.armL, aLx, 0, aLz); set(U.armR, p.armR, aRx, 0, aRz);
  U.elbowL.rotation.set(p.elL + 0.08 * s(1.3, 1) * idle + fl * 0.3 * s(9.1), 0, 0);
  U.elbowR.rotation.set(p.elR + 0.08 * s(1.3, 2) * idle + fl * 0.3 * s(8.7, 1) + (p.wave > 0 ? 0.25 * Math.sin(t * 7.5 + 1) * p.wave : 0), 0, 0);
  // legs (+ walk cycle)
  let lLx = fl * 0.35 * s(6.9), lRx = fl * 0.35 * s(7.3, 2.1), kL = 0, kR = 0, bob = 0;
  if (p.walk > 0) { const wc = t * 9 + ph; lLx += 0.55 * Math.sin(wc) * p.walk; lRx -= 0.55 * Math.sin(wc) * p.walk;
    kL += Math.max(0, -Math.sin(wc - 0.6)) * 0.9 * p.walk; kR += Math.max(0, Math.sin(wc - 0.6)) * 0.9 * p.walk;
    aLx -= 0.45 * Math.sin(wc) * p.walk; aRx += 0.45 * Math.sin(wc) * p.walk; U.armL.rotation.x = p.armL[0] + aLx; U.armR.rotation.x = p.armR[0] + aRx;
    bob = Math.abs(Math.sin(wc)) * 0.03 * p.walk; }
  set(U.legL, p.legL, lLx, 0, 0); set(U.legR, p.legR, lRx, 0, 0);
  U.kneeL.rotation.set(p.knL + kL + fl * 0.25 * Math.max(0, s(6.9)), 0, 0); U.kneeR.rotation.set(p.knR + kR + fl * 0.25 * Math.max(0, s(7.3, 2)), 0, 0);
  // root height (crouch compensates knee bend) + bounce
  const bnc = p.bounce > 0 ? Math.abs(Math.sin(t * 9 + ph)) * 0.12 * p.bounce : 0;
  U.spine.position.y = 0.62 + p.y * 0.6; U.legL.position.y = U.legR.position.y = 0.62 + p.y * 0.6;
  c.userData.rootOffset = p.y * 0.4 + bob + bnc;
  if (c.userData.baseY !== undefined) c.position.y = c.userData.baseY + c.userData.rootOffset; else c.position.y += c.userData.rootOffset;
  // hands: finger curl about the palm axis, thumb opposes, tiny idle fidget
  for (const [Hd, hp, o2] of [[U.handL, p.hL, 0], [U.handR, p.hR, 2]]) {
    if (!Hd) continue; const sd = Hd.userData.side, fid = 0.06 * idle;
    Hd.rotation.set(hp[8] + 0.05 * s(0.9, o2) * idle, 0, sd * (hp[9] + 0.04 * s(1.2, o2)));
    Hd.userData.fingers.forEach((f, k) => { f[0].rotation.set(0, 0, sd * (hp[k * 2] + fid * s(1.7, k + o2))); f[1].rotation.set(0, 0, sd * (hp[k * 2 + 1] + fid * s(1.9, k + 1 + o2))); });
    Hd.userData.th.rotation.set(-hp[6], 0, sd * hp[7] * 0.6); Hd.userData.th2.rotation.set(0, 0, sd * hp[7] * 0.8);
  }
  // mouth + blink + talk-ish jitter
  // voz do Billy (barulhos sem palavras, E.voz): a boca abre e fecha no ritmo do som
  let vo = 0; if (U.vozes) for (const v of U.vozes) if (t >= v.t0 && t <= v.t1) { const u = (t - v.t0) / (v.t1 - v.t0); vo = Math.max(vo, (0.45 + 0.55 * Math.abs(Math.sin(u * v.n * Math.PI))) * Math.min(1, u * 12) * Math.min(1, (1 - u) * 8)); }
  U.mouth.scale.set(p.mouth[0] * (1 - 0.18 * vo), p.mouth[1] * (1 + 0.06 * s(11) + 0.9 * vo) * (1 + (p.chew || 0) * 0.6 * Math.abs(Math.sin(t * 6.5))) , 0.5);
  if (p.chew > 0) U.head.rotation.x += 0.03 * Math.sin(t * 13) * p.chew;
  const bl = ((t + ph * 1.7) % 3.3) < 0.13 ? 0.12 : 1;
  U.eyes.forEach(e => e.scale.y = bl);
  return c.userData.rootOffset;
}

// ---- v2.1: poses revisadas pela auditoria automática (nenhuma parte do corpo entra em outra) ----
const _z = (n, l, r) => { POSES[n].armL[2] = l; POSES[n].armR[2] = r; };
const _lz = (n, l, r) => { POSES[n].legL[2] = l; POSES[n].legR[2] = r; };
for (const n of ['idle', 'chew', 'blow']) _z(n, 0, 0);
_z('walk', 0.03, -0.03); POSES.scaredLook.armL[0] = -1.6;
_z('duck', 0.25, -0.25); _lz('duck', 0.03, -0.1);
for (const n of ['reach', 'gulp', 'press', 'hatUp']) POSES[n].armL[2] = 0.02;
POSES.wave.armL[2] = 0.02; POSES.wave.armR[2] = 0.34; POSES.hatUp.armR[2] = 0.05;
_z('float', -0.22, 0.22); _lz('float', 0.05, -0.05);
_z('jump', -0.18, 0.18); _lz('jump', 0.03, -0.1);
_z('dizzy', -0.45, 0.45); _lz('dizzy', -0.08, 0.08);
_z('cheer', -0.3, 0.3);
POSES.chopUp.armR[2] = 0.02; POSES.chopDown.armL[2] = 0.12;
_lz('ache', 0.02, -0.02);
_z('shrug', -0.3, 0.3);
// sentado dirigindo (rolo compactador, trator): coxas para a frente, joelhos dobrados, mãos no volante
POSES.drive = { armL: [-0.95, 0, -0.1], armR: [-0.95, 0, 0.1], elL: -0.75, elR: -0.75, legL: [-1.45, 0, -0.06], legR: [-1.45, 0, 0.06], knL: 1.45, knR: 1.45, head: [0, 0, 0], spine: [0.04, 0, 0], mouth: [1.2, 0.9], y: 0, flail: 0, idle: 0.5 };
POSES.drive.hL = HP.grip.slice(); POSES.drive.hR = HP.grip.slice();
// gestos naturais do Billy (v2.7): explicar, apontar a peça, mexer na peça, abanar no calor, joinha, cansado de calor, tremendo de frio
POSES.explica = { ...POSES.shrug, head: [-0.03, 0, 0.08], mouth: [1.5, 0.9], idle: 1 };
POSES.aponta = { armL: [0.1, 0, -0.15], armR: [-1.45, 0, -0.3], elL: -0.2, elR: -0.12, legL: [0, 0, 0.03], legR: [0, 0, -0.03], knL: 0.05, knR: 0.05, head: [-0.05, -0.25, 0], spine: [0, 0, 0], mouth: [1.5, 0.85], y: 0, flail: 0, idle: 0.9 };
POSES.mexe = { armL: [-0.85, 0, 0.2], armR: [-0.85, 0, -0.2], elL: -0.45, elR: -0.45, legL: [-0.12, 0, 0.04], legR: [-0.12, 0, -0.04], knL: 0.18, knR: 0.18, head: [0.25, 0, 0], spine: [-0.2, 0, 0], mouth: [1.1, 0.8], y: -0.02, flail: 0, idle: 0.6 };
POSES.abana = { ...POSES.wave, armR: [-2.3, 0, 0.45], elR: -0.8, head: [0.08, 0.1, 0.05], mouth: [1.2, 1.25], idle: 0.8 };
POSES.joinha = { ...POSES.press, head: [-0.05, 0.12, 0.08], spine: [0, 0.05, 0], mouth: [1.7, 0.9] };
POSES.calor = { ...POSES.idle, head: [0.14, 0, 0.07], spine: [-0.06, 0, 0], mouth: [1.3, 1.4], idle: 0.45 };
POSES.frio = { ...POSES.squeezed, mouth: [1.1, 1.3], flail: 0.06 };
for (const [k, h] of Object.entries({ explica: ['open', 'open'], aponta: ['relax', 'point'], mexe: ['grip', 'grip'], abana: ['relax', 'open'], joinha: ['relax', 'fist'], calor: ['relax', 'relax'], frio: ['fist', 'fist'] })) { POSES[k].hL = HP[h[0]].slice(); POSES[k].hR = HP[h[1]].slice(); }
export { makeChar, animateChar, poseAt, POSES };
