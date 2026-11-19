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

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  glyph: string;
  rarity: UpgradeRarity;
}

export const RARITY_LABELS: Record<UpgradeRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
};

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: 'qCharge',
    name: '星弧过载',
    description: 'Q 蓄力速度 +30%',
    glyph: '➤',
    rarity: 'rare',
  },
  {
    id: 'wRadius',
    name: '引力扩张',
    description: 'F 引力法阵半径 +25%',
    glyph: '◎',
    rarity: 'common',
  },
  {
    id: 'eCooldown',
    name: '折跃回响',
    description: 'E 折跃冷却 -20%',
    glyph: '⇢',
    rarity: 'common',
  },
  {
    id: 'rDamage',
    name: '棱镜增幅',
    description: 'R 天穹裂隙伤害 +30%',
    glyph: '☄',
    rarity: 'rare',
  },
  {
    id: 'cooldown',
    name: '冷却回响',
    description: '所有技能冷却 -10%',
    glyph: '◌',
    rarity: 'rare',
  },
  {
    id: 'vitality',
    name: '星屑护体',
    description: '最大生命 +25，并立即回复 25',
    glyph: '✦',
    rarity: 'common',
  },
  {
    id: 'basicSpeed',
    name: '猎星步',
    description: '普攻速度 +15%',
    glyph: '✧',
    rarity: 'common',
  },
  {
    id: 'markDamage',
    name: '星辉烙印',
    description: '印记引爆伤害 +50%',
    glyph: '✶',
    rarity: 'rare',
  },
  {
    id: 'voidHoming',
    name: '虚空追猎',
    description: '追踪法球伤害 +25%',
    glyph: '◉',
    rarity: 'rare',
  },
  {
    id: 'voidRadius',
    name: '坍缩边界',
    description: '虚空区域半径 +20%',
    glyph: '◌',
    rarity: 'epic',
  },
];

const RARITY_WEIGHT: Record<UpgradeRarity, number> = {
  common: 60,
  rare: 30,
  epic: 10,
};

export function pickUpgrades(count = 3): UpgradeDefinition[] {
  const pool = [...UPGRADE_POOL];
  const result: UpgradeDefinition[] = [];
  while (result.length < count && pool.length > 0) {
    const totalWeight = pool.reduce(
      (sum, upgrade) => sum + RARITY_WEIGHT[upgrade.rarity],
      0,
    );
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= RARITY_WEIGHT[pool[i].rarity];
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}
