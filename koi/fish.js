import * as THREE from '../third_party/three/three.module.js';

const TAU = Math.PI * 2;
const ivory = new THREE.Color('#eee6d2'), red = new THREE.Color('#a53a23');
const black = new THREE.Color('#202c2b'), gold = new THREE.Color('#c99c43');
function randomPoint(id, index, channel) {
    const value = Math.sin(id * 91.7 + index * 127.1 + channel * 311.7) * 43758.5453;
    return value - Math.floor(value);
}
// Integral of a strictly positive, individual burst-and-glide rhythm.
// Modulating the clock, rather than multiplying positions, avoids jumps.
export function swimClock(time, id) {
    const frequency = .72 + id * .037, phase = id * 1.83;
    return time + .38 / frequency * (Math.sin(time * frequency + phase) - Math.sin(phase))
        + .12 / (2 * frequency) * (Math.sin(time * 2 * frequency + phase + .7) - Math.sin(phase + .7));
}
function effort(time, id) {
    const frequency = .72 + id * .037, phase = id * 1.83;
    return 1 + .38 * Math.cos(time * frequency + phase) + .12 * Math.cos(time * 2 * frequency + phase + .7);
}
// Seeded waypoints with a C2-continuous B-spline, rather than a closed orbit.
// Its convex hull keeps the complete path within the swimming volume.
export function sampleSwimPath(id, time, width, depth, target = new THREE.Vector3()) {
    const clock = swimClock(time, id) / (5.8 + id * .23), segment = Math.floor(clock), u = clock - segment;
    const weights = [Math.pow(1 - u, 3) / 6, (3*u*u*u - 6*u*u + 4) / 6, (-3*u*u*u + 3*u*u + 3*u + 1) / 6, u*u*u / 6];
    target.set(0, 0, 0);
    for (let n = 0; n < 4; n++) {
        const index = segment + n - 1, weight = weights[n];
        const surfaceVisit = ((index + id * 2) % 9 + 9) % 9 < 3;
        target.x += (randomPoint(id, index, 0) * 2 - 1) * width * .82 * weight;
        target.y += (surfaceVisit ? 1.04 : -.45 + randomPoint(id, index, 1) * 1.15) * weight;
        target.z += (randomPoint(id, index, 2) * 2 - 1) * depth * .82 * weight;
    }
    return target;
}
function pattern(x, z, id) {
    const stain = Math.sin(x * 12 + id * 3) + .65 * Math.cos(z * 19 - x * 5 + id);
    if (id === 4) return gold;
    if (id === 3) return x > .28 && Math.abs(z) < .16 ? red : ivory;
    if (id === 5) return Math.abs(z) > .16 ? red : black;
    if (id === 6) return stain > .7 ? black : ivory;
    if (id === 2 && stain < -.3) return black;
    if (id === 1 && stain < -1) return black;
    return ivory.clone().lerp(red, THREE.MathUtils.smoothstep(stain, .12, .48));
}
function fin(points, material) {
    const geometry = new THREE.BufferGeometry(), positions = new Float32Array(points.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    const indices = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.rest = positions; mesh.frustumCulled = false;
    return mesh;
}
export function createFish(id) {
    const group = new THREE.Group(), geometry = new THREE.BufferGeometry();
    const rings = 64, sides = 32, vertices = [], colors = [], indices = [];
    const profile = [[-.86,.035],[-.65,.07],[-.35,.17],[0,.26],[.30,.25],[.52,.19],[.68,.12],[.77,.025]];
    for (let i = 0; i <= rings; i++) {
        const u = i / rings, x = -.86 + u * 1.63;
        const section = profile.findIndex((point, n) => n < profile.length - 1 && x <= profile[n + 1][0]);
        const left = profile[Math.max(0, section)], next = profile[Math.max(0, section) + 1];
        const width = THREE.MathUtils.lerp(left[1], next[1], THREE.MathUtils.smoothstep(x, left[0], next[0]));
        for (let j = 0; j <= sides; j++) {
            const theta = j / sides * TAU, y = Math.cos(theta) * width * .62, z = Math.sin(theta) * width;
            vertices.push(x, y, z);
            const tint = pattern(x, z, id).clone();
            if (y < -.01) tint.lerp(ivory, .7);
            colors.push(tint.r, tint.g, tint.b);
            if (i < rings && j < sides) {
                const a = i * (sides + 1) + j, b = a + sides + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
    }
    const rest = new Float32Array(vertices);
    geometry.setAttribute('position', new THREE.BufferAttribute(rest.slice(), 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .48, metalness: .04, side: THREE.DoubleSide }));
    body.castShadow = true; body.frustumCulled = false; group.add(body);
    const material = new THREE.MeshStandardMaterial({ color: '#9b9a7d', roughness: .7, transparent: true, opacity: .63, side: THREE.DoubleSide, depthWrite: false });
    const tail = fin([[-.80,0,0],[-1.02,.01,.18],[-1.32,0,.35],[-1.20,0,0],[-1.32,0,-.35],[-1.02,.01,-.18]], material);
    const fins = [tail];
    for (const sign of [-1, 1]) fins.push(fin([[.27,-.035,sign*.17],[.04,-.08,sign*.48],[-.24,-.055,sign*.35],[-.12,-.02,sign*.18]], material));
    fins.push(fin([[.15,.13,0],[-.25,.30,0],[-.53,.10,0]], material));
    fins.forEach(mesh => { mesh.castShadow = true; group.add(mesh); });
    const eyes = [], eyeGeometry = new THREE.SphereGeometry(.026, 12, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#101819', roughness: .18 });
    for (const sign of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(.55, .067, sign * .13); group.add(eye); eyes.push(eye);
    }
    group.scale.setScalar(.84 + .06 * Math.sin(id * 2.3));
    const position = new THREE.Vector3(), before = new THREE.Vector3(), after = new THREE.Vector3();
    const velocity = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    const matrix = new THREE.Matrix4(), roll = new THREE.Quaternion(), orientation = new THREE.Quaternion();
    let previousTime = null;
    const worldUp = new THREE.Vector3(0, 1, 0), localX = new THREE.Vector3(1, 0, 0);
    function update(t, bend, width, depth) {
        sampleSwimPath(id, t, width, depth, position);
        sampleSwimPath(id, t - .04, width, depth, before); sampleSwimPath(id, t + .04, width, depth, after);
        velocity.subVectors(after, before);
        const pace = velocity.length() / .08;
        velocity.normalize();
        right.crossVectors(velocity, worldUp).normalize(); up.crossVectors(right, velocity).normalize();
        matrix.makeBasis(velocity, up, right); orientation.setFromRotationMatrix(matrix);
        const acceleration = after.clone().add(before).addScaledVector(position, -2).multiplyScalar(1 / (.04 * .04));
        const curvature = THREE.MathUtils.clamp(acceleration.dot(right) / Math.max(pace * pace, .0025), -.8, .8);
        roll.setFromAxisAngle(localX, THREE.MathUtils.clamp(curvature * .25, -.24, .24)); orientation.multiply(roll);
        // At a slow change of course, turn the body gradually instead of snapping.
        if (previousTime === null || t < previousTime) group.quaternion.copy(orientation);
        else group.quaternion.rotateTowards(orientation, .75 * (t - previousTime));
        previousTime = t;
        group.position.copy(position);
        const phase = swimClock(t, id) * (5.7 + id * .19) + id * 1.8;
        const tailEffort = .16 + .09 * effort(t, id);
        const turning = .5 * curvature * group.scale.x;
        function offset(x) {
            const weight = THREE.MathUtils.clamp((.55 - x) / 1.85, 0, 1);
            return bend * tailEffort * weight * weight * Math.sin(phase + x * 4.5) + turning * Math.pow(Math.max(.4 - x, 0), 2);
        }
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = rest[i * 3]; positions.setXYZ(i, x, rest[i * 3 + 1], rest[i * 3 + 2] + offset(x));
        }
        positions.needsUpdate = true; geometry.computeVertexNormals();
        for (const mesh of fins) {
            const source = mesh.userData.rest, attr = mesh.geometry.attributes.position;
            for (let i = 0; i < attr.count; i++) {
                const x = source[i * 3], z = source[i * 3 + 2];
                const flutter = mesh === tail ? .045 * Math.sin(phase + x * 4.5) * Math.abs(z) : .04 * Math.sin(phase * .5 + id) * Math.abs(z);
                attr.setXYZ(i, x, source[i * 3 + 1] + flutter, z + offset(x));
            }
            attr.needsUpdate = true; mesh.geometry.computeVertexNormals();
        }
        eyes.forEach((eye, i) => { eye.position.z = (i ? 1 : -1) * .13 + offset(.55); });
    }
    return { group, update };
}
