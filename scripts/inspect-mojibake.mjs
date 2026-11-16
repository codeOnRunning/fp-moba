import fs from 'node:fs';
const text=fs.readFileSync('src/game/Game.ts','utf8');
for (const needle of ['无武器晃','满蓄','冷却','无敌','引导','伤害/攻','已击','下一']) {
  const i=text.indexOf(needle); if(i>=0) console.log(needle, JSON.stringify(text.slice(i-8,i+24)));
}
