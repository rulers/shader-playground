import * as THREE from '../third_party/three/three.module.js';

// Outlines are shared by the texture painter and the actual mesh, not merely
// different colours on a common rectangular wing. Positive x is the right wing.
export const SPECIES = [
  {
    id: 'swallowtail', label: 'アゲハ型', size: 1,
    fore: [['M', .012, .08], ['C', .12, .31, .43, .73, .66, .72], ['C', .83, .68, .71, .32, .54, .1], ['C', .4, -.05, .15, -.02, .012, .08], ['Z']],
    hind: [['M', .015, .04], ['C', .22, .08, .48, -.01, .55, -.19], ['Q', .59, -.3, .46, -.31], ['L', .43, -.62], ['Q', .39, -.67, .38, -.32], ['Q', .31, -.44, .25, -.35], ['Q', .15, -.42, .09, -.25], ['Q', .02, -.13, .015, .04], ['Z']]
  },
  {
    id: 'bluebottle', label: 'アオスジアゲハ型', size: .91,
    fore: [['M', .012, .08], ['C', .16, .32, .49, .74, .73, .87], ['C', .83, .83, .71, .4, .49, .12], ['Q', .28, -.04, .012, .08], ['Z']],
    hind: [['M', .015, .04], ['C', .21, .04, .45, -.02, .5, -.2], ['Q', .52, -.31, .4, -.38], ['Q', .25, -.45, .12, -.24], ['Q', .03, -.13, .015, .04], ['Z']]
  },
  {
    id: 'cabbage-white', label: 'モンシロチョウ型', size: .78,
    fore: [['M', .012, .08], ['C', .08, .3, .21, .59, .42, .59], ['C', .64, .61, .66, .39, .54, .18], ['C', .44, .02, .22, -.03, .012, .08], ['Z']],
    hind: [['M', .015, .04], ['C', .25, .04, .46, -.02, .49, -.22], ['C', .51, -.46, .27, -.5, .12, -.32], ['C', .03, -.23, .01, -.08, .015, .04], ['Z']]
  }
];

export function traceWing(target, commands) {
  for (const [op, ...args] of commands) {
    if (op === 'M') target.moveTo(...args);
    else if (op === 'C') target.bezierCurveTo(...args);
    else if (op === 'Q') target.quadraticCurveTo(...args);
    else if (op === 'L') target.lineTo(...args);
    else target.closePath();
  }
}

export function wingGeometry(species, part) {
  const shape = new THREE.Shape(); traceWing(shape, SPECIES[species][part]);
  const geometry = new THREE.ShapeGeometry(shape, 24);
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / .85, (position.getY(i) + .7) / 1.6);
  geometry.computeBoundingBox();
  return geometry;
}

export function createButterfly(species, materials) {
  const group = new THREE.Group(), wings = [];
  group.name = SPECIES[species].id;
  for (const side of [-1, 1]) for (const part of ['fore', 'hind']) {
    const hinge = new THREE.Group(); hinge.name = `${side < 0 ? 'left' : 'right'}-${part}`;
    const wing = new THREE.Mesh(wingGeometry(species, part), materials[part]);
    wing.name = `${part}-wing`; wing.scale.x = side;
    hinge.position.set(side * .012, part === 'fore' ? .055 : -.015, part === 'fore' ? .025 : -.025);
    hinge.add(wing); group.add(hinge); wings.push(hinge);
  }
  const ink = new THREE.MeshBasicMaterial({ color: '#292d28' });
  group.add(new THREE.Mesh(new THREE.CapsuleGeometry(.025, .33, 3, 7), ink));
  for (const side of [-1, 1]) {
    const points = [new THREE.Vector3(0, .17, .015), new THREE.Vector3(side * .045, .26, .015), new THREE.Vector3(side * .085, .29, .015)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#292d28' })));
  }
  return { group, wings, species };
}

// ZXY keeps heading in the painting's plane and yaw about the body's local axis.
// Fore/hind wings have separate hinges, depth and a small phase lag.
export function poseButterfly(b) {
  b.group.position.set(b.x + b.offsetX, b.y + b.offsetY, b.z);
  b.group.rotation.set(.1 + b.vy * .23, b.yaw, b.heading + b.bank * .08, 'ZXY');
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1, hind = i % 2 === 1;
    const fold = hind ? .08 + b.flap * .8 + Math.sin(b.phase - .35) * .045 : b.flap;
    b.wings[i].rotation.y = -side * (fold + side * b.yaw * .025);
    b.wings[i].rotation.z = hind ? side * (.045 + b.flap * .055) : 0;
  }
}
