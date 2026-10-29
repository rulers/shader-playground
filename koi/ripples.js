import * as THREE from '../third_party/three/three.module.js';

export const WATER_LEVEL = 1.24;
export function createRipples(scene) {
    const geometry = new THREE.RingGeometry(.98, 1, 80);
    const pool = Array.from({ length: 32 }, () => {
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#638f89', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 2;
        scene.add(mesh);
        return { mesh, born: -Infinity };
    });
    let cursor = 0;
    const lastEmission = Array(7).fill(-Infinity);
    function clear() {
        pool.forEach(ripple => { ripple.born = -Infinity; ripple.mesh.visible = false; });
        lastEmission.fill(-Infinity); cursor = 0;
    }
    function update(time, fishes) {
        fishes.forEach((fish, id) => {
            if (!fish.group.visible || fish.group.position.y < .88 || time - lastEmission[id] < 1.4) return;
            lastEmission[id] = time;
            for (const delay of [0, .38]) {
                const ripple = pool[cursor++ % pool.length];
                ripple.born = time + delay;
                ripple.mesh.position.set(fish.group.position.x, WATER_LEVEL, fish.group.position.z);
            }
        });
        pool.forEach(ripple => {
            const age = time - ripple.born, life = age / 3.6;
            ripple.mesh.visible = age >= 0 && life < 1;
            if (!ripple.mesh.visible) return;
            ripple.mesh.scale.setScalar(.16 + age * .42);
            ripple.mesh.material.opacity = .28 * Math.sin(Math.PI * Math.min(life * 3, 1) / 2) * Math.pow(1 - life, 1.5);
        });
    }
    return { update, clear };
}
