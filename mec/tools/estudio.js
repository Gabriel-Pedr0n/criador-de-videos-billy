// roda dentro do viewer.html (window.E pronto). Devolve imagens e GLBs em base64.
async (args) => {
  const E = window.E, T = E.THREE;
  const { makeChar, animateChar } = await import('./chars.js?v=' + Date.now());
  const { GLTFExporter } = await import('./vendor/three/jsm/exporters/GLTFExporter.js');
  const ex = new GLTFExporter();
  const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const glb = async (o) => b64(await ex.parseAsync(o, { binary: true, onlyVisible: true }));
  // ---------- estúdio de fotos
  const W = args.w || 900, H = args.h || 1200;
  const R = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); R.setSize(W, H); R.setPixelRatio(1);
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = T.SRGBColorSpace; R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  const S = new T.Scene(); S.background = null;
  S.add(new T.HemisphereLight(0xEAF4FF, 0x8a7a66, 1.35));
  const key = new T.DirectionalLight(0xFFF2DE, 2.6); key.position.set(2.5, 4, 3.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -1.5; key.shadow.camera.right = key.shadow.camera.top = 1.5; S.add(key);
  const rim = new T.DirectionalLight(0xBFD8FF, 1.4); rim.position.set(-3, 2.5, -3); S.add(rim);
  const fill = new T.DirectionalLight(0xFFFFFF, 0.6); fill.position.set(-3, 1.5, 2.5); S.add(fill);
  const chao = new T.Mesh(new T.CircleGeometry(1.4, 64), new T.ShadowMaterial({ opacity: 0.25 })); chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; S.add(chao);
  const cam = new T.PerspectiveCamera(28, W / H, 0.05, 50);
  const foto = (alvo, dist, yaw, pitch, fov = 28) => { cam.fov = fov; cam.updateProjectionMatrix(); const a = new T.Vector3(...alvo);
    cam.position.set(a.x + dist * Math.sin(yaw) * Math.cos(pitch), a.y + dist * Math.sin(pitch), a.z + dist * Math.cos(yaw) * Math.cos(pitch)); cam.lookAt(a); R.render(S, cam); return R.domElement.toDataURL('image/png'); };
  const out = { fotos: {}, glb: {} };
  // ---------- personagem
  const c = makeChar({ ph: 0 }); animateChar(c, [[0, 'idle', 0.3]], 0.0); const olhos = () => c.userData.eyes.forEach(e => e.scale.y = 1); olhos(); c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const U = c.userData; const nomes = { head: 'cabeca', spine: 'tronco', armL: 'braco_esq', armR: 'braco_dir', elbowL: 'antebraco_esq', elbowR: 'antebraco_dir', handL: 'mao_esq', handR: 'mao_dir', legL: 'perna_esq', legR: 'perna_dir', kneeL: 'canela_esq', kneeR: 'canela_dir' };
  for (const [k, n] of Object.entries(nomes)) if (U[k]) U[k].name = n; c.name = 'billy';
  S.add(c); c.updateMatrixWorld(true);
  const vistas = [['frente', 0, 0.05], ['tres_quartos_esq', -0.78, 0.08], ['perfil_esq', -1.5708, 0.05], ['costas_tres_quartos', -2.36, 0.1], ['costas', 3.1416, 0.05], ['perfil_dir', 1.5708, 0.05], ['tres_quartos_dir', 0.78, 0.08], ['de_cima', 0.4, 1.0]];
  for (const [n, y, p] of vistas) out.fotos['mascote_' + n] = foto([0, 0.82, 0], 4.3, y, p);
  out.fotos['mascote_rosto'] = foto([0, 1.38, 0], 1.25, 0.35, 0.05, 30);
  out.fotos['mascote_maos'] = foto([0.27, 0.62, 0.05], 0.8, 0.6, 0.1, 30);
  out.fotos['mascote_tenis'] = foto([0.1, 0.06, 0.08], 0.9, 0.7, 0.35, 30);
  // poses de referência
  for (const p of ['wave', 'cheer', 'reach', 'shrug', 'worried', 'press']) { animateChar(c, [[0, p, 0.01]], 1.0); olhos(); c.updateMatrixWorld(true); out.fotos['pose_' + p] = foto([0, 0.85, 0], 4.6, 0.45, 0.06); }
  animateChar(c, [[0, 'idle', 0.01]], 0.0); olhos(); c.updateMatrixWorld(true);
  // foto de perfil (quadrada, fundo transparente): meio corpo, acenando, olhando para a câmera
  R.setSize(1080, 1080); cam.aspect = 1;
  for (const [nm, pose, yaw] of [['perfil_aceno', 'wave', 0.32], ['perfil_comemora', 'cheer', 0.25], ['perfil_frente', 'idle', 0.18]]) {
    animateChar(c, [[0, pose, 0.01]], 1.0); olhos(); c.updateMatrixWorld(true); out.fotos[nm] = foto([0.02, 1.2, 0], 2.55, yaw, 0.06, 30); }
  R.setSize(W, H); cam.aspect = W / H; animateChar(c, [[0, 'idle', 0.01]], 0.0); olhos(); c.updateMatrixWorld(true);
  S.remove(c); out.glb.mascote = await glb(c);
  // vista explodida: cada peça separada (cabeça+capacete, tronco+moletom, braços, pernas+tênis)
  const xp = makeChar({ ph: 0 }); animateChar(xp, [[0, 'idle', 0.3]], 0.0); xp.userData.eyes.forEach(e => e.scale.y = 1); const X = xp.userData; for (const [k, n] of Object.entries(nomes)) if (X[k]) X[k].name = n; xp.name = 'mascote_explodido';
  X.head.position.y += 0.42; X.armL.position.x -= 0.32; X.armR.position.x += 0.32; X.elbowL.position.y -= 0.12; X.elbowR.position.y -= 0.12; X.handL.position.y -= 0.1; X.handR.position.y -= 0.1;
  X.legL.position.x -= 0.18; X.legR.position.x += 0.18; X.legL.position.y -= 0.12; X.legR.position.y -= 0.12; X.kneeL.position.y -= 0.12; X.kneeR.position.y -= 0.12;
  xp.position.y = 0.35; xp.traverse(o => { if (o.isMesh) o.castShadow = true; }); S.add(xp); xp.updateMatrixWorld(true);
  out.fotos['mascote_explodido'] = foto([0, 1.05, 0], 5.6, 0.5, 0.12); out.fotos['mascote_explodido_frente'] = foto([0, 1.05, 0], 5.6, 0, 0.05);
  S.remove(xp); xp.position.y = 0; out.glb.mascote_pecas = await glb(xp);
  // ---------- objetos da história (cena carregada em window.E)
  E.frame(args.t || 0);
  const lista = args.objetos || [];
  const props = new T.Group(); props.name = 'objetos_' + (args.slug || 'cena');
  let i = 0; const cols = 5, passo = 2.6;
  for (const nome of lista) { let o = null; E.scene.traverse(x => { if (!o && x.name === nome) o = x; }); if (!o) { out.faltou = (out.faltou || []).concat(nome); continue; }
    const cl = o.clone(true); cl.name = nome; cl.position.set(0, 0, 0); cl.rotation.set(0, o.rotation.y, 0); cl.scale.copy(o.scale.lengthSq() < 1e-6 ? new T.Vector3(1, 1, 1) : o.scale); cl.visible = true; cl.traverse(x => { x.visible = true; });
    // foto individual
    const bx = new T.Box3().setFromObject(cl), sz = bx.getSize(new T.Vector3()), ctr = bx.getCenter(new T.Vector3()); const r = Math.max(sz.x, sz.y, sz.z);
    cl.traverse(x => { if (x.isMesh) { x.castShadow = true; } }); S.add(cl); chao.scale.setScalar(Math.max(1, r)); key.shadow.camera.left = key.shadow.camera.bottom = -r * 1.2; key.shadow.camera.right = key.shadow.camera.top = r * 1.2; key.shadow.camera.updateProjectionMatrix();
    cl.position.y = -bx.min.y; const c2 = ctr.clone(); c2.y += -bx.min.y;
    out.fotos['obj_' + String(i).padStart(2, '0') + '_' + nome.replace(/[^a-zA-Z0-9à-ú]+/gi, '_')] = foto([c2.x, c2.y, c2.z], r * 3.2 + 0.3, 0.6, 0.25, 30); S.remove(cl);
    cl.position.set((i % cols) * passo - (cols - 1) * passo / 2, -bx.min.y, -Math.floor(i / cols) * passo); props.add(cl); i++; }
  out.glb.objetos = await glb(props);
  return out;
}
