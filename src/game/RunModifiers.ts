export type Difficulty =
  | 'story'
  | 'easy'
  | 'normal'
  | 'hard'
  | 'nightmare';

export interface DifficultyConfig {
  label: string;
  shortLabel: string;
  description: string;
  bossHealthScale: number;
  bossDamageScale: number;
  attackCooldownScale: number;
  telegraphScale: number;
  projectileSpeedScale: number;
  playerHealthScale: number;
  playerDamageScale: number;
  scoreBonus: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  story: {
    label: '剧情',
    shortLabel: '剧情',
    description: 'Boss 生命 -45% · 伤害 -55% · 预警更长，适合轻松看剧情',
    bossHealthScale: 0.55,
    bossDamageScale: 0.45,
    attackCooldownScale: 1.35,
    telegraphScale: 1.5,
    projectileSpeedScale: 0.65,
    playerHealthScale: 1.3,
    playerDamageScale: 1.2,
    scoreBonus: 0,
  },
  easy: {
    label: '简单',
    shortLabel: '简单',
    description: 'Boss 生命 -20% · 伤害 -30% · 节奏更慢',
    bossHealthScale: 0.8,
    bossDamageScale: 0.7,
    attackCooldownScale: 1.2,
    telegraphScale: 1.25,
    projectileSpeedScale: 0.85,
    playerHealthScale: 1.1,
    playerDamageScale: 1.05,
    scoreBonus: 0,
  },
  normal: {
    label: '普通',
    shortLabel: '普通',
    description: '标准战斗节奏',
    bossHealthScale: 1,
    bossDamageScale: 1,
    attackCooldownScale: 1,
    telegraphScale: 1,
    projectileSpeedScale: 1,
    playerHealthScale: 1,
    playerDamageScale: 1,
    scoreBonus: 3000,
  },
  hard: {
    label: '困难',
    shortLabel: '困难',
    description: 'Boss 生命 +15% · 伤害 +25% · 节奏更快',
    bossHealthScale: 1.15,
    bossDamageScale: 1.25,
    attackCooldownScale: 0.86,
    telegraphScale: 0.82,
    projectileSpeedScale: 1.15,
    playerHealthScale: 0.95,
    playerDamageScale: 0.95,
    scoreBonus: 8000,
  },
  nightmare: {
    label: '噩梦',
    shortLabel: '噩梦',
    description: 'Boss 生命 +30% · 伤害 +50% · 预警极短，仅推荐熟悉机制后挑战',
    bossHealthScale: 1.3,
    bossDamageScale: 1.5,
    attackCooldownScale: 0.72,
    telegraphScale: 0.68,
    projectileSpeedScale: 1.3,
    playerHealthScale: 0.85,
    playerDamageScale: 0.9,
    scoreBonus: 15000,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  'story',
  'easy',
  'normal',
  'hard',
  'nightmare',
];

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTY_ORDER as string[]).includes(value);
}

/** Returns the next easier tier, or null when already at the lowest. */
export function previousDifficulty(difficulty: Difficulty): Difficulty | null {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  return index > 0 ? DIFFICULTY_ORDER[index - 1] : null;
}

export type BossModifier = 'none' | 'berserk' | 'shield' | 'split';

export interface BossModifierDefinition {
  id: BossModifier;
  label: string;
  description: string;
}

export const BOSS_MODIFIERS: Record<BossModifier, BossModifierDefinition> = {
  none: {
    id: 'none',
    label: '无词缀',
    description: '标准战斗节奏',
  },
  berserk: {
    id: 'berserk',
    label: '狂暴',
    description: 'Boss 伤害 +15%，攻击更频繁',
  },
  shield: {
    id: 'shield',
    label: '护盾',
    description: 'Boss 受到的伤害 -15%',
  },
  split: {
    id: 'split',
    label: '分裂',
    description: '阶段 2 额外召唤 1 个单位',
  },
};

/**
 * Rolls a boss modifier appropriate for the chosen difficulty.
 * Story mode always runs clean so new players get a readable fight.
 */
export function pickBossModifier(difficulty: Difficulty = 'normal'): BossModifier {
  if (difficulty === 'story') return 'none';

  const roll = Math.random();
  if (difficulty === 'easy') {
    if (roll < 0.55) return 'none';
    if (roll < 0.7) return 'berserk';
    if (roll < 0.85) return 'shield';
    return 'split';
  }
  if (difficulty === 'hard') {
    if (roll < 0.1) return 'none';
    if (roll < 0.4) return 'berserk';
    if (roll < 0.7) return 'shield';
    return 'split';
  }
  if (difficulty === 'nightmare') {
    if (roll < 0.35) return 'berserk';
    if (roll < 0.7) return 'shield';
    return 'split';
  }

  if (roll < 0.25) return 'none';
  if (roll < 0.5) return 'berserk';
  if (roll < 0.75) return 'shield';
  return 'split';
}

export function readDifficulty(): Difficulty {
  try {
    const raw = window.localStorage.getItem('fp-moba.difficulty');
    if (raw && isDifficulty(raw)) return raw;
  } catch {
    // localStorage may be unavailable in private mode.
  }
  return 'normal';
}

export function saveDifficulty(difficulty: Difficulty): void {
  try {
    window.localStorage.setItem('fp-moba.difficulty', difficulty);
  } catch {
    // Ignore storage failures.
  }
}

export function readBestScore(): number | null {
  try {
    const raw = window.localStorage.getItem('fp-moba.boss-best-score');
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem('fp-moba.boss-best-score', String(score));
  } catch {
    // Ignore storage failures.
  }
}
