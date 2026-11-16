import fs from 'node:fs';
const b=fs.readFileSync('src/game/Game.ts');
console.log('bytes',b.length);
for(let i=0;i<b.length;i++){
  const c=b[i];
  if(c<0x80) continue;
  let n=0;
  if((c&0xE0)===0xC0)n=1; else if((c&0xF0)===0xE0)n=2; else if((c&0xF8)===0xF0)n=3; else {console.log('bad lead at',i,c.toString(16));break;}
  let ok=true; for(let j=1;j<=n;j++){if((b[i+j]&0xC0)!==0x80){ok=false;break;}}
  if(!ok){console.log('bad seq at',i,b.slice(i,i+6).toString('hex'));break;}
  i+=n;
}
console.log('sample',b.slice(12000,12100).toString('utf8'));
