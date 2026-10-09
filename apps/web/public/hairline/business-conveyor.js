/**
 * Business Conveyor: a continuous work conveyor moving lead dossiers through
 * a telephone station and an action station. The pointer slows the work and
 * highlights the selected station.
 */
const {
  Cam, facing, fit, mk, place, pointer, poly, prism, proj,
  register, rings, seg, spring, stepS, tset, tval, tween,
  unproj, disposer, solid,
} = HL;

const L = 200, W = 22, LEGS = [15, 75, 135, 195], NC = 4, CD_SPAN = 150;

function mount({ stage, svg, read }, value) {
  const bag = disposer(), C = Cam(45, 0.5, 1.35);
  fit(C, [
    [-16, -16, -22], [L + 14, -16, -22], [-16, W + 6, -22], [L + 14, W + 6, -22],
    [-16, 0, 36], [100, 11, 40], [175, -14, 42], [L + 5, 11, 15]
  ], 200, 160);
  const P = proj(C), front = facing(C), g = mk("g", {}, svg);

  const putS = (el, s) => { el.sil.setAttribute("d", s.sil); el.cr.setAttribute("d", s.crease); };

  // Support legs and feet
  const drawLegs = (y0, y1, cy0, cy1) => LEGS.forEach((lx) => {
    const [fr, fi] = rings(lx - 2.5, y0, lx + 2.5, y1, 1, 0.4);
    const [lr, li] = rings(lx - 1.2, cy0, lx + 1.2, cy1, 0.5, 0.2);
    putS(solid(g), prism(P, front, fr, fi, -22, -20));
    putS(solid(g), prism(P, front, lr, li, -20, -5));
  });
  drawLegs(-2.5, 1.5, -1.2, 0.2);

  // Calendar behind conveyor
  const calG = mk("g", {}, g), calSil = mk("path", { class: "sil" }, calG);
  const calCr = mk("path", { class: "nf lo" }, calG), calLn = mk("path", { class: "nf lo" }, calG);
  calSil.setAttribute("d", poly([P(164, -3, 0), P(190, -3, 0), P(190, -11, 34), P(164, -11, 34)]));
  calCr.setAttribute("d", seg(P(164, -11, 34), P(164, -14, 0)) + seg(P(190, -11, 34), P(190, -14, 0)));
  let cGrid = "";
  for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
    const u = 168 + c * 5.2, v = 6 + r * 8;
    cGrid += poly([P(u, -3 - v * 0.24, v), P(u + 3.8, -3 - v * 0.24, v), P(u + 3.8, -3 - (v + 6) * 0.24, v + 6), P(u, -3 - (v + 6) * 0.24, v + 6)]);
  }
  calLn.setAttribute("d", cGrid);

  // Back rail & roller bed
  const [brR, brI] = rings(-6, -1.5, L + 6, 1.5, 1, 0.4);
  putS(solid(g), prism(P, front, brR, brI, -5, 0));
  let rD = "";
  for (let rx = 8; rx < L; rx += 10) rD += seg(P(rx, 1.5, 0), P(rx, W - 1.5, 0));
  mk("path", { d: rD, class: "nf lo" }, g);

  // Traveling cards on the belt
  const cards = [];
  for (let i = 0; i < NC; i++) {
    const cg = mk("g", {}, g);
    cards.push({
      plate: mk("path", { class: "sil" }, cg),
      crease: mk("path", { class: "nf lo" }, cg),
      dot: mk("ellipse", { rx: 1.5, ry: 0.8, class: "dot m" }, cg),
    });
  }

  // Feeder shell & resting cards
  const feederG = mk("g", {}, g), feederSil = mk("path", { class: "sil" }, feederG);
  const feederCr = mk("path", { class: "nf lo" }, feederG), feederCard = mk("path", { class: "sil" }, feederG);
  const [or, oi] = rings(-8, -1, 24, W + 1, 4, 1.2);
  putS({ sil: feederSil, cr: feederCr }, prism(P, front, or, oi, 0, 16));

  // Middle station arch & telephone
  const archG = mk("g", {}, g), archSil = mk("path", { class: "sil" }, archG);
  const archCr = mk("path", { class: "nf lo" }, archG), phoneG = mk("g", {}, archG);
  const phoneSil = mk("path", { class: "sil" }, phoneG), phoneCr = mk("path", { class: "nf lo" }, phoneG);
  const [pr1, pi1] = rings(98, -1.5, 102, 1.5, 0.8, 0.3), [pr2, pi2] = rings(98, W - 1.5, 102, W + 1.5, 0.8, 0.3);
  const [br, bi] = rings(98, -1.5, 102, W + 1.5, 0.8, 0.3);
  const p1 = prism(P, front, pr1, pi1, -5, 34), p2 = prism(P, front, pr2, pi2, -5, 34), pb = prism(P, front, br, bi, 32, 35);
  archSil.setAttribute("d", p1.sil + p2.sil + pb.sil);
  archCr.setAttribute("d", p1.crease + p2.crease + pb.crease);

  // Action station stamp & output stack
  const stampG = mk("g", {}, g), stampPost = mk("path", { class: "sil" }, stampG);
  const stampHead = mk("path", { class: "sil" }, stampG), stampCr = mk("path", { class: "nf lo" }, stampG);
  const [spr, spi] = rings(158, -1.5, 162, 1.5, 0.8, 0.3), [sar, sai] = rings(158, 0.5, 162, 13, 0.8, 0.3);
  const pp = prism(P, front, spr, spi, -5, 34), pa = prism(P, front, sar, sai, 31, 34);
  stampPost.setAttribute("d", pp.sil + pa.sil);
  stampCr.setAttribute("d", pp.crease + pa.crease);

  for (let k = 0; k < 3; k++) {
    const [sr, si] = rings(186, 3, 202, W - 3, 1.5, 0.5);
    putS(solid(g), prism(P, front, sr, si, k * 2.5, k * 2.5 + 2));
  }

  // Front rail & legs
  const [frR, frI] = rings(-6, W - 1.5, L + 6, W + 1.5, 1, 0.4);
  putS(solid(g), prism(P, front, frR, frI, -5, 0));
  drawLegs(W - 1.5, W + 2.5, W - 0.7, W + 0.7);

  function drawPhone(lift) {
    const z = 24 + lift, [e1, i1] = rings(98.5, 4, 101.5, 8, 1.2, 0.4), [e2, i2] = rings(98.5, 14, 101.5, 18, 1.2, 0.4);
    const [hbr, hbi] = rings(99, 7.5, 101, 14.5, 0.8, 0.3);
    const hp1 = prism(P, front, e1, i1, z, z + 4), hp2 = prism(P, front, e2, i2, z, z + 4), hpb = prism(P, front, hbr, hbi, z + 2, z + 6);
    phoneSil.setAttribute("d", hp1.sil + hp2.sil + hpb.sil);
    phoneCr.setAttribute("d", hp1.crease + hp2.crease + hpb.crease);
  }

  function drawCard(c, cx) {
    const [cr, ci] = rings(cx, 3, cx + 18, 19, 1.8, 0.5);
    const pr = prism(P, front, cr, ci, 0.5, 1.5);
    c.plate.setAttribute("d", pr.sil);
    c.crease.setAttribute("d", pr.crease + seg(P(cx + 6, 7, 1.5), P(cx + 14, 7, 1.5)) + seg(P(cx + 3, 11, 1.5), P(cx + 14, 11, 1.5)));
    place(c.dot, P(cx + 4, 7, 1.5));
  }

  let beltPos = 0, userSpeed = value;
  const speedSp = spring(1, { k: 80, c: 16 }), fLift = tween(0), pLift = tween(0), sDrop = tween(0);

  const B = register(stage, (dt, now) => {
    stepS(speedSp, dt);
    beltPos = (beltPos + speedSp.x * userSpeed * 20 * dt) % CD_SPAN;
    for (let i = 0; i < NC; i++) drawCard(cards[i], 25 + (beltPos + i * (CD_SPAN / NC)) % CD_SPAN);
    drawPhone(tval(pLift, now));
    const [shr, shi] = rings(156, 7, 164, 15, 1.2, 0.4);
    stampHead.setAttribute("d", prism(P, front, shr, shi, 10 - tval(sDrop, now), 16 - tval(sDrop, now)).sil);
    const fL = tval(fLift, now);
    feederCard.setAttribute("d", poly([P(12, 4, 2 + fL), P(28, 4, 2 + fL), P(28, W - 4, 2 + fL), P(12, W - 4, 2 + fL)]));
    return true;
  });
  bag.add(B.unregister);

  let act = -1;
  const CAPTIONS = ["lead", "call", "action"];
  function setActive(a) {
    if (a === act) return;
    const now = performance.now();
    act = a;
    speedSp.t = a >= 0 ? 0.25 : 1.0;
    tset(fLift, a === 0 ? 4 : 0, now, 0);
    tset(pLift, a === 1 ? 5 : 0, now, 0);
    tset(sDrop, a === 2 ? 4 : 0, now, 0);
    feederSil.classList.toggle("hi", a === 0);
    phoneSil.classList.toggle("hi", a === 1);
    stampHead.classList.toggle("hi", a === 2);
    calSil.classList.toggle("hi", a === 2);
    read.textContent = a < 0 ? "rest" : CAPTIONS[a];
    B.wake();
  }

  function hit(pt) {
    const [wx, wy] = unproj(C, pt[0], pt[1], 0);
    if (wy < -25 || wy > W + 20) return -1;
    if (wx >= -15 && wx < 55) return 0;
    if (wx >= 55 && wx < 135) return 1;
    if (wx >= 135 && wx < 215) return 2;
    return -1;
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { userSpeed = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "business-conveyor",
  means: "A continuous work conveyor moving lead dossiers through a telephone station and an action station.",
  rules: [1, 4, 7, 8],
  range: [0.2, 0.5, 1.0],
  tour: [[120, 125], [196, 140], [268, 170], null],
  mount,
});
