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
function dartSegment(id, segment) {
    const offset = id === 1 ? -1 : 3;
    return (id === 1 || id === 4) && ((segment - offset) % 8 + 8) % 8 === 1;
}
export function dartStrength(time, id) {
    const clock = swimClock(time, id) / (5.8 + id * .23), segment = Math.floor(clock);
    return dartSegment(id, segment) ? Math.pow(Math.sin(Math.PI * (clock - segment)), 2) : 0;
}
export function createSwimmer(id) {
    const position = new THREE.Vector3(), velocity = new THREE.Vector3(), acceleration = new THREE.Vector3();
    const direction = new THREE.Vector3(), wander = new THREE.Vector3(), desired = new THREE.Vector3(), previousVelocity = new THREE.Vector3();
    const turn = new THREE.Quaternion(), partialTurn = new THREE.Quaternion();
    const result = { position: new THREE.Vector3(), velocity, acceleration, dart: 0, curvature: 0 };
    let tick = 0, lastTime = -1, nextChange = 0, choice = 0, speed = .35, oldWidth = 0, oldDepth = 0;
    function reset(width, depth) {
        // Start spread out; their subsequent headings and turns stay independent.
        const placement = id * 2.399963 + .55;
        position.set(Math.cos(placement) * width * .72, id === 0 ? .94 : -.3 + randomPoint(id, 0, 9) * 1.1, Math.sin(placement) * depth * .72);
        const angle = randomPoint(id, 0, 11) * TAU;
        direction.set(Math.cos(angle), .25 * (randomPoint(id, 0, 12) * 2 - 1), Math.sin(angle)).normalize();
        wander.copy(direction); velocity.copy(direction).multiplyScalar(.35); acceleration.set(0, 0, 0);
        tick = 0; nextChange = 2 + id * .7; choice = 0; speed = .35; result.dart = 0; result.curvature = 0; oldWidth = width; oldDepth = depth;
    }
    function update(time, width, depth) {
        if (lastTime < 0 || time < lastTime) reset(width, depth);
        if (width !== oldWidth || depth !== oldDepth) {
            position.x *= width / oldWidth; position.z *= depth / oldDepth;
            oldWidth = width; oldDepth = depth;
        }
        const dt = 1 / 60;
        while ((tick + 1) * dt <= time + 1e-9) {
            const t = ++tick * dt;
            if (t >= nextChange) {
                choice++;
                const yaw = (randomPoint(id, choice, 0) * 2 - 1) * 1.15;
                wander.copy(direction).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                wander.y = (randomPoint(id, choice, 1) * 2 - 1) * .55;
                wander.normalize(); nextChange = t + 3 + randomPoint(id, choice, 2) * 4;
            }
            const clearance = Math.min(width - Math.abs(position.x), depth - Math.abs(position.z));
            result.dart = dartStrength(t, id) * THREE.MathUtils.smoothstep(clearance, .65, 1.35);
            desired.copy(direction).lerp(wander, 1 - result.dart);
            // Only the nearby boundary steers inward; there is no centre target.
            for (const [axis, bound, margin] of [['x', width, 1.05], ['z', depth, 1.05]]) {
                const predicted = position[axis] + direction[axis] * .35;
                const influence = THREE.MathUtils.smoothstep(Math.abs(predicted), bound - margin, bound);
                desired[axis] -= Math.sign(predicted) * influence * 4;
            }
            const predictedY = position.y + direction.y * .7;
            desired.y += 4 * THREE.MathUtils.smoothstep(-predictedY, .05, .40);
            desired.y -= 4 * THREE.MathUtils.smoothstep(predictedY, .68, 1.0);
            desired.y = THREE.MathUtils.clamp(desired.y, -.8, .8); desired.normalize();
            turn.setFromUnitVectors(direction, desired);
            partialTurn.identity().rotateTowards(turn, .85 * dt);
            direction.applyQuaternion(partialTurn).normalize();
            // Ease vertical motion to zero before the surface/bottom, even when
            // a simultaneous side-wall turn occupies most of the steering.
            const maxUp = Math.max(0, (1.02 - position.y) * 1.2 / Math.max(speed, .1));
            const maxDown = Math.max(0, (position.y + .50) * 1.2 / Math.max(speed, .1));
            const vertical = THREE.MathUtils.clamp(direction.y, -maxDown, maxUp);
            const horizontalScale = Math.sqrt(Math.max(0, 1 - vertical * vertical)) / Math.max(Math.hypot(direction.x, direction.z), .0001);
            direction.x *= horizontalScale; direction.z *= horizontalScale; direction.y = vertical;
            const targetSpeed = ((.36 + .022 * id) * effort(t, id) + .65 * result.dart) * (.38 + .62 * THREE.MathUtils.smoothstep(clearance, .12, .85));
            speed = THREE.MathUtils.lerp(speed, targetSpeed, 1 - Math.exp(-2 * dt));
            previousVelocity.copy(velocity); velocity.copy(direction).multiplyScalar(speed);
            for (const [axis, bound] of [['x', width - .04], ['z', depth - .04]]) {
                velocity[axis] = THREE.MathUtils.clamp(velocity[axis], -Math.max(0, (position[axis] + bound) * 1.5), Math.max(0, (bound - position[axis]) * 1.5));
            }
            direction.copy(velocity).normalize();
            position.addScaledVector(velocity, dt);
            acceleration.copy(velocity).sub(previousVelocity).divideScalar(dt);
            // Boundary steering can reverse raw curvature in a single substep.
            // A damped, rate-limited bend keeps that reversal out of the tail.
            const horizontal = Math.max(Math.hypot(velocity.x, velocity.z), .001);
            const lateralAcceleration = (-velocity.z * acceleration.x + velocity.x * acceleration.z) / horizontal;
            const targetCurvature = THREE.MathUtils.clamp(lateralAcceleration / Math.max(velocity.lengthSq(), .0025), -.65, .65)
                * THREE.MathUtils.smoothstep(velocity.length(), .04, .20);
            const bendChange = (targetCurvature - result.curvature) * (1 - Math.exp(-dt / .45));
            result.curvature += THREE.MathUtils.clamp(bendChange, -.6 * dt, .6 * dt);
        }
        // Interpolate the substep remainder so rendering is independent of FPS.
        result.position.copy(position).addScaledVector(velocity, time - tick * dt);
        lastTime = time;
        return result;
    }
    return { update };
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
    const swimmer = createSwimmer(id);
    const velocity = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    const matrix = new THREE.Matrix4(), roll = new THREE.Quaternion(), orientation = new THREE.Quaternion();
    let previousTime = null;
    const worldUp = new THREE.Vector3(0, 1, 0), localX = new THREE.Vector3(1, 0, 0);
    function update(t, bend, width, depth) {
        const motion = swimmer.update(t, width, depth);
        velocity.copy(motion.velocity);
        const pace = velocity.length();
        velocity.normalize();
        right.crossVectors(velocity, worldUp).normalize(); up.crossVectors(right, velocity).normalize();
        matrix.makeBasis(velocity, up, right); orientation.setFromRotationMatrix(matrix);
        const curvature = motion.curvature;
        roll.setFromAxisAngle(localX, THREE.MathUtils.clamp(curvature * .25, -.24, .24)); orientation.multiply(roll);
        // At a slow change of course, turn the body gradually instead of snapping.
        if (previousTime === null || t < previousTime) group.quaternion.copy(orientation);
        else group.quaternion.rotateTowards(orientation, .75 * (t - previousTime));
        previousTime = t;
        group.position.copy(motion.position);
        const phase = swimClock(t, id) * (5.7 + id * .19) + id * 1.8;
        const tailEffort = (.16 + .09 * effort(t, id)) * (1 - .40 * motion.dart);
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
