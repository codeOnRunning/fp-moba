export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  label: string;
  shortLabel: string;
  bossDamageScale: number;
  attackCooldownScale: number;
  telegraphScale: number;
  projectileSpeedScale: number;
  scoreBonus: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '简单',
    shortLabel: '简单',
    bossDamageScale: 0.75,
    attackCooldownScale: 1.2,
    telegraphScale: 1.2,
    projectileSpeedScale: 0.85,
    scoreBonus: 0,
  },
  normal: {
    label: '普通',
    shortLabel: '普通',
    bossDamageScale: 1,
    attackCooldownScale: 1,
    telegraphScale: 1,
    projectileSpeedScale: 1,
    scoreBonus: 3000,
  },
  hard: {
    label: '困难',
    shortLabel: '困难',
    bossDamageScale: 1.25,
    attackCooldownScale: 0.86,
    telegraphScale: 0.82,
    projectileSpeedScale: 1.15,
    scoreBonus: 8000,
  },
};

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

export function pickBossModifier(): BossModifier {
  const roll = Math.random();
  if (roll < 0.25) return 'none';
  if (roll < 0.5) return 'berserk';
  if (roll < 0.75) return 'shield';
  return 'split';
}

export function readDifficulty(): Difficulty {
  try {
    const raw = window.localStorage.getItem('fp-moba.difficulty');
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
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
