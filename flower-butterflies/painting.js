// All botanical marks are drawn here; no reference-image pixels are used.
export function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function createPainting(aspect) {
  const canvas = document.createElement('canvas');
  canvas.height = Math.min(1800, Math.round(3200 / Math.max(1, aspect)));
  canvas.width = Math.max(1, Math.round(canvas.height * aspect));
  const ctx = canvas.getContext('2d'), rand = random(5173);
  const w = canvas.width, h = canvas.height, unit = h / 16;
  ctx.fillStyle = '#b9a76c'; ctx.fillRect(0, 0, w, h);
  // Fine crossed threads, mottling, and irregular fibres suggest aged silk.
  for (let y = 0; y < h; y += 2) {
    ctx.strokeStyle = y % 6 ? '#eee0ab24' : '#574e3618';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + .8); ctx.stroke();
  }
  for (let x = 0; x < w; x += 3) {
    ctx.strokeStyle = '#f5e6b31b'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 16, h); ctx.stroke();
  }
  for (let i = 0; i < w * h / 75; i++) {
    ctx.fillStyle = rand() > .5 ? '#fff2b917' : '#3d36210d';
    ctx.fillRect(rand() * w, rand() * h, .5 + rand() * 2, .5 + rand() * 2);
  }
  const targets = [];
  function leaf(x, y, angle, length) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const broad = .26 + rand() * .2, curl = (rand() - .5) * .17;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * .2, -length * broad, length * .58, -length * (broad + curl), length, length * curl);
    ctx.bezierCurveTo(length * .6, length * broad * .5, length * .28, length * broad * .8, 0, 0);
    ctx.fillStyle = ['#30362b', '#434832', '#53523a', '#272f29'][Math.floor(rand() * 4)];
    ctx.fill(); ctx.strokeStyle = '#292b24'; ctx.lineWidth = .9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(length * .5, -length * .03, length * .9, 0);
    ctx.strokeStyle = '#a3996277'; ctx.lineWidth = .8; ctx.stroke();
    for (let j = 1; j < 5; j++) {
      const t = j / 6; ctx.beginPath(); ctx.moveTo(length * t, 0);
      ctx.lineTo(length * (t + .16), -length * .13); ctx.stroke();
    }
    ctx.restore();
  }
  function bloom(x, y, radius, color, openness) {
    const colors = color === 'red' ? ['#713931', '#a54d43', '#c37b6a', '#e3b4a1'] : color === 'pink' ? ['#a16b66', '#c3948c', '#e2bcb0', '#f4ddd0'] : ['#a8a28a', '#d0cbb4', '#e6e1cb', '#fff3dc'];
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .72 + rand() * .19); ctx.rotate((rand() - .5) * .6);
    ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.ellipse(0, 0, radius * .82, radius * .7, 0, 0, 7); ctx.fill();
    const rings = openness > .65 ? 4 : 5;
    for (let layer = 0; layer < rings; layer++) {
      const petals = 7 + layer * 2 + Math.floor(rand() * 3);
      const r = radius * (1 - layer * .15);
      for (let j = 0; j < petals; j++) {
        const angle = j / petals * Math.PI * 2 + layer * .49 + (rand() - .5) * .28;
        const reach = r * (.83 + rand() * .24), breadth = r * (.29 + rand() * .2);
        const fold = .73 + rand() * .21, root = radius * (.07 + openness * .12);
        ctx.save(); ctx.rotate(angle); ctx.translate((rand() - .5) * radius * .09, 0);
        // Broad, cupped petals with a softly notched, rolled outer lip.
        ctx.beginPath(); ctx.moveTo(root, -breadth * .13);
        ctx.bezierCurveTo(reach * .36, -breadth * .7, reach * .91, -breadth, reach * .97, -breadth * .42);
        ctx.bezierCurveTo(reach * 1.12, -breadth * .22, reach * fold, -breadth * .1, reach, breadth * .1);
        ctx.bezierCurveTo(reach * 1.07, breadth * .39, reach * .86, breadth * .66, reach * .7, breadth * .55);
        ctx.bezierCurveTo(reach * .45, breadth * .73, reach * .27, breadth * .3, root, breadth * .13);
        ctx.closePath();
        const wash = ctx.createLinearGradient(root, 0, reach, -breadth * .3);
        wash.addColorStop(0, colors[0]); wash.addColorStop(.48, colors[1]); wash.addColorStop(1, colors[2 + (layer > 1 ? 1 : 0)]);
        ctx.fillStyle = wash; ctx.fill();
        ctx.strokeStyle = color === 'red' ? '#edc5afbd' : '#fff5e4d9'; ctx.lineWidth = radius * .014; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(reach * .45, -breadth * .2);
        ctx.bezierCurveTo(reach * .65, -breadth * .35, reach * .84, -breadth * .3, reach * .91, -breadth * .36);
        ctx.strokeStyle = colors[3]; ctx.lineWidth = radius * .019; ctx.stroke();
        ctx.restore();
      }
    }
    // Open flowers reveal sparse stamens; the fuller cups conceal their centre.
    if (openness > .55) for (let i = 0; i < 32; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius * .2 * openness;
      const xx = Math.cos(a) * r, yy = Math.sin(a) * r * .7;
      ctx.beginPath(); ctx.moveTo(xx * .3, yy * .3 + radius * .07); ctx.lineTo(xx, yy - radius * .04);
      ctx.strokeStyle = '#a48548'; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = i % 3 ? '#e4c16b' : '#94703e'; ctx.beginPath(); ctx.ellipse(xx, yy - radius * .04, 1.1, 1.7, a, 0, 7); ctx.fill();
    }
    ctx.restore();
    targets.push({ x: (x - w / 2) / unit, y: (h / 2 - y) / unit });
  }
  // Tall left bank, lower right bank, and a hollow opening between them.
  const plants = [];
  const count = Math.max(23, Math.round(aspect * 25));
  for (let i = 0; i < count; i++) {
    const x = rand() * w, nx = x / w;
    const bank = nx < .37 ? .35 + rand() * .48 : nx > .72 ? .2 + rand() * .3 : .12 + rand() * .27;
    const top = h * (1 - bank * .65);
    plants.push({ x, top, bend: (rand() - .5) * unit * 2.7, radius: unit * (.43 + rand() * .34), color: rand() < .18 ? 'red' : rand() < .5 ? 'pink' : 'white', variety: .2 + rand() * .8 });
  }
  // A few unmistakably tall, open stems on the left of the reference composition.
  plants.push({ x: w * .17, top: h * .48, bend: unit * .8, radius: unit * .8, color: 'pink', variety: .28 });
  plants.push({ x: w * .29, top: h * .59, bend: unit * .55, radius: unit * .73, color: 'white', variety: .72 });
  plants.sort((a, b) => a.top - b.top);
  for (const p of plants) {
    const root = p.x - p.bend, height = h + 30 - p.top;
    ctx.beginPath(); ctx.moveTo(root, h + 30); ctx.bezierCurveTo(root - p.bend * .3, h - height * .35, p.x + p.bend * .25, p.top + height * .2, p.x, p.top);
    ctx.strokeStyle = '#33362b'; ctx.lineWidth = unit * .035; ctx.stroke();
    ctx.strokeStyle = '#a29259'; ctx.lineWidth = unit * .009; ctx.stroke();
    const nodes = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < nodes; j++) {
      const t = .12 + (j + rand() * .7) / nodes * .65, s = 1 - t;
      const yy = s * s * s * (h + 30) + 3 * s * s * t * (h - height * .35) + 3 * s * t * t * (p.top + height * .2) + t * t * t * p.top;
      const xx = s * s * s * root + 3 * s * s * t * (root - p.bend * .3) + 3 * s * t * t * (p.x + p.bend * .25) + t * t * t * p.x;
      const side = rand() > .5 ? 1 : -1;
      const branchX = xx + side * unit * (.2 + rand() * .4), branchY = yy - unit * (.14 + rand() * .3);
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(branchX, yy, branchX, branchY);
      ctx.strokeStyle = '#414331'; ctx.lineWidth = unit * .019; ctx.stroke();
      const angle = side === 1 ? -.5 - rand() * .6 : Math.PI + .2 + rand() * .55;
      leaf(branchX, branchY, angle, unit * (.45 + rand() * .45));
      if (rand() > .25) leaf(branchX, branchY, angle + side * .65, unit * (.28 + rand() * .34));
      if (rand() > .6) leaf(branchX, branchY, angle - side * .65, unit * (.24 + rand() * .3));
    }
    // Overlapping basal leaves close the lower edge, rather than a row of bare stems.
    for (let j = 0; j < 3; j++) {
      leaf(root + (rand() - .5) * unit * .35, h - rand() * unit * .4, -Math.PI * (.14 + rand() * .72), unit * (.5 + rand() * .55));
    }
  }
  for (const p of plants) bloom(p.x, p.top, p.radius, p.color, p.variety);
  return { canvas, targets };
}

export function wingTexture(kind) {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 512;
  const c = canvas.getContext('2d');
  const palettes = [['#d4b65f','#302e26','#f4dd8a'], ['#dedac2','#514b3c','#f4efd8'], ['#303b3e','#191f22','#8d9c93'], ['#b4844e','#443b2d','#debb7a']];
  const [base, ink, spot] = palettes[kind % palettes.length];
  c.beginPath(); c.moveTo(26, 260);
  c.bezierCurveTo(55, 190, 167, 13, 317, 25);
  c.bezierCurveTo(375, 29, 349, 154, 315, 225);
  c.bezierCurveTo(306, 251, 284, 269, 263, 275);
  c.bezierCurveTo(337, 312, 319, 381, 272, 404);
  c.quadraticCurveTo(256, 421, 259, 469); c.quadraticCurveTo(239, 455, 230, 414);
  c.bezierCurveTo(153, 456, 82, 376, 26, 260);
  c.fillStyle = base; c.fill(); c.strokeStyle = ink; c.lineWidth = 13; c.stroke();
  c.save(); c.clip();
  for (let i = 0; i < 10; i++) {
    const y = 35 + i * 39, x = 310 + Math.sin(i * .65) * 20;
    c.beginPath(); c.moveTo(27, 260); c.quadraticCurveTo(155, 200 + i * 13, x, y);
    c.strokeStyle = ink; c.lineWidth = kind === 2 ? 3 : 5; c.stroke();
    c.fillStyle = spot; c.beginPath(); c.ellipse(x - 15, y + 5, 9, 13, -.4, 0, 7); c.fill();
  }
  c.beginPath(); c.moveTo(56, 247); c.bezierCurveTo(175, 175, 257, 167, 339, 127);
  c.strokeStyle = ink; c.lineWidth = 8; c.stroke();
  for (let i = 0; i < 5; i++) {
    c.beginPath(); c.ellipse(192 + i * 22, 82 + i * 24, 7, 19, -.55, 0, 7); c.fillStyle = ink; c.fill();
  }
  c.restore(); return canvas;
}
