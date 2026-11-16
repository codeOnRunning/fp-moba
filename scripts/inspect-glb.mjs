import fs from 'node:fs';
const files = ['public/assets/kaykit/characters/Mage.glb','public/assets/kaykit/dungeon/floor_tile_large.gltf.glb','public/assets/kaykit/dungeon/wall_arched.gltf.glb'];
for (const f of files) {
  const b = fs.readFileSync(f);
  const magic = b.toString('ascii',0,4);
  const version = b.readUInt32LE(4);
  const length = b.readUInt32LE(8);
  const chunkLen = b.readUInt32LE(12);
  const chunkType = b.toString('ascii',16,20);
  const json = JSON.parse(b.toString('utf8',20,20+chunkLen).replace(/\0+$/,''));
  console.log('\n===',f,'===');
  console.log({magic,version,length,chunkType,scenes:json.scenes?.length,nodes:json.nodes?.length,meshes:json.meshes?.length,materials:json.materials?.length,textures:json.textures?.length,animations:json.animations?.map(a=>a.name),images:json.images?.map(i=>i.uri||i.mimeType)});
  if(json.animations?.length) console.log('animation channels', json.animations.map(a=>a.channels.length));
  const posAccessors = (json.meshes||[]).flatMap(m=>m.primitives.map(p=>json.accessors[p.attributes.POSITION])).filter(Boolean);
  const mins=[Infinity,Infinity,Infinity], maxs=[-Infinity,-Infinity,-Infinity];
  for(const a of posAccessors){ if(a.min&&a.max){ for(let i=0;i<3;i++){ mins[i]=Math.min(mins[i],a.min[i]); maxs[i]=Math.max(maxs[i],a.max[i]); } } }
  console.log('raw position bounds', {mins,maxs});
}
