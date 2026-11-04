// All botanical marks are drawn here; no reference-image pixels are used.
export function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function createPainting(aspect) {
  const canvas = document.createElement('canvas');
  canvas.height = 1800; canvas.width = Math.round(1800 * aspect);
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
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * .2, -length * .42, length * .55, -length * .16, length, 0);
    ctx.bezierCurveTo(length * .56, length * .22, length * .25, length * .32, 0, 0);
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
  function bloom(x, y, radius, color, variety) {
    const colors = color === 'red' ? ['#b6422b', '#ce5031', '#dc6545'] : color === 'pink' ? ['#c4837c', '#d8a89b', '#e5c6b3'] : ['#c8c8af', '#dfdfc9', '#f3eed6'];
    ctx.save(); ctx.translate(x, y); ctx.scale(1, .76 + rand() * .18); ctx.rotate(rand() * 3);
    const rings = variety ? 4 : 3, petals = variety ? 28 : 15;
    for (let layer = 0; layer < rings; layer++) {
      const r = radius * (1 - layer * .2);
      for (let j = 0; j < petals; j++) {
        const angle = j / petals * Math.PI * 2 + layer * .24 + (rand() - .5) * .12;
        const reach = r * (.85 + rand() * .22), breadth = radius * (variety ? .08 : .19);
        ctx.save(); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(radius * .06, 0);
        ctx.bezierCurveTo(reach * .5, -breadth, reach * 1.16, -breadth, reach, 0);
        ctx.bezierCurveTo(reach * 1.05, breadth * .85, reach * .4, breadth * .6, radius * .06, 0);
        ctx.fillStyle = colors[Math.min(layer, 2)]; ctx.fill();
        ctx.strokeStyle = color === 'red' ? '#e4a17b' : '#fff6df'; ctx.lineWidth = radius * .022; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(reach * .3, 0); ctx.quadraticCurveTo(reach * .7, -breadth * .2, reach * .94, 0);
        ctx.strokeStyle = color === 'red' ? '#803d2944' : '#8c6b5944'; ctx.lineWidth = .65; ctx.stroke(); ctx.restore();
      }
    }
    ctx.fillStyle = '#a88a37'; ctx.beginPath(); ctx.ellipse(0, 0, radius * .26, radius * .22, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 85; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius * .25;
      ctx.fillStyle = i % 3 ? '#e6c56a' : '#80642e'; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .8, .8 + rand(), 0, 7); ctx.fill();
    }
    ctx.restore();
    targets.push({ x: (x - w / 2) / unit, y: (h / 2 - y) / unit });
  }
  // Tall left bank, lower right bank, and a hollow opening between them.
  const plants = [];
  const count = Math.max(26, Math.round(aspect * 34));
  for (let i = 0; i < count; i++) {
    const x = rand() * w, nx = x / w;
    const bank = nx < .37 ? .45 + rand() * .45 : nx > .72 ? .18 + rand() * .23 : .12 + rand() * .19;
    const top = h * (1 - bank * .65);
    plants.push({ x, top, bend: (rand() - .5) * unit * 1.7, radius: unit * (.36 + rand() * .32), color: rand() < .24 ? 'red' : rand() < .45 ? 'pink' : 'white', variety: rand() > .45 });
  }
  // A few unmistakably tall, open stems on the left of the reference composition.
  plants.push({ x: w * .17, top: h * .48, bend: unit * .45, radius: unit * .68, color: 'pink', variety: false });
  plants.push({ x: w * .29, top: h * .59, bend: unit * .55, radius: unit * .6, color: 'white', variety: true });
  plants.sort((a, b) => a.top - b.top);
  for (const p of plants) {
    const root = p.x - p.bend, height = h + 30 - p.top;
    ctx.beginPath(); ctx.moveTo(root, h + 30); ctx.bezierCurveTo(root - p.bend * .3, h - height * .35, p.x + p.bend * .25, p.top + height * .2, p.x, p.top);
    ctx.strokeStyle = '#33362b'; ctx.lineWidth = unit * .035; ctx.stroke();
    ctx.strokeStyle = '#a29259'; ctx.lineWidth = unit * .009; ctx.stroke();
    for (let j = 1; j < 7; j++) {
      const t = j / 8, yy = h + 20 - height * t, xx = root + p.bend * t;
      const side = j % 2 ? 1 : -1;
      leaf(xx, yy, side === 1 ? -.45 - rand() * .6 : Math.PI + .2 + rand() * .65, unit * (.34 + rand() * .42));
      if (j % 2 === 0) leaf(xx, yy, side === 1 ? .3 : Math.PI - .3, unit * (.3 + rand() * .35));
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
