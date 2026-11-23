// CENA do projeto "E se você montasse um caixa eletrônico?"
// E = motor (tempo, ações, câmera, personagem)   K = kit de peças.   Lista completa no MANUAL.md.
// Tempos: "2:palavra" = instante em que a palavra é falada no bloco 2.  ["2:palavra", 0.3] = 0,3 s depois.
export default async function (E, K) {
  const C = K.COR;
  K.mundoBairro({ lote: { x0: -6, x1: 6, z0: -5, z1: 5 } });       // ou K.mundoCampo() / K.mundoInterno()
  const m = E.mascote({ pos: [-2, 0, 2], rotY: 0.4 });               // o "você" do vídeo: aparece do começo ao fim

  // ---------------- BLOCO 1: GANCHO (jeito óbvio -> desastre -> ◀◀) + 1º ciclo ----------------
  // const muro = K.em(K.blocos({ cols: 10, fiadas: 8, cor: C.tijolo }), 0, 0, 0, "parede errada");
  // E.acelera("1:ini", "1:palavra");  E.constroi(muro, "1:ini", "1:palavra");
  // E.nota("TERRA FOFA", [0, 0, 0.5], "1:porque");  E.desaba(muro, "1:desastre");  E.errado(muro, "1:desastre", ["1:desastre", 1.2]);
  // E.rebobina(muro, "1:entao", ["1:entao", 0.8]);
  // ... jeito certo: E.entra(...), E.constroi(...);  nome: E.rotulo("FUNDAÇÃO", peca, "1:fundacao");  E.certo(peca, "1:fundacao>");

  // ---------------- ÚLTIMO BLOCO: humor + parabéns + comente ----------------
  // E.oculos(m, "5:parabens");  E.confete([0, 3, 0], "5:parabens");  E.cta("PEDREIRO", "SERVENTE", "5:comente");

  // ---------------- CÂMERA (um único plano contínuo; começa PERTO do personagem) ----------------
  E.camera("1:ini", [-1.2, 1.5, 4.2], [-2, 1.0, 2], 42);
  E.camera("1:fim", [5, 3, 8], [0, 0.8, 0], 46);
}
