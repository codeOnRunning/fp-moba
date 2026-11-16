import fs from 'node:fs';
const text=fs.readFileSync('src/game/Game.ts','utf8');
text.split(/\r?\n/).forEach((line,i)=>{ if(/[^\x00-\x7F]/.test(line)) console.log(String(i+1).padStart(4), line); });
