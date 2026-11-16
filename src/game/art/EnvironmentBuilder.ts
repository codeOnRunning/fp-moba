import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ArtAssets, LoadedModel } from './AssetLibrary';
import { firstMesh } from './AssetLibrary';
import type { MapSpawns } from '../map';

interface TransformSpec {
  x: number;
  y: number;
  z: number;
  rotY?: number;
  scale?: number;
}

function materialFrom(model: LoadedModel, tint?: number): THREE.Material | THREE.Material[] {
  const base = firstMesh(model);
  const cloneMaterial = (material: THREE.Material): THREE.Material => {
    const copy = material.clone();
    if (tint && copy instanceof THREE.MeshStandardMaterial) {
      copy.color.multiply(new THREE.Color(tint));
    }
    return copy;
  };

  return Array.isArray(base.material)
    ? base.material.map(cloneMaterial)
    : cloneMaterial(base.material);
}

function instanced(
  model: LoadedModel,
  transforms: TransformSpec[],
  options: { tint?: number; castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.InstancedMesh {
  const base = firstMesh(model);
  const mesh = new THREE.InstancedMesh(
    base.geometry,
    materialFrom(model, options.tint),
    transforms.length,
  );
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  transforms.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z);
    dummy.rotation.set(0, spec.rotY ?? 0, 0);
    dummy.scale.setScalar(spec.scale ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function addArenaBoundary(
  scene: THREE.Scene,
  world: RAPIER.World,
  x: number,
  color: number,
): void {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 4), material);
  wall.rotation.y = Math.PI * 0.5;
  wall.position.set(x, 2, 0);
  wall.renderOrder = 7;
  scene.add(wall);

  const frameMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const z of [-10, 10]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 4, 8),
      frameMaterial,
    );
    post.position.set(x, 2, z);
    scene.add(post);
  }

  addStaticBox(world, x, 2, 0, 0.16, 2, 10);
}

function cloneDecor(
  model: LoadedModel,
  x: number,
  y: number,
  z: number,
  rotY: number,
  scale: number,
  tint?: number,
): THREE.Group {
  const group = model.scene.clone(true);
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  group.scale.setScalar(scale);
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (tint) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const cloned = materials.map((material) => {
        const copy = material.clone();
        if (copy instanceof THREE.MeshStandardMaterial) {
          copy.color.multiply(new THREE.Color(tint));
        }
        return copy;
      });
      object.material = Array.isArray(object.material) ? cloned : cloned[0];
    }
  });
  return group;
}

function addStaticBox(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number,
  hx: number,
  hy: number,
  hz: number,
): void {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
}

function addStaticCylinder(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number,
  halfHeight: number,
  radius: number,
): void {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z),
  );
  world.createCollider(RAPIER.ColliderDesc.cylinder(halfHeight, radius), body);
}

function addSky(scene: THREE.Scene): void {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x070b17) },
      horizonColor: { value: new THREE.Color(0x26344d) },
      bottomColor: { value: new THREE.Color(0x111827) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color = h > 0.0
          ? mix(horizonColor, topColor, smoothstep(0.0, 0.75, h))
          : mix(horizonColor, bottomColor, smoothstep(0.0, -0.4, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), skyMaterial));

  const stars = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85);
    const radius = 130 + Math.random() * 30;
    stars[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    stars[i * 3 + 1] = 8 + Math.cos(phi) * radius;
    stars[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(
    new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xbfe6ff,
        size: 0.4,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    ),
  );

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(22, 0.35, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0xe8c77a,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.position.set(58, 22, -16);
  ring.rotation.y = Math.PI * 0.5;
  ring.rotation.x = 0.18;
  scene.add(ring);

  const ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(18.5, 0.12, 6, 96),
    new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ringInner.position.copy(ring.position);
  ringInner.rotation.copy(ring.rotation);
  scene.add(ringInner);
}

function addMountains(scene: THREE.Scene): void {
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x121a2b,
    roughness: 1,
    metalness: 0,
  });

  const positions = [
    [-74, 0, -16],
    [-68, 0, 18],
    [72, 0, -20],
    [78, 0, 16],
    [-20, 0, -42],
    [28, 0, -46],
  ];

  for (let i = 0; i < positions.length; i += 1) {
    const [x, y, z] = positions[i];
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(18 + (i % 3) * 5, 26 + (i % 2) * 8, 5),
      mountainMaterial,
    );
    mountain.position.set(x, y, z);
    mountain.rotation.y = i * 0.8;
    scene.add(mountain);
  }
}

function addStarGate(scene: THREE.Scene, world: RAPIER.World): void {
  const gold = new THREE.MeshStandardMaterial({
    color: 0xb58a45,
    roughness: 0.34,
    metalness: 0.72,
    emissive: 0x4a2d0f,
    emissiveIntensity: 0.45,
  });
  const cyan = new THREE.MeshBasicMaterial({
    color: 0x57e0f0,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const z of [-5.8, 5.8]) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.52, 6.8, 8),
      gold,
    );
    pillar.position.set(0, 3.4, z);
    pillar.castShadow = true;
    scene.add(pillar);
    addStaticCylinder(world, 0, 3.4, z, 3.4, 0.52);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      cyan,
    );
    crystal.position.set(0, 7.1, z);
    scene.add(crystal);
  }

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 6.7, -5.8),
    new THREE.Vector3(0, 8.8, -3.0),
    new THREE.Vector3(0, 9.6, 0),
    new THREE.Vector3(0, 8.8, 3.0),
    new THREE.Vector3(0, 6.7, 5.8),
  ]);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.15, 6, false), gold);
  arch.castShadow = true;
  scene.add(arch);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.07, 8, 40),
    cyan,
  );
  halo.position.set(0, 9.6, 0);
  halo.rotation.x = Math.PI * 0.5;
  scene.add(halo);
}

export function createArtMap(
  scene: THREE.Scene,
  world: RAPIER.World,
  assets: ArtAssets,
): MapSpawns {
  scene.background = new THREE.Color(0x0a1120);
  scene.fog = new THREE.Fog(0x0a1222, 42, 132);
  addSky(scene);
  addMountains(scene);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(170, 60),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.96,
      metalness: 0.02,
    }),
  );
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  scene.add(ground);
  addStaticBox(world, 0, -0.3, 0, 85, 0.3, 25);

  const floorTransforms: TransformSpec[] = [];
  for (let x = -60; x <= 60; x += 4) {
    for (let z = -8; z <= 8; z += 4) {
      floorTransforms.push({ x, y: 0.02, z });
    }
  }
  const floor = instanced(assets.dungeon.floor_tile_large, floorTransforms, {
    tint: 0x67799a,
    castShadow: false,
    receiveShadow: true,
  });
  scene.add(floor);

  const brokenFloorTransforms: TransformSpec[] = [
    { x: -36, y: 0.025, z: -4, rotY: 0.2 },
    { x: -28, y: 0.025, z: 4, rotY: -0.4 },
    { x: -4, y: 0.025, z: -8, rotY: 0.8 },
    { x: 8, y: 0.025, z: 4, rotY: 0.3 },
    { x: 32, y: 0.025, z: -4, rotY: -0.6 },
    { x: 44, y: 0.025, z: 8, rotY: 0.5 },
    { x: 52, y: 0.025, z: 0, rotY: -0.3 },
  ];
  scene.add(
    instanced(assets.dungeon.floor_tile_small_broken_A, brokenFloorTransforms, {
      tint: 0x5a6b88,
      castShadow: false,
      receiveShadow: true,
    }),
  );

  const wallTransforms: TransformSpec[] = [];
  const brokenWallTransforms: TransformSpec[] = [];
  const archTransforms: TransformSpec[] = [];

  for (let x = -60; x <= 60; x += 4) {
    for (const z of [-14, 14]) {
      if ([-40, -20, 0, 20, 40].includes(x)) {
        archTransforms.push({ x, y: 0, z, rotY: z > 0 ? Math.PI : 0 });
      } else if (x % 12 === 0) {
        brokenWallTransforms.push({ x, y: 0, z, rotY: z > 0 ? Math.PI : 0 });
      } else {
        wallTransforms.push({ x, y: 0, z, rotY: z > 0 ? Math.PI : 0 });
      }
    }
  }

  scene.add(instanced(assets.dungeon.wall, wallTransforms, { tint: 0x60708c }));
  scene.add(
    instanced(assets.dungeon.wall_broken, brokenWallTransforms, {
      tint: 0x596984,
    }),
  );
  scene.add(
    instanced(assets.dungeon.wall_arched, archTransforms, {
      tint: 0x6d7890,
    }),
  );

  for (let x = -60; x <= 60; x += 4) {
    for (const z of [-14, 14]) {
      addStaticBox(world, x, 2, z, 2.05, 2, 0.48);
    }
  }

  const endWallTransforms: TransformSpec[] = [];
  for (let z = -12; z <= 12; z += 4) {
    endWallTransforms.push({ x: -64.5, y: 0, z, rotY: Math.PI * 0.5 });
    endWallTransforms.push({ x: 64.5, y: 0, z, rotY: -Math.PI * 0.5 });
  }
  scene.add(instanced(assets.dungeon.wall, endWallTransforms, { tint: 0x4d5d78 }));
  addStaticBox(world, -64.5, 2, 0, 0.5, 2, 15);
  addStaticBox(world, 64.5, 2, 0, 0.5, 2, 15);

  const pillarTransforms: TransformSpec[] = [];
  for (const x of [-50, -30, -10, 10, 30, 50]) {
    for (const z of [-12.1, 12.1]) {
      pillarTransforms.push({ x, y: 0, z, scale: 1.12 });
      addStaticCylinder(world, x, 2.2, z, 2.2, 0.85);
    }
  }
  scene.add(
    instanced(assets.dungeon.pillar_decorated, pillarTransforms, {
      tint: 0x6b7891,
    }),
  );

  const torchPositions = [-48, -36, -24, -12, 0, 12, 24, 36, 48];
  let torchIndex = 0;
  for (const x of torchPositions) {
    for (const z of [-12.8, 12.8]) {
      const torch = cloneDecor(
        assets.dungeon.torch_lit,
        x,
        2.3,
        z,
        z > 0 ? Math.PI : 0,
        1.55,
      );
      scene.add(torch);

      if (torchIndex % 2 === 0) {
        const light = new THREE.PointLight(0xff9a5c, 10, 11, 2);
        light.position.set(x, 3.6, z);
        scene.add(light);
      }
      torchIndex += 1;
    }
  }

  for (const x of [-44, -32, -20]) {
    for (const z of [-13.45, 13.45]) {
      scene.add(
        cloneDecor(
          assets.dungeon.banner_blue,
          x,
          2.7,
          z,
          z > 0 ? Math.PI : 0,
          1.3,
        ),
      );
    }
  }
  for (const x of [20, 32, 44]) {
    for (const z of [-13.45, 13.45]) {
      scene.add(
        cloneDecor(
          assets.dungeon.banner_red,
          x,
          2.7,
          z,
          z > 0 ? Math.PI : 0,
          1.3,
        ),
      );
    }
  }

  for (let i = 0; i < 24; i += 1) {
    const x = -58 + ((i * 37) % 116);
    const z = (i % 2 === 0 ? -1 : 1) * (10.8 + (i % 3) * 0.7);
    scene.add(
      cloneDecor(
        assets.dungeon.rubble_large,
        x,
        0,
        z,
        i * 0.7,
        0.7 + (i % 4) * 0.12,
        0x6b7891,
      ),
    );
  }

  addStarGate(scene, world);

  scene.add(new THREE.AmbientLight(0x607aa5, 0.7));
  scene.add(new THREE.HemisphereLight(0x9cc4ff, 0x111827, 2.1));

  const key = new THREE.DirectionalLight(0xffe2b0, 2.65);
  key.position.set(-30, 38, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -74;
  key.shadow.camera.right = 74;
  key.shadow.camera.top = 40;
  key.shadow.camera.bottom = -40;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 130;
  key.shadow.bias = -0.0003;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5f7fff, 1.5);
  rim.position.set(35, 22, -30);
  scene.add(rim);

  const gateLight = new THREE.PointLight(0x57e0f0, 22, 18, 2);
  gateLight.position.set(0, 6, 0);
  scene.add(gateLight);

  // Boss arena: the player cannot kite the boss down the whole lane.
  addArenaBoundary(scene, world, -27, 0x57e0f0);
  addArenaBoundary(scene, world, 18, 0xe8c77a);

  return {
    playerSpawn: new THREE.Vector3(-20, 0.85, 0),
    dummySpawn: new THREE.Vector3(10, 0.95, 0),
  };
}
