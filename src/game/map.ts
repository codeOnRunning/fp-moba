import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface MapSpawns {
  playerSpawn: THREE.Vector3;
  dummySpawn: THREE.Vector3;
}

interface StaticBoxOptions {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  rotationY?: number;
}

function addStaticBox(world: RAPIER.World, options: StaticBoxOptions): void {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(options.x, options.y, options.z),
  );
  const collider = RAPIER.ColliderDesc.cuboid(options.hx, options.hy, options.hz);

  if (options.rotationY) {
    const half = options.rotationY * 0.5;
    body.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);
  }

  world.createCollider(collider, body);
}

function addStaticCylinder(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number,
  halfHeight: number,
  radius: number,
): void {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  world.createCollider(RAPIER.ColliderDesc.cylinder(halfHeight, radius), body);
}

function makeGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is not available.');
  }

  context.fillStyle = '#2a3548';
  context.fillRect(0, 0, 512, 512);

  context.strokeStyle = 'rgba(150, 190, 240, 0.28)';
  context.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 512);
    context.stroke();

    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(512, i);
    context.stroke();
  }

  context.strokeStyle = 'rgba(207, 232, 255, 0.035)';
  context.lineWidth = 2;
  for (let i = 32; i < 512; i += 128) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 512);
    context.stroke();
  }

  const random = (seed: number): number => {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 900; i += 1) {
    const x = random(i + 1) * 512;
    const y = random(i + 1001) * 512;
    const alpha = 0.025 + random(i + 2001) * 0.055;
    context.fillStyle = `rgba(180, 214, 255, ${alpha})`;
    context.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createColumn(
  scene: THREE.Scene,
  world: RAPIER.World,
  x: number,
  z: number,
  height: number,
  radius: number,
): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.35, radius * 1.55, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: 0x252d3d, roughness: 0.86, metalness: 0.24 }),
  );
  base.position.y = 0.18;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.74, radius, height, 8),
    new THREE.MeshStandardMaterial({ color: 0x323b4e, roughness: 0.76, metalness: 0.3 }),
  );
  shaft.position.y = height * 0.5 + 0.3;
  shaft.castShadow = true;
  group.add(shaft);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.1, radius * 0.82, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0x1f2838, roughness: 0.75, metalness: 0.35 }),
  );
  cap.position.y = height + 0.4;
  cap.castShadow = true;
  group.add(cap);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(radius * 0.32, 0),
    new THREE.MeshStandardMaterial({
      color: 0x9bd9ff,
      emissive: 0x3c8dff,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.1,
    }),
  );
  crystal.position.y = height + 1.0;
  crystal.rotation.set(0.2, 0.5, 0);
  group.add(crystal);

  scene.add(group);
  addStaticCylinder(world, x, height * 0.5 + 0.3, z, height * 0.5 + 0.3, radius);
}

function createObelisk(
  scene: THREE.Scene,
  world: RAPIER.World,
  x: number,
  z: number,
  color: number,
): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.55, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x202a3b, roughness: 0.75, metalness: 0.42 }),
  );
  base.position.y = 0.3;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.9, 5.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x2b3547, roughness: 0.55, metalness: 0.55 }),
  );
  pillar.position.y = 3.0;
  pillar.castShadow = true;
  group.add(pillar);

  const crown = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.82, 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.45,
      roughness: 0.2,
      metalness: 0.05,
    }),
  );
  crown.position.y = 6.1;
  crown.rotation.set(0.25, 0.4, 0.1);
  group.add(crown);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.position.y = 6.1;
  ring.rotation.x = Math.PI * 0.5;
  group.add(ring);

  scene.add(group);
  addStaticCylinder(world, x, 2.8, z, 2.8, 1.0);
}

function addDust(scene: THREE.Scene): void {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const seed = (index: number): number => {
    const value = Math.sin(index * 91.73) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (seed(i + 1) - 0.5) * 130;
    positions[i * 3 + 1] = 0.6 + seed(i + 501) * 6.5;
    positions[i * 3 + 2] = (seed(i + 1001) - 0.5) * 27;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x86b7ff,
    size: 0.035,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  scene.add(new THREE.Points(geometry, material));
}

export function createMap(scene: THREE.Scene, world: RAPIER.World): MapSpawns {
  scene.background = new THREE.Color(0x0a1120);
  scene.fog = new THREE.Fog(0x0a1222, 42, 138);

  const groundTexture = makeGroundTexture();
  groundTexture.repeat.set(18, 4);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 30),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.04,
    }),
  );
  ground.rotation.x = -Math.PI * 0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // The lane reads a little lighter than the side strips.
  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 19.5),
    new THREE.MeshStandardMaterial({
      color: 0x273245,
      roughness: 0.9,
      metalness: 0.06,
      transparent: true,
      opacity: 0.75,
    }),
  );
  lane.rotation.x = -Math.PI * 0.5;
  lane.position.y = 0.012;
  lane.receiveShadow = true;
  scene.add(lane);

  addStaticBox(world, { x: 0, y: -0.3, z: 0, hx: 75, hy: 0.3, hz: 18 });

  // Lane edge lines.
  for (const z of [-10.1, 10.1]) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(138, 0.025, 0.08),
      new THREE.MeshBasicMaterial({
        color: z > 0 ? 0x3d8dff : 0x8f5bff,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    line.position.set(0, 0.03, z);
    scene.add(line);
  }

  // Dashed center markers give the eye a speed and distance reference.
  for (let x = -62; x <= 62; x += 9) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.022, 0.07),
      new THREE.MeshBasicMaterial({
        color: x % 18 === 0 ? 0xe8c77a : 0x5fcfff,
        transparent: true,
        opacity: x % 18 === 0 ? 0.35 : 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    dash.position.set(x, 0.035, 0);
    scene.add(dash);
  }

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x263146,
    roughness: 0.78,
    metalness: 0.32,
  });

  for (const z of [-16.2, 16.2]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(152, 4.2, 1.6), wallMaterial);
    wall.position.set(0, 2.1, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    addStaticBox(world, { x: 0, y: 2.1, z, hx: 76, hy: 2.1, hz: 0.8 });
  }

  for (const x of [-76, 76]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 34), wallMaterial);
    wall.position.set(x, 2.1, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    addStaticBox(world, { x, y: 2.1, z: 0, hx: 0.8, hy: 2.1, hz: 17 });
  }

  for (const z of [-15.35, 15.35]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(146, 0.035, 0.06),
      new THREE.MeshBasicMaterial({
        color: z > 0 ? 0x5b8dff : 0xbb6bff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    strip.position.set(0, 0.42, z);
    scene.add(strip);
  }

  for (const x of [-50, -20, 10, 40]) {
    for (const z of [-14.1, 14.1]) {
      createColumn(scene, world, x, z, 3.6 + ((x + 50) % 3) * 0.5, 0.9);
    }
  }

  createObelisk(scene, world, -45, -7.2, 0x6ce8ff);
  createObelisk(scene, world, 45, 7.2, 0xff6b86);

  // A training circle marks the dummy's home ground.
  const trainingRing = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 2.72, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff637e,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  trainingRing.rotation.x = -Math.PI * 0.5;
  trainingRing.position.set(10, 0.035, 0);
  scene.add(trainingRing);

  const ringInner = new THREE.Mesh(
    new THREE.RingGeometry(1.08, 1.13, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff95ab,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ringInner.rotation.x = -Math.PI * 0.5;
  ringInner.position.set(10, 0.04, 0);
  scene.add(ringInner);

  scene.add(new THREE.AmbientLight(0x5d7fae, 0.7));

  const hemi = new THREE.HemisphereLight(0x9cc4ff, 0x111827, 2.1);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe6c2, 2.8);
  key.position.set(-28, 36, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -72;
  key.shadow.camera.right = 72;
  key.shadow.camera.top = 38;
  key.shadow.camera.bottom = -38;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 120;
  key.shadow.bias = -0.0003;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5f7fff, 1.55);
  rim.position.set(30, 20, -24);
  scene.add(rim);

  const dummyLight = new THREE.PointLight(0xff5c7a, 22, 15, 2);
  dummyLight.position.set(10, 3.2, 1.5);
  scene.add(dummyLight);

  const spawnLight = new THREE.PointLight(0x4f8cff, 16, 14, 2);
  spawnLight.position.set(-20, 3.2, 2.0);
  scene.add(spawnLight);

  addDust(scene);

  return {
    playerSpawn: new THREE.Vector3(-20, 0.85, 0),
    dummySpawn: new THREE.Vector3(10, 0.95, 0),
  };
}
