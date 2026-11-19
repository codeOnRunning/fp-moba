import * as THREE from 'three';
import type { BossVariant } from '../boss/Boss';

function shadow(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addAura(
  root: THREE.Group,
  color: number,
  radius: number,
  y: number,
): void {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.025, 6, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = y;
  root.add(ring);
}

export function addMageCosmetics(root: THREE.Group): void {
  const robe = new THREE.MeshStandardMaterial({
    color: 0x13265c,
    roughness: 0.72,
    metalness: 0.08,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd8b66d,
    roughness: 0.35,
    metalness: 0.55,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x93f0ff,
    emissive: 0x39aacc,
    emissiveIntensity: 2.1,
    roughness: 0.2,
    metalness: 0.2,
  });

  // A short shoulder mantle breaks up the silhouette of the stock model.
  const mantle = shadow(
    new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.42, 8, 1, true), robe),
  );
  mantle.position.y = 1.18;
  mantle.rotation.y = Math.PI / 8;
  root.add(mantle);

  const leftPauldron = shadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), gold),
  );
  leftPauldron.position.set(-0.42, 1.17, 0);
  root.add(leftPauldron);
  const rightPauldron = leftPauldron.clone();
  rightPauldron.position.x = 0.42;
  root.add(rightPauldron);

  // Staff with a bright arcane focus, held at the mage's right side.
  const staff = new THREE.Group();
  staff.position.set(0.86, 0.02, 0.02);
  staff.rotation.z = -0.16;
  const shaft = shadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.55, 6), gold),
  );
  shaft.position.y = 0.78;
  staff.add(shaft);
  const focus = shadow(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), cyan),
  );
  focus.position.y = 1.7;
  staff.add(focus);
  const focusRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.026, 6, 20),
    new THREE.MeshBasicMaterial({
      color: 0x8beeff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  focusRing.position.y = 1.7;
  focusRing.rotation.x = Math.PI * 0.5;
  staff.add(focusRing);
  root.add(staff);

  addAura(root, 0x57e0f0, 0.52, 0.06);
}

export function addEnemyCosmetics(
  root: THREE.Group,
  variant: BossVariant,
): void {
  const color =
    variant === 'void' ? 0xb07cff : variant === 'colossus' ? 0xffc36b : 0xff5c7a;
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1b1624,
    roughness: 0.65,
    metalness: 0.35,
  });
  const metal = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.28,
    metalness: 0.55,
  });

  // Crown of spikes: readable at boss distance and distinct per variant.
  const crown = new THREE.Group();
  crown.position.y = 1.72;
  for (let i = 0; i < 5; i += 1) {
    const spike = shadow(
      new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 5), metal),
    );
    const angle = (i / 5) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.38, 0.18, Math.sin(angle) * 0.38);
    spike.rotation.z = Math.cos(angle) * 0.25;
    spike.rotation.x = Math.sin(angle) * 0.25;
    crown.add(spike);
  }
  root.add(crown);

  const chest = shadow(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), metal),
  );
  chest.position.set(0, 1.08, -0.34);
  root.add(chest);

  const shoulder = shadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), dark),
  );
  shoulder.position.set(-0.48, 1.28, 0);
  root.add(shoulder);
  const other = shoulder.clone();
  other.position.x = 0.48;
  root.add(other);

  // A broken greatsword silhouette makes the enemy hero read as a threat.
  const sword = new THREE.Group();
  sword.position.set(-0.64, 0.08, 0.02);
  sword.rotation.z = 0.12;
  const blade = shadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.4, 0.05), metal),
  );
  blade.position.y = 1.05;
  sword.add(blade);
  const guard = shadow(
    new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.08), dark),
  );
  guard.position.y = 0.4;
  sword.add(guard);
  root.add(sword);

  addAura(root, color, 0.78, 0.06);
}
