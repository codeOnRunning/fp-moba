import fs from 'node:fs';
const f='public/assets/kaykit/characters/Skeleton_Warrior.glb';
const b=fs.readFileSync(f); const chunkLen=b.readUInt32LE(12); const json=JSON.parse(b.toString('utf8',20,20+chunkLen).replace(/\0+$/,''));
console.log({meshes:json.meshes?.length,materials:json.materials?.length,animations:json.animations?.map(a=>a.name)});
const pos=(json.meshes||[]).flatMap(m=>m.primitives.map(p=>json.accessors[p.attributes.POSITION])).filter(Boolean); const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity]; for(const a of pos){if(a.min&&a.max){for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],a.min[i]);maxs[i]=Math.max(maxs[i],a.max[i]);}}} console.log({mins,maxs});
