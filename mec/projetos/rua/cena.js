// VOCÊ ASFALTA UMA RUA — cena completa (5 blocos)
// Rua ao longo do eixo X. Trecho novo de X0 a X1; vala de corte de X1 a PX (a câmera olha de +X para -X).
export default async function (E, K) {
  const T = E.THREE, C = K.COR, PI = Math.PI;
  const X0 = -10, X1 = 12, PX = 17, ZR = 3.5, L = X1 - X0, XM = (X0 + X1) / 2;
  const COR = { terra: 0xc9a66b, fofa: 0xd7b47c, sub: 0x8a6a45, brita: 0x9a9da0, asfalto: 0x2b2d31, velho: 0x4a4d52 };
  const tex = (g, cor, w, d) => { g.children[0].material.map = K.texRuido(cor, w, d); g.children[0].material.color.set(0xffffff); return g; };
  // faixa no chão da rua que pode "encolher/crescer" a partir de uma ponta (pivô em x = ponta)
  const faixa = (xa, xb, y, alt, tipo, nome, o = {}) => { const w = Math.abs(xb - xa), b = K.bloco(w, alt, o.larg ?? ZR * 2, tipo, o); b.position.x = (xb - xa) / 2;
    const g = new T.Group(); g.add(b); g.userData.tipo = 'camada'; return K.em(g, xa, y, o.z ?? 0, nome); };

  // ================================================================= MUNDO
  K.mundoCampo({ livre: 44, arvores: 34, tufos: 0, sombra: 17, nuvens: 16 });
  const R = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const PAL = [0xf3e2c0, 0xf7c9a0, 0xcfe6c9, 0xbfd9ee, 0xf5e59a, 0xe9c4d0, 0xffffff, 0xd9d0c1], TEL = ['#c8492f', '#b5412a', '#a8482f', '#cf5a36'];
  for (let x = -64; x <= 40; x += 10.5) for (const s of [1, -1]) { const c = K.casa({ w: 6.2 + R() * 2, d: 5.5 + R() * 1.4, cor: PAL[Math.floor(R() * 8)], telhado: TEL[Math.floor(R() * 4)] });
    c.position.set(x + (R() - 0.5), 0, s * (11.6 + R())); c.rotation.y = s > 0 ? PI : 0; E.scene.add(c);
    if (R() < 0.8) { const a = (R() < 0.5 ? K.arvore : K.pinheiro)(3 + R() * 2.5, { seed: Math.floor(R() * 999) }); a.position.set(x + 5.2, 0, s * (9 + R() * 4)); E.scene.add(a); } }
  for (let i = 0; i < 8; i++) { const a = -2.7 + R() * 2.3, d = 140 + R() * 100, p = K.predioFundo(26 + R() * 40, { cor: ['#aab3bf', '#b9c0c9', '#c9cdd3'][i % 3] }); p.position.set(-Math.abs(Math.cos(a) * d) - 30, 0, Math.sin(a) * d); p.rotation.y = R() * 3; E.scene.add(p); }
  const ruaVelha = K.rua(-80, X0, 0, { larg: ZR * 2 }); E.scene.add(ruaVelha);
  { const t = K.texMat('asfaltoVelho').clone(); t.needsUpdate = true; t.repeat.set((X0 + 80) / 1.5, ZR * 2 / 1.5); ruaVelha.children[0].material = new T.MeshStandardMaterial({ map: t, roughness: 0.9 }); }                               // rua antiga, já asfaltada
  for (const x of [-14, -27, -40]) { const p = await E.modelo('light-curved.glb', { altura: 5.2, giraY: PI }); p.position.set(x, 0.1, 4.5); E.scene.add(p); }
  const CAM = [['terraFofa', 0.55], ['terra', 0.75], ['argila', 0.55], ['rocha', 5]];
  const terreno = K.terreno({ x0: X0, x1: 42, z0: -9, z1: 9, prof: 2.4, topo: 'areia', camadas: CAM,
    buracos: [{ x0: X1, x1: 42, z0: -6, z1: 6, prof: 2.3, fundo: 'rocha' }, { x0: X0, x1: X1, z0: -ZR, z1: ZR, prof: 0.55, fundo: 'terra' }] });
  // NADA DE LIMBO: terra maciça embaixo da rua antiga — a parede do corte em X0 mostra as camadas, sem vão
  const parede = K.terreno({ x0: X0 - 1.2, x1: X0, z0: -9, z1: 9, prof: 2.4, topo: 'areia', camadas: CAM, recortaGrama: false }); parede.position.y = -0.021; parede.name = 'terra sob a rua antiga';
  // rampa de acesso: as máquinas descem da rua antiga para a vala por ela (nunca atravessam a parede)
  const RX1 = X0 + 4.6, RY0 = -0.07, RY1 = -0.51, SS = u => u * u * (3 - 2 * u), yRampa = x => RY0 + (RY1 - RY0) * SS(Math.min(1, Math.max(0, (x - X0) / (RX1 - X0))));   // perfil em S: começa e termina sem quina
  const xR = y => { let a = X0, b = RX1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (yRampa(m) > y) a = m; else b = m; } return (a + b) / 2; };
  const desce = (z, ate = RY1, vol = false) => { const xf = ate <= RY1 + 1e-6 ? RX1 : xR(ate), P = []; for (let k = 0; k <= 10; k++) { const x = X0 + (xf - X0) * k / 10; P.push([x, yRampa(x), z]); } return vol ? P.reverse() : P; };
  const rampa = (() => { const sh = new T.Shape(); sh.moveTo(X0, -0.55); sh.lineTo(RX1 + 2.5, -0.55); sh.lineTo(RX1 + 2.5, RY1); for (let k = 20; k >= 0; k--) { const x = X0 + (RX1 - X0) * k / 20; sh.lineTo(x, yRampa(x)); } sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: ZR * 2, bevelEnabled: false }); geo.translate(0, 0, -ZR);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.5, uv.getY(i) / 1.5);
    const t = K.texMat('compactada').clone(); t.needsUpdate = true; t.repeat.set(1, 1); t.wrapS = t.wrapT = T.RepeatWrapping;
    const r = new T.Mesh(geo, new T.MeshStandardMaterial({ map: t, roughness: 1 })); r.receiveShadow = true; r.castShadow = true; E.scene.add(r); E.registrar(r, 'rampa de acesso'); return r; })();
  E.permite(rampa);                     // a rampa fica enterrada sob as camadas novas conforme a rua sobe
  // anda por uma lista de pontos com velocidade constante; inclina na rampa (ry = giro em Y do objeto)
  // suspensão de verdade: as rodas da frente e de trás seguem o chão (perfil = os próprios pontos), o corpo fica na média e inclina entre elas
  const rota = (o, t0, dur, pts, op = {}) => { const ry = op.ry || 0, E2 = (op.eixo ?? 3) / 2, seg = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2])]);
    const tot = seg.reduce((a, q) => a + q[2], 0), em = sAt => { let s0 = Math.max(0, Math.min(tot, sAt)); for (const [a, b, d] of seg) { if (s0 <= d + 1e-9) { const k = d ? s0 / d : 0; return a.map((v, n) => v + (b[n] - v) * k); } s0 -= d; } return pts[pts.length - 1]; };
    const yEm = sAt => sAt < 0 ? pts[0][1] : sAt > tot ? pts[pts.length - 1][1] : em(sAt)[1];
    const N = Math.max(2, Math.ceil(tot / 0.3)); let pri = true;
    for (let k = 1; k <= N; k++) { const sa = tot * k / N, c = em(sa), yf = yEm(sa + E2), yr = yEm(sa - E2), w = Math.atan((yf - yr) / (2 * E2)) * (pts[pts.length - 1][0] >= pts[0][0] ? 1 : -1);
      E.move(o, t0 + dur * (k - 1) / N, { para: [c[0], (yf + yr) / 2, c[2]], rot: [0, ry, ry ? -w : w], dur: dur / N, linear: true, som: pri ? op.som : undefined, inspeciona: pri ? op.inspeciona : false }); pri = false; }
    return t0 + dur; };
  const FORA = -13.5, PE = -10.7;   // estacionamento na rua antiga / pé da rampa

  // ================================================================= PERSONAGEM (o "você": aparece e age o tempo todo)
  const m = E.mascote({ pos: [10.7, 0, 4.5], rotY: 0.86 });                       // abre olhando para a câmera, pá na mão
  E.segura(m, E.pa(), 'direita', { pos: [0, -0.07, 0], rot: [0.5, 0, 0] });
  const tJ = E.t("1:jogar");
  const KM = [["1:ini", 'chopUp', 0.2], [tJ - 0.1, 'chopDown', 0.22], [tJ + 0.3, 'chopUp', 0.22], [tJ + 0.62, 'chopDown', 0.22], [tJ + 0.95, 'chopUp', 0.22], [tJ + 1.27, 'chopDown', 0.22],
    ["1:você#2", 'wave', 0.3], ["1:Vai", 'idle', 0.25], ["1:buracos", 'scared', 0.18], ["1:Porque", 'idle', 0.3], ["1:afunda", 'scared', 0.25], ["1:asfalto#2", 'worried', 0.3], ["1:casca", 'shrug', 0.3],
    ["1:Então", 'idle', 0.25], ["1:raspa", 'wave', 0.3], ["1:Esse", 'reach', 0.3], ["1:subleito", 'cheer', 0.3]];
  const JM = [], JP = [], tp = (t, pos, ry) => E.move(m, t, { para: pos, rot: [0, ry, 0], dur: 0.03, inspeciona: false });
  E.vira(m, tJ - 0.15, 2.7, 0.3); E.vira(m, "1:você#2", 3.0, 0.4);

  // ================================================================= BLOCO 1 — gancho: asfalto direto na terra
  const fofa = faixa(9.5, X0, -0.55, 0.55, 'terraFofa', "terra fofa");                // pivô na ponta perto do corte
  const fofaN = K.em(K.bloco(X1 - 9.5, 0.55, ZR * 2, 'terraFofa'), (9.5 + X1) / 2, -0.55, 0, "terra fofa da ponta");
  E.permite([fofa, fofaN], terreno);
  const placas = [], perto = [];
  for (let i = 0; i < 6; i++) for (const s of [1, -1]) { const p = K.em(K.bloco(3.44, 0.05, 3.44, 'asfalto'), 9.75 - i * 3.5, 0, s * 1.74, "placa de asfalto " + (placas.length + 1));
    E.entra(p, ["1:jogar", i * 0.27 + (s < 0 ? 0.1 : 0)], { modo: 'cai', alt: 0.7, dur: 0.4, ganho: 0.6, inspeciona: false }); placas.push(p); if (i === 0) perto.push(p); }
  E.acelera("1:jogar", "1:terra");
  E.permite(placas, [fofa, fofaN]);
  // o carro chega, a roda cai no buraco
  const carro = await E.modelo('sedan.glb', { escala: 1.35, giraY: PI / 2 }); K.em(carro, -21, 0.05, 1.0, "carro"); E.farois(carro);
  E.permite(carro, [...placas, fofa, fofaN]);
  E.entra(carro, "1:você#2", { modo: 'nada', silencioso: true });
  E.move(carro, "1:você#2", { para: [4.6, 0.05, 1.0], dur: E.t("1:buracos") - E.t("1:você#2"), linear: true, som: 'motor' });
  E.move(carro, "1:buracos", { rot: [0.09, 0, -0.07], por: [0, -0.06, 0], dur: 0.14, som: 'tum' });
  E.move(carro, "1:Porque", { rot: [0, 0, 0], para: [10.1, 0.05, 1.0], dur: 1.0 });
  const buracos = [[5.7, 1.8, 0.7], [3.2, -1.2, 0.6], [7.6, -0.6, 0.55]].map(([x, z, r], i) => { const g = K.grupo(K.cilindro(r, 0.012, 0x7a5a38, { seg: 10, sombra: false }), K.cilindro(r * 0.72, 0.016, 0x2a1c12, { seg: 9, sombra: false }));
    K.em(g, x, 0.05, z, "buraco " + (i + 1)); g.scale.z = 0.8; E.entra(g, ["1:buracos", -0.05 + i * 0.18], { modo: 'pop', dur: 0.25, som: 'erro', ganho: 0.5 }); E.fixo(g); return g; });
  E.permite(buracos, [...placas, carro]);
  E.errado([placas[2], placas[3]], "1:buracos", "1:Porque", { x: [5.0, 0.7, 0.3] });
  [placas[2], placas[3], placas[5]].forEach((p, i) => E.move(p, ["1:buracos", 0.1 + i * 0.1], { rot: [(i % 2 ? 1 : -1) * 0.03, 0, (i % 2 ? -1 : 1) * 0.025], por: [0, -0.02, 0], dur: 0.2, inspeciona: false }));
  // "a terra fofa afunda com o peso dos carros, e o asfalto quebra junto": o personagem vai conferir e afunda junto
  E.anda(m, ["1:Porque", 0.05], ["1:Porque", 0.85], [10.9, 0.05, 2.95], { vira: 1.45 });
  E.nota("TERRA FOFA", [12, -0.32, 2.3], "1:fofa", "1:asfalto#2");
  E.peso(carro, "1:peso", "1:asfalto#2", { n: 2, alt: 0.7 });
  E.move(fofaN, "1:afunda", { escala: [1, 0.727, 1], dur: 0.7, inspeciona: false }); E.move(fofaN, "1:quebra", { escala: [1, 0.6, 1], dur: 0.16, inspeciona: false });
  for (const o of [carro, perto[0], m]) E.move(o, "1:afunda", { por: [0, -0.15, 0], dur: 0.7, inspeciona: false });
  for (const o of [carro, perto[0], m]) E.move(o, "1:quebra", { por: [0, -0.07, 0], dur: 0.16, inspeciona: false });
  E.move(perto[1], "1:quebra", { por: [0, -0.1, 0], rot: [-0.06, 0, -0.04], dur: 0.2, som: 'desaba', inspeciona: false });
  E.errado(perto, "1:quebra", "1:ovo>", { x: [11.98, 0.1, 1.2] });
  E.permite(m, placas);
  // ◀◀ rebobina o jeito errado
  E.rebobina([...placas, carro, ...buracos], ["1:ovo>", -0.2], ["1:Então", 0.1]);
  E.move(fofaN, ["1:ovo>", -0.2], { escala: [1, 1, 1], dur: 0.5, inspeciona: false });
  E.move(m, ["1:ovo>", -0.2], { para: [10.9, 0, 2.95], dur: 0.45, inspeciona: false });
  E.anda(m, ["1:Então", 0.1], ["1:Então", 0.75], [11.3, 0, 4.25], { vira: 2.9 });
  // jeito certo: raspa a terra solta...
  const trator = await E.modelo('tractor-shovel.glb', { escala: 1.4, giraY: PI / 2 }); K.em(trator, -4.4, -0.55, 0, "trator"); E.farois(trator, { y: 0.56, z: 0.4, x: 0.42, larg: 0.16 });
  E.permite(trator, [fofa, fofaN]); E.permite(rampa, [fofa, fofaN]);
  const tT = E.t("1:Então") + 0.15, dT = E.t("1:solta>") - tT;
  E.entra(trator, tT - 0.2, { modo: 'pop', dur: 0.2 });
  E.move(fofa, tT - 0.2, { escala: [0.83, 1, 1], dur: 0.2, inspeciona: false }); E.move(fofa, tT, { escala: [0.001, 1, 1], dur: dT, linear: true, inspeciona: false });
  E.move(trator, tT, { para: [7.4, -0.55, 0], dur: dT, linear: true, som: 'motor' });
  E.sai(fofa, "1:solta>", { modo: 'some', dur: 0.1 });
  for (let i = 0; i < 4; i++) E.poeira([-3 + i * 3.6, -0.3, (i % 2 ? 1 : -1) * 1.2], tT + 0.1 + i * dT / 4, { raio: 0.8, n: 10 });
  E.sai(fofaN, "1:solta>", { modo: 'some', dur: 0.25 }); E.poeira([10.6, -0.2, 0], "1:solta>", { raio: 1.3, n: 16 });
  E.sai(trator, ["1:solta>", 0.15], { modo: 'pop', dur: 0.25 });
  // ...e passa o rolo (o personagem dirige)
  const sub = faixa(X0, X1, -0.55, 0.04, 'compactada', "subleito compactado");
  sub.scale.x = 0.001; E.permite(sub, terreno); E.entra(sub, ["1:passa", -0.05], { modo: 'nada', silencioso: true });
  const rolo = await E.modelo('rolo.glb', { comprimento: 4.2, giraY: -PI / 2, apaga: [[280, 84, 512, 126]] }); K.em(rolo, FORA, 0.02, 0, "rolo compactador"); E.farois(rolo, { y: 0.93, z: 0.5, x: 0.02, larg: 0.2 });
  { // tambor da frente e rodas de trás giram conforme o rolo anda (ângulo = distância / raio)
    rolo.updateMatrixWorld(true); const eixo = (nomes, cx, cy) => { const p = new T.Group(); p.position.set(cx, cy, 0); rolo.add(p); rolo.updateMatrixWorld(true);
      const L2 = []; rolo.traverse(o => { if (nomes.includes(o.name)) L2.push(o); }); L2.forEach(n => p.attach(n)); return p; };
    const tambor = eixo(['f4_324', 'ftl3_279', 'frl3_296', 'firl3_313', 'a3_322'], 1.17, 0.73), rodas = eixo(['f2_181', 'ftl_136', 'f3_246', 'ftl2_201'], -0.87, 0.63);
    E.cada(() => { const x = rolo.position.x; tambor.rotation.z = -x / 0.73; rodas.rotation.z = -x / 0.63; }); }
  { // caixa de colisão fiel: corpo acima do chão + tambor e rodas (quadrado inscrito no círculo — roda redonda não "afunda" no ponto de contato)
    const bb = new T.Box3().setFromObject(rolo); bb.min.sub(rolo.position); bb.max.sub(rolo.position); const corpo = bb.clone(); corpo.min.y = 0.35;
    const roda = (cx, cy, r) => new T.Box3(new T.Vector3(cx - r * 0.707, cy - r * 0.707, bb.min.z), new T.Vector3(cx + r * 0.707, cy + r * 0.707, bb.max.z));
    const apoio = cx => new T.Box3(new T.Vector3(cx - 0.1, 0, bb.min.z), new T.Vector3(cx + 0.1, 0.03, bb.max.z));   // faixa onde a roda encosta no chão
    rolo.userData._cx = [corpo, roda(1.17, 0.73, 0.73), roda(-0.87, 0.63, 0.63), apoio(1.17), apoio(-0.87)].map(box => ({ ref: rolo, box })); }
  E.permite(rolo, sub);
  // outro trabalhador: o operador fica sempre no rolo
  const piloto = E.mascote({ nome: 'operador do rolo', escala: 0.92, shirt: 0xe8572a, pants: 0x2b3a55 });
  E.monta(piloto, rolo, [-0.55, 0.78, 0], PI / 2); E._an(piloto); E.anima(piloto, [[-1, 'drive', 0.2]]);
  const tR = E.t("1:passa"), dR = E.t("1:duro>") - tR;
  E.permite(rolo, [rampa, parede]); E.permite(sub, rampa);
  E.entra(rolo, tR - 2.3, { modo: 'nada', silencioso: true });
  rota(rolo, tR - 2.2, 2.2, [[FORA, 0.02, 0], [PE, 0.02, 0], ...desce(0), [RX1 + 0.6, RY1, 0]], { eixo: 2.0, som: 'motor', inspeciona: false });
  E.move(rolo, tR, { para: [7.0, -0.51, 0], dur: dR, linear: true, som: 'motor' });
  E.move(sub, tR, { escala: [1, 1, 1], dur: dR * 1.04, linear: true, inspeciona: false });
  E.acelera("1:passa", "1:duro>");
  E.certo([11.98, -0.4, 0.5], "1:duro>");
  E.rotulo("SUBLEITO", [11.98, -0.55, 1.3], "1:subleito", ["1:fim", 0.15], [0, 0.3, 0]); E.destaca(sub, "1:subleito", ["1:subleito", 1.0]);

  // ================================================================= BLOCO 2 — chuva, caminhão, BASE de pedra, o buraco que volta
  const AZ = '#2F6FE0';
  E.move(rolo, "2:Mas", { para: [5.6, -0.51, -2.2], dur: 0.8, som: 'motor', inspeciona: false });
  rota(rolo, E.t("2:Mas") + 0.8, 2.6, [[5.6, -0.51, -2.2], ...desce(-2.2, RY1, true), [PE, 0.02, -2.2], [FORA, 0.02, -2.2]], { eixo: 2.0, inspeciona: false });                    // o rolo dá ré e estaciona na rua antiga
  KM.push(["2:Mas", 'worried', 0.3], ["2:caminhão", 'scared', 0.2], ["2:nela>", 'idle', 0.3], [["2:Então", 0.25], 'reach', 0.3]);
  E.chuva("2:Mas", "2:e", { centro: [10, 1.5], tam: [12, 9], topo: 7 });
  E.particulas({ n: 46, raio: 0.03, cor: 0x2f6fe0, de: "2:até", ate: "2:Então", pos: (i, tau, s, amb) => [12.05, -0.56 - ((tau * 0.3 * (0.6 + s[3]) + s[1] * 0.55) % 0.55), 0.2 + s[0] * 3.1, amb] });
  E._tinge(sub, { t0: E.t("2:até"), t1: E.t("2:Então") + 0.3, cor: 0x4a3a2a, forca: 0.65, emis: 0, fin: 1.0, fout: 0.3 });
  E.nota("TERRA MOLE", [12.02, -0.82, 1.2], "2:amolece", "2:Então", { cor: AZ });
  const cam1 = await E.modelo('garbage-truck.glb', { escala: 1.5, giraY: PI / 2 }); K.em(cam1, -17, 0.02, 1.0, "caminhão"); E.farois(cam1);
  E.permite(cam1, [sub, terreno, rampa, parede]);
  E.entra(cam1, "2:quando", { modo: 'nada', silencioso: true });
  rota(cam1, E.t("2:quando"), E.t("2:afundam") - E.t("2:quando"), [[-17, 0.02, 1.0], [PE, 0.02, 1.0], ...desce(1.0), [9.0, -0.51, 1.0]], { eixo: 3.4, som: 'motor', inspeciona: false });
  E.move(cam1, "2:afundam", { por: [0, -0.2, 0], rot: [0, 0, -0.04], dur: 0.5, som: 'tum' });
  E.setas([[[12.06, -0.45, 1.75], [12.06, -1.3, 1.75]]], "2:afundam", "2:nela>", { raio: 0.06 });
  E.nota("AS RODAS AFUNDAM", [12.02, -1.45, 1.75], "2:rodas", "2:nela>");
  E.errado(cam1, "2:afundam", "2:nela>", { x: [11.9, 0.5, 2.3], forca: 0.3 });
  E.rebobina(cam1, ["2:nela>", 0.05], ["2:Então", 0.25]);
  // a base: pedra britada espalhada e socada
  const base = faixa(X0, X1, -0.51, 0.34, 'brita', "base de brita");
  base.scale.x = 0.001; E.entra(base, ["2:cobre", -0.05], { modo: 'nada', silencioso: true });
  const tB = E.t("2:cobre"), dB = E.t("2:britada>") - tB;
  E.move(base, tB, { escala: [1, 1, 1], dur: dB, linear: true, som: 'concreto', inspeciona: false });
  E.acelera("2:cobre", "2:socada>");
  E.permite(rolo, base); E.permite(base, [sub, terreno, rampa]);
  rota(rolo, E.t("2:camada"), E.t("2:socada>") - E.t("2:camada"), [[FORA, 0.02, -2.2], [PE, 0.02, -2.2], ...desce(-2.1, -0.17), [6.2, -0.17, -1.9]], { eixo: 2.0, som: 'motor' });
  E.anda(m, tB + dB * 0.85, tB + dB * 0.85 + 0.5, [11.0, 0, 3.85], { vira: 1.35 });            // vai até a beira da calçada olhar a base
  KM.push(["2:que", 'reach', 0.3]);
  // o caminhão volta: agora o peso se espalha
  const cam2 = await E.modelo('garbage-truck.glb', { escala: 1.5, giraY: PI / 2 }); K.em(cam2, -17, 0.02, 1.0, "caminhão na base"); E.farois(cam2);
  E.permite(cam2, [base, rampa, parede]);
  E.entra(cam2, "2:pedra", { modo: 'nada', silencioso: true });
  rota(cam2, E.t("2:pedra"), E.t("2:como") - E.t("2:pedra"), [[-17, 0.02, 1.0], [PE, 0.02, 1.0], ...desce(1.0, -0.17), [9.0, -0.17, 1.0]], { eixo: 3.4, som: 'motor' });
  E.setas([-1.5, -0.75, 0, 0.75, 1.5].map(d => [[12.06, -0.2, 1.75], [12.06, -0.6, 1.75 + d]]), "2:peso", "2:Essa", { cor: 0x3cc45a, raio: 0.035, passo: 0.05 });
  E.certo([11.9, 0.45, 2.3], "2:lama");
  E.rotulo("BASE", [12.02, -0.34, 2.5], "2:base", ["2:base>", 0.5], [0, 0.25, 0]); E.destaca(base, "2:base", ["2:base", 0.9]);
  KM.push(["2:base", 'cheer', 0.3]);
  // "é por isso que o buraco sempre volta": o remendo na rua antiga
  const furo = K.grupo(K.cilindro(0.85, 0.012, 0x7a5a38, { seg: 28, sombra: false }), K.cilindro(0.62, 0.016, 0x2a1c12, { seg: 24, sombra: false })); K.em(furo, -14.2, 0.02, 1.0, "buraco da rua antiga"); furo.scale.z = 0.8; E.fixo(furo);
  E.entra(furo, "2:É#2", { modo: 'nada', silencioso: true });
  E.nota("BURACO", [-14.2, 0.1, 1.0], "2:volta", "2:remendo", { desloc: [0, 0.5, 0] });
  const remendo = K.em(K.cilindro(0.95, 0.03, 0x1d1f22, { seg: 12 }), -14.2, 0.036, 1.0, "remendo"); remendo.scale.z = 0.82; E.permite(remendo, furo); E.fixo(remendo);
  E.entra(remendo, "2:remendo", { modo: 'cai', alt: 1.2 });
  KM.push(["2:isso", 'reach', 0.3], ["2:remendo", 'chopDown', 0.2], ["2:tapa", 'chopUp', 0.2], ["2:asfalto", 'chopDown', 0.2], ["2:mas#2", 'idle', 0.3], ["2:continua", 'shrug', 0.3]);
  E.certo([-14.2, 0.3, 1.0], "2:asfalto");
  E.nota("BASE MOLE", [-14.2, 0.05, 2.0], "2:base#2", ["2:fim", 0.1], { cor: AZ });
  E.particulas({ n: 26, raio: 0.028, cor: 0x2f6fe0, de: "2:mas#2", ate: ["2:fim", 0.2], pos: (i, tau, s, amb) => { const a = s[0] * 6.283, r = 0.95 + s[1] * 0.25; return [-14.2 + Math.cos(a) * r, 0.05 + ((tau * 0.25 + s[2] * 0.2) % 0.2), 1.0 + Math.sin(a) * r * 0.82, amb]; } });
  E.sai(remendo, "2:continua", { modo: 'some', dur: 0.5 }); E.som('desaba', E.t("2:continua"), 0.8);
  E.poeira([-14.2, 0.05, 1.0], "2:continua", { raio: 0.7, n: 12, cor: 0x55585c });
  E.errado(furo, "2:continua", ["2:fim", 0.2], { x: [-14.2, 0.35, 1.0] });

  // ================================================================= BLOCOS 3 a 5 — preparação
  const TH = 0.085, SN = Math.sin(TH), yTopo = z => -0.158 + 3 * SN + 0.092 * Math.cos(TH) - Math.abs(z) * Math.tan(TH);       // abaulamento: topo da capa em cada z
  E.sai(cam2, ["2:fim", 0.2], { modo: 'some', dur: 0.1 });
  // o rolo sai andando e estaciona na rua antiga; volta andando para compactar a capa
  rota(rolo, E.t("2:base>"), 3.2, [[6.2, -0.17, -1.9], ...desce(-2.1, -0.17, true), [PE, 0.02, -2.2], [FORA, 0.02, -2.2]], { eixo: 2.0, som: 'motor', inspeciona: false });
  E.anda(m, "3:Mas", ["3:Mas", 0.5], [10.7, 0, 3.85], { vira: PI / 2 });

  // ================================================================= BLOCO 3 — imprimação + concreto asfáltico
  // jeito errado: placa de asfalto em cima da pedra solta escorrega
  const solta = K.em(K.bloco(3.0, 0.05, 2.6, 'asfalto'), 9.8, -0.17, 1.5, "asfalto na pedra solta");
  E.permite(solta, base);
  E.entra(solta, "3:pedra", { modo: 'cai', alt: 0.8 });
  E.move(solta, "3:solta", { por: [-0.9, 0, 0.15], rot: [0, 0.12, 0], dur: 0.5, som: 'whoosh' });
  E.poeira([11.0, -0.12, 1.5], "3:solta", { raio: 0.6, n: 12, cor: 0x9a9da0 }); E.poeira([10.2, -0.12, 0.6], ["3:solta", 0.15], { raio: 0.5, n: 10, cor: 0x9a9da0 });
  E.errado(solta, "3:solta", "3:pó>", { x: [10.4, 0.2, 1.4] });
  E.nota("PÓ SOLTO", [11.0, -0.12, 2.4], "3:cheia", ["3:pó>", 0.2]);
  E.rebobina(solta, ["3:pó>", 0.1], ["3:Então", 0.25]);
  // caminhão espargidor rega a base com asfalto ralo
  const esp = new T.Group(), ad = (o, x, y, z) => { o.position.set(x, y, z); esp.add(o); return o; };
  ad(K.caixa(4.0, 0.3, 1.8, 0x2b2d31), 0, 0.3, 0);
  ad(K.caixa(1.1, 1.25, 1.9, 0xff8a1c), 1.45, 0.6, 0); ad(K.caixa(0.03, 0.5, 1.6, 0x9fd8ff), 2.01, 1.2, 0);
  { const tk = K.cilindro(0.62, 2.5, 0x3a3d42, { rug: 0.4, metal: 0.3 }); tk.rotation.z = PI / 2; ad(tk, 0.85, 1.22, 0); }
  for (const [x, z] of [[1.4, 0.72], [1.4, -0.98], [-1.2, 0.72], [-1.2, -0.98]]) { const w = K.cilindro(0.36, 0.26, 0x15161a); w.rotation.x = PI / 2; ad(w, x, 0.36, z); }
  ad(K.caixa(0.08, 0.08, 5.8, 0x2b2d31), -2.05, 0.38, 0); ad(K.caixa(0.5, 0.06, 0.06, 0x2b2d31), -1.85, 0.6, 0);
  const espa = K.em(esp, 9.95, -0.17, 0, "caminhão espargidor"); espa.rotation.y = PI; E.farois(espa, { y: 0.62, z: 0.6, x: 1.0, larg: 0.22 });
  E.permite(espa, [base, rampa, parede]);
  const tS = E.t("3:rega"), dS = E.t("3:tudo>") - tS;
  E.entra(espa, tS - 0.25, { modo: 'pop', dur: 0.2 });
  E.move(espa, tS, { para: [xR(-0.17), -0.17, 0], dur: dS, linear: true, som: 'motor' });
  const tSai = rota(espa, tS + dS, 1.2, [...desce(0, -0.17, true), [PE, 0.02, 0.6], [-11.6, 0.02, 0.8]], { ry: PI, eixo: 2.6, inspeciona: false });
  E.sai(espa, tSai + 0.05, { modo: 'some', dur: 0.2 });
  const imp = faixa(X1, X0, -0.17, 0.012, 'asfalto', "imprimação", { larg: 6.0, rug: 0.25, cor: 0x6b4f37 });
  imp.scale.x = 0.001; E.entra(imp, tS - 0.05, { modo: 'nada', silencioso: true });
  E.move(imp, tS, { escala: [0.952, 1, 1], dur: dS, linear: true, inspeciona: false }); E.move(imp, tS + dS, { escala: [1, 1, 1], dur: 0.3, inspeciona: false });
  E.permite(imp, [base, espa]);
  E.particulas({ n: 130, raio: 0.028, cor: 0x15110d, de: tS, ate: tS + dS, pos: (i, tau, sx, amb) => { const f = Math.min(1, tau / dS), xb = 12 - 21 * f;
    return [xb + (sx[2] - 0.5) * 0.12, 0.21 - ((tau * 2.6 + sx[1]) % 1) * 0.37, (sx[0] - 0.5) * 5.6, amb]; } });
  E.som('agua', tS, 0.6, dS);
  E.particulas({ n: 44, raio: 0.024, cor: 0x15110d, de: "3:entra", ate: "3:Essa", pos: (i, tau, sx, amb) => [12.035, -0.175 - ((tau * 0.22 + sx[1] * 0.3) % 0.3), (sx[0] - 0.5) * 5.6, amb] });
  E.nota("COLA AS PEDRAS", [12.02, -0.3, 2.2], "3:entra", "3:Essa");
  E.certo([11.98, -0.05, 0.6], "3:tudo>");
  E.rotulo("IMPRIMAÇÃO", [11.98, -0.164, 1.2], "3:imprimação", ["3:imprimação>", 0.5], [0, 0.3, 0]); E.destaca(imp, "3:imprimação", ["3:imprimação", 0.9]);
  // jeito errado 2: asfalto frio vira caroço
  const frio = [[8.6, 0.7, 0.3], [9.3, 1.5, 1.2], [10.1, 0.9, 2.1], [10.8, 1.8, 0.7], [9.0, 2.3, 2.6], [10.4, 2.6, 1.6]].map(([x, z, r], i) => {
    const c = K.em(K.bloco(0.4, 0.16, 0.34, 'asfalto'), x, -0.158, z, "asfalto frio " + (i + 1)); c.rotation.y = r;
    E.entra(c, ["3:capa", i * 0.08], { modo: 'cai', alt: 0.7, inspeciona: i === 3, ganho: 0.5 }); return c; });
  E.permite(frio, imp);
  E.errado(frio, "3:molda", ["3:quente>", 0.35], { x: [9.8, 0.25, 1.5] });
  E.nota("ASFALTO FRIO", [10.8, -0.1, 2.5], "3:capa", ["3:quente>", 0.35]);
  E.rebobina(frio, ["3:quente>", 0.35], ["3:Então#2", 0.3]);
  // jeito certo: massa quente espalhada em duas metades (que depois viram o abaulamento)
  const tM = E.t("3:mistura"), dM = E.t("3:graus>") - tM;
  const capa = [1, -1].map(sg => { const h = faixa(X0, X1, -0.158, 0.092, 'asfalto', "capa de asfalto " + (sg > 0 ? "direita" : "esquerda"), { larg: 3.0, z: sg * 1.5 });
    h.scale.x = 0.001; E.entra(h, tM - 0.05, { modo: 'nada', silencioso: true }); E.move(h, tM, { escala: [1, 1, 1], dur: dM, linear: true, inspeciona: false, som: sg > 0 ? 'concreto' : null }); return h; });
  E.permite(capa, [imp, base, rolo]); E.permite(capa[0], capa[1]);
  E.acelera("3:mistura", "3:graus>");
  E.particulas({ n: 80, raio: 0.07, cor: 0xffffff, op: 0.5, de: tM, ate: "3:esfriar>", fout: 0.9, pos: (i, tau, sx, amb) => { const front = X0 + 22 * Math.min(1, tau / dM), x = front - sx[0] * 7, k = (tau * 0.45 + sx[1]) % 1;
    if (x < X0) return null; return [x, -0.06 + k * 0.8, (sx[2] - 0.5) * 5.6, amb * (1.15 - k)]; } });
  E.nota("MAIS DE 100 °C", [11.2, 0.0, 1.0], "3:cem", ["3:aperta", 0.2]);
  rota(rolo, E.t("3:aperta"), E.t("3:esfriar>") - E.t("3:aperta"), [[FORA, 0.02, -2.2], [PE, 0.02, -2.2], [X0, -0.066, -1.9], [6.0, -0.066, -1.6]], { eixo: 2.0, som: 'motor' });
  E.certo([11.98, 0.0, 0.6], "3:esfriar>");
  E.rotulo("CONCRETO ASFÁLTICO", [11.98, -0.11, 1.6], "3:concreto", ["3:fim", 0.15], [0, 0.35, 0]); E.destaca(capa, "3:concreto", ["3:concreto", 1.0]);
  const tR3 = E.t("3:mistura");
  KM.push(["3:Mas", 'worried', 0.3], ["3:pedra", 'reach', 0.3], ["3:cheia", 'shrug', 0.3], ["3:Então", 'idle', 0.3], ["3:rega", 'reach', 0.3], ["3:cola", 'idle', 0.3], ["3:imprimação", 'cheer', 0.3],
    ["3:Mas#2", 'idle', 0.3], ["3:capa", 'worried', 0.3], ["3:quente", 'shrug', 0.3], ["3:Então#2", 'idle', 0.3]);
  for (let k = 0; k < 9; k++) KM.push([tR3 + k * 0.36, k % 2 ? 'chopUp' : 'chopDown', 0.2]);
  KM.push(["3:graus>", 'idle', 0.3], ["3:Esse", 'reach', 0.3], ["3:concreto", 'cheer', 0.3]);

  // ================================================================= BLOCO 4 — água: abaulamento, sarjeta, boca de lobo
  E.anda(m, "4:Mas", ["4:Mas", 0.5], [10.4, 0, 4.1], { vira: 1.9 });
  rota(rolo, E.t("4:Mas"), 3.0, [[6.0, -0.066, -1.6], [X0, -0.066, -1.9], [PE, 0.02, -2.2], [FORA, 0.02, -2.2]], { eixo: 2.0, som: 'motor', inspeciona: false });
  // jeito errado: água parada na rua plana entra na trinca
  E.chuva("4:Mas", "4:lados>", { centro: [9, 1], tam: [12, 9], topo: 7 });
  const poca = K.cilindro(0.85, 0.006, 0x3fa8ff, { op: 0.72, seg: 22, sombra: false }); poca.userData.semColisao = true; poca.scale.z = 0.7; K.em(poca, 9.6, -0.066, 1.4);
  E.entra(poca, "4:parada", { modo: 'surge', dur: 0.4, som: 'splash' });
  const trincas = [[9.4, 1.3, 0.4], [9.8, 1.5, -0.6], [9.1, 1.6, 1.2]].map(([x, z, r]) => { const t = K.caixa(0.55, 0.004, 0.025, 0x0d0d0d, { sombra: false }); t.userData.semColisao = true; t.rotation.y = r; K.em(t, x, -0.065, z); E.entra(t, "4:trinca", { modo: 'pop', silencioso: true }); return t; });
  E.nota("ÁGUA PARADA", [10.6, -0.05, 2.0], "4:parada", "4:trinca>", { cor: AZ });
  E.particulas({ n: 54, raio: 0.026, cor: 0x2f6fe0, de: "4:entra", ate: "4:Então", pos: (i, tau, sx, amb) => [12.035, -0.07 - ((tau * 0.3 + sx[1] * 0.45) % 0.45), 1.4 + (sx[0] - 0.5) * 1.4, amb] });
  E.nota("APODRECE POR BAIXO", [12.02, -0.32, 2.3], "4:apodrece", "4:Então");
  E.errado(poca, "4:apodrece", "4:Então", { x: [11.2, 0.1, 1.4] });
  E.rebobina([poca, ...trincas], "4:baixo>", ["4:Então", 0.25]);
  // jeito certo: meio mais alto que as beiradas
  const tA = E.t("4:faz"), dA = E.t("4:beiradas>") - tA;
  capa.forEach((h, k) => E.move(h, tA, { rot: [(k ? -1 : 1) * TH, 0, 0], por: [0, 1.5 * SN, 0], dur: dA, som: k ? null : 'sobe' }));
  const cunhas = [1, -1].map(sg => { const sh2 = new T.Shape(), hc = 2 * 1.5 * SN; sh2.moveTo(0, 0); if (sg > 0) { sh2.lineTo(3.0, 0); sh2.lineTo(0, hc); } else { sh2.lineTo(0, hc); sh2.lineTo(-3.0, 0); } sh2.closePath();
    const geo = new T.ExtrudeGeometry(sh2, { depth: L, bevelEnabled: false }), tx = K.texMat('brita').clone(); tx.needsUpdate = true; tx.repeat.set(1 / 1.1, 1 / 1.1);
    const me = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tx, roughness: 1 })); me.castShadow = me.receiveShadow = true; const g = new T.Group(); me.rotation.y = -PI / 2; g.add(me);
    g.scale.y = 0.001; K.em(g, X1, -0.158, 0, "base do abaulamento " + (sg > 0 ? "direita" : "esquerda")); E.entra(g, tA - 0.03, { modo: 'nada', silencioso: true });
    E.move(g, tA, { escala: [1, 1, 1], dur: dA, inspeciona: false }); return g; });
  E.permite(cunhas, [...capa, imp, base]); E.permite(cunhas[0], cunhas[1]);
  E.setas([8.6, 10.6].flatMap(x => [1, -1].map(sg => [[x, yTopo(0.35) + 0.07, sg * 0.35], [x, yTopo(2.7) + 0.07, sg * 2.7]])), "4:chuva", "4:Esse", { cor: 0x2f7fe0, raio: 0.035 });
  E.certo([11.98, 0.2, 0.4], "4:lados>");
  E.rotulo("ABAULAMENTO", [11.98, 0.08, 0.3], "4:abaulamento", ["4:abaulamento>", 0.6], [0, 0.3, 0]); E.destaca([...capa, ...cunhas], "4:abaulamento", ["4:abaulamento", 0.9]);
  // sarjeta, meio-fio e boca de lobo
  const sarj = [1, -1].map(sg => faixa(X0, X1, -0.17, 0.05, 'concreto', "sarjeta " + (sg > 0 ? "direita" : "esquerda"), { larg: 0.49, z: sg * 3.245 }));
  const mfio = [1, -1].map(sg => faixa(X0, X1, -0.17, 0.29, 'concreto', "meio-fio " + (sg > 0 ? "direito" : "esquerdo"), { larg: 0.15, z: sg * 3.565, cor: 0xe8e8e4 }));
  sarj.forEach((x, k) => E.entra(x, ["4:canaleta", k * 0.1], { modo: 'cresce', dur: 0.45, inspeciona: !k }));
  mfio.forEach((x, k) => E.entra(x, ["4:beira", k * 0.1], { modo: 'cresce', dur: 0.45, inspeciona: !k }));
  E.permite([...sarj, ...mfio], [terreno, base, imp, ...capa, ...cunhas]);
  const boca = new T.Group(); boca.add(K.caixa(0.9, 0.012, 0.47, 0x121212)); for (let i = 0; i < 7; i++) { const b = K.caixa(0.05, 0.018, 0.47, 0x6b6f75, { metal: 0.4, rug: 0.5 }); b.position.x = -0.36 + i * 0.12; boca.add(b); }
  { const ab = K.caixa(0.9, 0.11, 0.012, 0x0a0a0a, { sombra: false }); ab.position.set(0, 0.0, 0.239); boca.add(ab); }
  K.em(boca, 10.0, -0.12, 3.245, "boca de lobo"); E.permite(boca, [sarj[0], mfio[0]]);
  E.entra(boca, "4:abertura", { modo: 'pop', dur: 0.3 });
  E.particulas({ n: 46, raio: 0.03, cor: 0x2f6fe0, de: "4:leva", ate: "4:Essa", pos: (i, tau, sx, amb) => { const x = 3 + ((tau * 1.7 + sx[0] * 7) % 7); if (x > 9.85) return null; return [x, -0.108, 3.06 + sx[1] * 0.36, amb]; } });
  E.som('agua', E.t("4:leva"), 0.6, E.t("4:Essa") - E.t("4:leva"));
  E.certo([10.0, 0.25, 3.0], "4:enxurrada>");
  E.rotulo("SARJETA", [11.5, -0.12, 3.245], "4:sarjeta", ["4:boca", -0.05], [0, 0.3, 0]); E.destaca(sarj[0], "4:sarjeta", ["4:sarjeta", 0.9]);
  E.rotulo("BOCA DE LOBO", [10.0, -0.05, 3.3], "4:boca", ["4:lobo>", 0.5], [0, 0.35, 0]); E.destaca(boca, "4:boca", ["4:boca", 1.0]);
  // é por isso que, quando entope de lixo, a rua alaga
  const lixo = [[0xe5483a, 'lata'], [0xffffff, 'saco'], [0x2f6fe0, 'lata'], [0x1d1f22, 'saco'], [0x3cc45a, 'garrafa'], [0xffd23f, 'lata']].map(([cor, tipo], i) => {
    const o = tipo === 'saco' ? K.esfera(0.085, cor, { seg: 10 }) : K.cilindro(tipo === 'garrafa' ? 0.035 : 0.042, tipo === 'garrafa' ? 0.2 : 0.12, cor, { seg: 12 });
    o.userData.semColisao = true; if (tipo !== 'saco') o.rotation.z = PI / 2 * (i % 2 ? 1 : 0.85);
    K.em(o, 9.7 + (i % 3) * 0.28, -0.108 + (tipo === 'saco' ? 0 : 0.04), 3.13 + Math.floor(i / 3) * 0.2); E.entra(o, ["4:entope", i * 0.1], { modo: 'cai', alt: 0.6, inspeciona: false, ganho: 0.4 }); return o; });
  E.nota("ENTUPIU", [10.0, 0.0, 2.7], "4:lixo", ["4:fim", 0.2]);
  E.errado(boca, "4:lixo", ["4:fim", 0.2], { x: [10.0, 0.35, 3.0] });
  E.chuva("4:quando", ["5:ini", 0.1], { centro: [9, 1], tam: [12, 9], topo: 7 });
  const alag = K.caixa(6.0, 0.16, 3.05, 0x3fa8ff, { op: 0.6, sombra: false }); alag.userData.semColisao = true; K.em(alag, 8.97, -0.12, 1.95);
  E.entra(alag, "4:rua#2", { modo: 'cresce', dur: 0.6, som: 'splash' });
  KM.push(["4:Mas", 'worried', 0.3], ["4:apodrece", 'scared', 0.25], ["4:Então", 'idle', 0.3], ["4:meio", 'reach', 0.3], ["4:abaulamento", 'cheer', 0.3], ["4:abaulamento>", 'idle', 0.3],
    ["4:canaleta", 'reach', 0.3], ["4:enxurrada", 'idle', 0.3], ["4:sarjeta", 'reach', 0.3], ["4:essa#2", 'idle', 0.2], ["4:boca", 'reach', 0.3], ["4:isso", 'idle', 0.3], ["4:entope", 'scared', 0.2], ["4:alaga", 'worried', 0.3]);

  // ================================================================= BLOCO 5 — humor, parabéns, comente
  E.sai(alag, "5:ini", { modo: 'some', dur: 0.35 }); lixo.forEach(o => E.sai(o, "5:ini", { modo: 'some', dur: 0.3 }));
  // faixas: tracejado amarelo no meio e linha branca na beira de cada metade
  for (let i = 0; i < 10; i++) { const f = K.caixa(1.2, 0.012, 0.13, 0xffd23f, { sombra: false }); f.userData.semColisao = true; K.em(f, -8.4 + i * 2.2, yTopo(0) - 0.002, 0); E.entra(f, ["5:faixas", i * 0.05], { modo: 'pop', dur: 0.2, silencioso: i !== 9, inspeciona: false }); }
  capa.forEach((h, k) => { const l = K.caixa(L, 0.008, 0.12, 0xf4f4f0, { sombra: false }); l.userData.semColisao = true; K.em(l, L / 2, 0.092, (k ? -1 : 1) * 1.25, h); E.entra(l, ["5:faixas", 0.2], { modo: 'surge', dur: 0.4, silencioso: true, inspeciona: false }); });
  // placa de PARE
  const placa = new T.Group(); placa.add(K.cilindro(0.035, 2.05, 0x9aa3ad, { metal: 0.4, rug: 0.5 }));
  { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#d32f2f'; x.beginPath(); for (let k = 0; k < 8; k++) { const a = PI / 8 + k * PI / 4; x.lineTo(128 + Math.cos(a) * 127, 128 + Math.sin(a) * 127); } x.closePath(); x.fill(); x.strokeStyle = '#ffffff'; x.lineWidth = 14;
    x.beginPath(); for (let k = 0; k < 8; k++) { const a = PI / 8 + k * PI / 4; x.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); } x.closePath(); x.stroke();
    x.fillStyle = '#ffffff'; x.font = 'bold 74px Poppins, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('PARE', 128, 132);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; const lado = new T.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 }), face = new T.MeshStandardMaterial({ map: tx, roughness: 0.5 });
    const oct = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.03, 8), lado); oct.rotation.set(0, PI / 8, PI / 2, 'ZYX'); oct.position.set(0.05, 1.82, 0); oct.castShadow = true; placa.add(oct);
    face.transparent = true; face.alphaTest = 0.5; const fr = new T.Mesh(new T.PlaneGeometry(0.72 / Math.cos(PI / 8), 0.72 / Math.cos(PI / 8)), face); fr.rotation.y = PI / 2; fr.position.set(0.068, 1.82, 0); placa.add(fr); }
  K.em(placa, 11.3, 0, 4.35, "placa de pare"); E.entra(placa, "5:placa", { modo: 'pop', dur: 0.3 });
  // quebra-molas que ninguém pintou (acompanha o abaulamento: um em cada metade)
  const qm = capa.map(h => { const g = new T.Group(), tx = K.texMat('asfaltoVelho').clone(); tx.needsUpdate = true; tx.repeat.set(1.5, 0.6);
    const me = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 3.0, 28), new T.MeshStandardMaterial({ map: tx, roughness: 0.9 })); me.rotation.x = PI / 2; me.castShadow = me.receiveShadow = true; g.add(me); g.scale.y = 0.36;
    g.userData.semColisao = true; K.em(g, 5 - X0, 0.092, 0, h); E.entra(g, "5:quebra-molas", { modo: 'cresce', dur: 0.4, inspeciona: false, som: h === capa[0] ? 'sobe' : null }); return g; });
  E.nota("NINGUÉM PINTOU", [5.0, 0.35, 1.6], "5:ninguém", "5:Agora");
  // passar de carro por cima
  const carro2 = await E.modelo('sedan.glb', { escala: 1.35, giraY: PI / 2 }); carro2.rotation.x = TH; K.em(carro2, -7.0, 1.5 * SN + 0.092 - 0.158 + 0.002, 1.5, "carro novo"); E.farois(carro2);
  E.permite(carro2, [...capa, ...cunhas]);
  const tC = E.t("5:Agora"), dC = E.t("5:cima>") - tC, yC = carro2.position.y, fH = (5 - 1.3 + 7) / 17;
  E.entra(carro2, tC - 0.1, { modo: 'nada', silencioso: true });
  E.move(carro2, tC, { para: [10.0, yC, 1.5], dur: dC, linear: true, som: 'motor' });
  const tQ = tC + fH * dC;                                         // a roda da frente bate no quebra-molas sem frear
  [[0.12, 0.54, 0.25, 'tum'], [0.14, 0.12, 0.1], [0.12, -0.48, -0.08, 'tum'], [0.1, -0.18, 0, 'tum'], [0.08, 0.08, 0.03], [0.1, -0.08, 0]].reduce((t, [d, dy, ang, som]) => {
    E.move(carro2, t, { por: [0, dy, 0], rot: [TH, 0, ang], dur: d, som, ganho: 1.5, inspeciona: false }); return t + d; }, tQ);
  E.poeira([5.0, 0.15, 1.5], tQ + 0.05, { raio: 0.8, n: 14, cor: 0x777a7e }); E.poeira([5.6, 0.15, 1.5], tQ + 0.3, { raio: 0.9, n: 14, cor: 0x777a7e });
  E.nota("PANCADA!", [5.4, 1.4, 1.5], tQ + 0.05, tQ + 1.1);
  KM.push([tQ, 'scared', 0.12], [tQ + 0.9, 'idle', 0.3]);
  E.oculos(m, "5:Parabéns");
  E.confete([10.4, 2.6, 3.4], "5:Parabéns");
  E.cta("ENGENHEIRO", "MOTORISTA", "5:Se");
  E.confete([10.4, 2.6, 3.4], "5:engenheiro"); E.confete([6.0, 2.4, 1.5], "5:motorista"); E.som('pop', "5:Camadas", 1);
  KM.push(["5:Coloque", 'wave', 0.3], ["5:placa", 'reach', 0.3], ["5:quebra-molas", 'idle', 0.3], ["5:pintou", 'shrug', 0.3], ["5:Agora", 'wave', 0.3], ["5:cima", 'cheer', 0.3],
    ["5:Parabéns", 'cheer', 0.3], ["5:Se", 'wave', 0.3], ["5:engenheiro", 'jump', 0.3], ["5:Se#2", 'wave', 0.3], ["5:motorista", 'jump', 0.3], ["5:segue", 'wave', 0.3], ["5:Camadas", 'cheer', 0.3]);

  // ================================================================= CÂMERA (um plano só)
  E.camera("1:ini", [13.6, 1.5, 6.9], [10.9, 0.95, 4.4], 42);
  E.camera("1:terra", [17.2, 3.6, 5.2], [5.0, 0.2, 1.9], 52);
  E.camera("1:buracos", [16.2, 3.0, 4.8], [5.6, 0.2, 1.7], 50);
  E.camera("1:fofa", [19.6, 1.9, 2.8], [11.4, 0.05, 1.9], 40);
  E.camera("1:casca", [19.4, 1.6, 1.7], [11.4, -0.1, 1.9], 40);
  E.camera("1:raspa", [18.8, 3.9, 5.6], [5.2, -0.2, 1.0], 50);
  E.camera("1:até", [16.4, 2.3, 3.4], [4.5, 0.7, 0.2], 46);
  E.camera("1:subleito", [19.8, 1.5, 2.9], [11.3, -0.35, 1.9], 40);
  E.camera("2:Mas", [19.6, 1.7, 2.4], [11.2, -0.4, 1.8], 40);
  E.camera("2:amolece", [19.3, 1.25, 2.2], [11.5, -0.6, 1.6], 40);
  E.camera("2:caminhão", [19.6, 2.0, 2.7], [10.8, 0.2, 1.5], 44);
  E.camera("2:nela", [19.4, 1.3, 2.3], [11.4, -0.5, 1.7], 42);
  E.camera("2:camada", [19.6, 3.7, 4.8], [6, -0.3, 0.6], 50);
  E.camera("2:socada", [17.6, 2.5, 2.4], [5, 0.4, -0.9], 46);
  E.camera("2:peso", [19.6, 1.9, 2.7], [11.0, 0.0, 1.6], 42);
  E.camera("2:base", [19.6, 1.4, 2.5], [11.3, -0.3, 1.7], 40);
  E.camera(["2:base>", 0.35], [19.5, 1.5, 2.6], [11.3, -0.3, 1.7], 40);
  E.camera("2:que#2", [6, 6.0, 4.2], [-8, 0.4, 1.4], 50);
  E.camera("2:sempre", [-9.2, 2.7, 3.4], [-14.6, 0.35, 1.4], 46);
  E.camera("2:mole", [-10.0, 2.1, 2.4], [-14.6, 0.3, 1.4], 44);
  E.camera("2:fim", [-10.1, 2.1, 2.3], [-14.6, 0.3, 1.4], 44);
  E.camera(["3:Mas", 0.4], [6.0, 4.0, 0.5], [-2.0, 0.0, 0.5], 48);
  E.camera("3:pedra", [19.6, 1.6, 2.6], [11.0, -0.15, 1.6], 42);
  E.camera("3:pó", [18.8, 1.3, 2.1], [10.0, -0.2, 1.5], 40);
  E.camera("3:rega", [19.4, 3.2, 4.4], [6.5, -0.2, 0.9], 48);
  E.camera("3:entra", [15.6, 0.5, 2.8], [12.0, -0.25, 1.4], 46);
  E.camera("3:imprimação", [19.0, 1.4, 2.7], [11.2, -0.25, 1.8], 40);
  E.camera("3:capa", [18.8, 1.3, 2.5], [10.0, -0.1, 1.7], 40);
  E.camera("3:mistura", [19.6, 3.0, 4.2], [7.0, -0.1, 1.0], 46);
  E.camera("3:cem", [18.4, 1.3, 2.4], [11.0, -0.05, 1.7], 42);
  E.camera("3:rolo", [19.4, 2.4, 2.2], [6.0, 0.2, -0.4], 46);
  E.camera("3:asfáltico", [19.6, 1.3, 2.6], [11.2, -0.1, 1.8], 40);
  E.camera("4:água", [19.0, 1.5, 2.6], [10.5, -0.1, 1.9], 42);
  E.camera("4:apodrece", [15.8, 0.6, 2.6], [12.0, -0.25, 1.6], 46);
  E.camera("4:faz", [19.6, 1.2, 1.4], [11.0, 0.0, 1.7], 50);
  E.camera("4:abaulamento", [19.4, 1.1, 1.2], [11.2, 0.0, 1.6], 48);
  E.camera("4:canaleta", [17.4, 2.0, 2.2], [10.4, -0.1, 3.2], 44);
  E.camera("4:sarjeta", [16.4, 1.7, 2.4], [10.3, -0.1, 3.3], 42);
  E.camera("4:lixo", [16.8, 1.9, 2.2], [10.1, -0.05, 3.1], 44);
  E.camera(["4:fim", 0.15], [18.2, 2.2, 5.4], [9.6, -0.05, 2.4], 46);
  E.camera("5:faixas", [19.6, 2.6, 2.6], [6.0, 0.0, 1.2], 46);
  E.camera("5:placa", [16.6, 1.7, 1.6], [10.8, 1.0, 3.9], 44);
  E.camera(["5:pare>", 0.2], [16.2, 1.7, 1.3], [10.8, 1.0, 3.9], 44);
  E.camera("5:pintou", [11.8, 2.4, -1.4], [5.0, 0.0, 1.6], 46);
  E.camera("5:Agora", [15.6, 3.4, 1.8], [6.0, 0.2, 1.6], 50);
  E.camera("5:ligar", [14.4, 2.2, 6.6], [3.0, 0.2, 1.4], 50);
  E.camera("5:Parabéns", [17, 6, 9.5], [4, 0, 1.5], 50);
  E.camera(["5:fim", 0.7], [19, 13, 13], [1, 0, 0.5], 52);

  // ================================================================= personagem: poses e trechos em que aparece
  E.anima(m, KM);
}
