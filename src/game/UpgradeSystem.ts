export type UpgradeId =
  | 'qCharge'
  | 'wRadius'
  | 'eCooldown'
  | 'rDamage'
  | 'cooldown'
  | 'vitality'
  | 'basicSpeed'
  | 'markDamage'
  | 'voidHoming'
  | 'voidRadius';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  glyph: string;
}

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: 'qCharge',
    name: '星弧过载',
    description: 'Q 蓄力速度 +30%',
    glyph: '➤',
  },
  {
    id: 'wRadius',
    name: '引力扩张',
    description: 'F 引力法阵半径 +25%',
    glyph: '◎',
  },
  {
    id: 'eCooldown',
    name: '折跃回响',
    description: 'E 折跃冷却 -20%',
    glyph: '⇢',
  },
  {
    id: 'rDamage',
    name: '棱镜增幅',
    description: 'R 天穹裂隙伤害 +30%',
    glyph: '☄',
  },
  {
    id: 'cooldown',
    name: '冷却回响',
    description: '所有技能冷却 -10%',
    glyph: '◌',
  },
  {
    id: 'vitality',
    name: '星屑护体',
    description: '最大生命 +25，并立即回复 25',
    glyph: '✦',
  },
  {
    id: 'basicSpeed',
    name: '猎星步',
    description: '普攻速度 +15%',
    glyph: '✧',
  },
  {
    id: 'markDamage',
    name: '星辉烙印',
    description: '印记引爆伤害 +50%',
    glyph: '✶',
  },
  {
    id: 'voidHoming',
    name: '虚空追猎',
    description: '追踪法球伤害 +25%',
    glyph: '◉',
  },
  {
    id: 'voidRadius',
    name: '坍缩边界',
    description: '虚空区域半径 +20%',
    glyph: '◌',
  },
];

export function pickUpgrades(count = 3): UpgradeDefinition[] {
  const pool = [...UPGRADE_POOL];
  const result: UpgradeDefinition[] = [];
  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}
