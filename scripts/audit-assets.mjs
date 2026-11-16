import fs from 'node:fs';
import path from 'node:path';
const files = [
  'public/assets/kaykit/characters/Mage.glb',
  'public/assets/kaykit/characters/Skeleton_Warrior.glb',
  ...fs.readdirSync('public/assets/kaykit/dungeon').map(f => path.join('public/assets/kaykit/dungeon', f)),
];
const rows = [];
for (const f of files) {
  const b = fs.readFileSync(f);
  const chunkLen = b.readUInt32LE(12);
  const json = JSON.parse(b.toString('utf8',20,20+chunkLen).replace(/\0+$/,''));
  let tris = 0;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      if (prim.indices !== undefined) tris += Math.floor((json.accessors[prim.indices]?.count ?? 0) / 3);
      else tris += Math.floor((json.accessors[prim.attributes?.POSITION]?.count ?? 0) / 3);
    }
  }
  const pos = (json.meshes ?? []).flatMap(m => (m.primitives ?? []).map(p => json.accessors[p.attributes?.POSITION])).filter(Boolean);
  const mins=[Infinity,Infinity,Infinity], maxs=[-Infinity,-Infinity,-Infinity];
  for (const a of pos) if (a.min && a.max) for (let i=0;i<3;i++){ mins[i]=Math.min(mins[i],a.min[i]); maxs[i]=Math.max(maxs[i],a.max[i]); }
  rows.push({file:path.basename(f), tris, nodes:json.nodes?.length ?? 0, meshes:json.meshes?.length ?? 0, materials:json.materials?.length ?? 0, animations:json.animations?.length ?? 0, height:Number((maxs[1]-mins[1]).toFixed(2)), width:Number((maxs[0]-mins[0]).toFixed(2)), depth:Number((maxs[2]-mins[2]).toFixed(2))});
}
console.log(JSON.stringify(rows,null,2));
