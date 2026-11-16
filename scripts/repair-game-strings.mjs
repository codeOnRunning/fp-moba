import fs from 'node:fs';
const path='src/game/Game.ts';
let text=fs.readFileSync(path,'utf8');
const reps = [
  ['无武器晃�?· V 切换第一人称', '无武器晃动 · V 切换第一人称'],
  ['星弧飞弹冷却�?${this.qCooldown.toFixed(1)}s', '星弧飞弹冷却中 ${this.qCooldown.toFixed(1)}s'],
  ["'星弧飞弹 · 满蓄�?, 550);", "'星弧飞弹 · 满蓄力', 550);"],
  ['引力法阵冷却�?${this.wCooldown.toFixed(1)}s', '引力法阵冷却中 ${this.wCooldown.toFixed(1)}s'],
  ['折跃冷却�?${this.eCooldown.toFixed(1)}s', '折跃冷却中 ${this.eCooldown.toFixed(1)}s'],
  ["'折跃 · 0.24s 无敌�?, 650);", "'折跃 · 0.24s 无敌帧', 650);"],
  ['天穹裂隙冷却�?${this.rCooldown.toFixed(1)}s', '天穹裂隙冷却中 ${this.rCooldown.toFixed(1)}s'],
  ["'天穹裂隙 · 引导�?, 900);", "'天穹裂隙 · 引导中', 900);"],
  ['伤害/攻�?冷却提升', '伤害/攻速/冷却提升'],
  ['星蚀守卫已击�?', '星蚀守卫已击败'],
  ['下一�?${nextMaxHealth}', '下一世 ${nextMaxHealth}'],
];
for (const [a,b] of reps) text=text.split(a).join(b);
fs.writeFileSync(path,text,'utf8');
console.log('written',text.length,'replacement marks', (text.match(/\uFFFD/g)||[]).length);
