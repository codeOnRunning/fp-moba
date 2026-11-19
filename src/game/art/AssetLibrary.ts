import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ArtAssets {
  mage: LoadedModel;
  skeleton: LoadedModel;
  dungeon: Record<string, LoadedModel>;
}

const DUNGEON_FILES = [
  'floor_tile_large',
  'floor_tile_small_broken_A',
  'floor_tile_small_decorated',
  'wall',
  'wall_broken',
  'wall_arched',
  'wall_pillar',
  'wall_half',
  'pillar',
  'pillar_decorated',
  'torch_lit',
  'banner_blue',
  'banner_red',
  'rubble_large',
  'barrier_column',
] as const;

const loader = new GLTFLoader();

function loadModel(url: string): Promise<LoadedModel> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        resolve({ scene: gltf.scene, animations: gltf.animations });
      },
      undefined,
      (error) => reject(error),
    );
  });
}

export async function loadArtAssets(): Promise<ArtAssets> {
  const [mage, skeleton, ...dungeonModels] = await Promise.all([
    loadModel(`${import.meta.env.BASE_URL}assets/kaykit/characters/Mage.glb`),
    loadModel(
      `${import.meta.env.BASE_URL}assets/kaykit/characters/Skeleton_Warrior.glb`,
    ),
    ...DUNGEON_FILES.map((name) =>
      loadModel(
        `${import.meta.env.BASE_URL}assets/kaykit/dungeon/${name}.gltf.glb`,
      ),
    ),
  ]);

  const dungeon: Record<string, LoadedModel> = {};
  DUNGEON_FILES.forEach((name, index) => {
    dungeon[name] = dungeonModels[index];
  });

  return { mage, skeleton, dungeon };
}

export function firstMesh(model: LoadedModel): THREE.Mesh {
  let result: THREE.Mesh | null = null;
  model.scene.traverse((object) => {
    if (!result && object instanceof THREE.Mesh) {
      result = object;
    }
  });
  if (!result) {
    throw new Error('Asset has no mesh.');
  }
  return result;
}

export function cloneModel(model: LoadedModel): THREE.Group {
  return model.scene.clone(true);
}
