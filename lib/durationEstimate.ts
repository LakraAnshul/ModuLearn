import type { LearningDepth, LearningPreferences, TopicFamiliarity } from '../backend/groqService.ts';

const DEPTH_MINUTES_PER_MODULE: Record<LearningDepth, { min: number; max: number }> = {
  quick_overview: { min: 10, max: 18 },
  structured_learning: { min: 18, max: 32 },
  deep_mastery: { min: 28, max: 48 },
};

const FAMILIARITY_MULTIPLIER: Record<TopicFamiliarity, number> = {
  new_to_topic: 1.12,
  some_experience: 1,
  already_comfortable: 0.85,
};

const DEPTH_LABEL: Record<LearningDepth, string> = {
  quick_overview: 'quick overview',
  structured_learning: 'structured learning',
  deep_mastery: 'deep mastery',
};

const FAMILIARITY_LABEL: Record<TopicFamiliarity, string> = {
  new_to_topic: 'new to topic',
  some_experience: 'some experience',
  already_comfortable: 'already comfortable',
};

const DEFAULT_PREFERENCES: LearningPreferences = {
  depth: 'structured_learning',
  familiarity: 'new_to_topic',
};

export const normalizeLearningPreferences = (
  input?: Partial<LearningPreferences> | null,
): LearningPreferences => {
  const depth = input?.depth;
  const familiarity = input?.familiarity;

  const safeDepth = depth && depth in DEPTH_MINUTES_PER_MODULE ? depth : DEFAULT_PREFERENCES.depth;
  const safeFamiliarity = familiarity && familiarity in FAMILIARITY_MULTIPLIER
    ? familiarity
    : DEFAULT_PREFERENCES.familiarity;

  return {
    depth: safeDepth,
    familiarity: safeFamiliarity,
  };
};

export const estimateLearningDuration = ({
  moduleCount,
  totalMinutes,
  preferences,
}: {
  moduleCount: number;
  totalMinutes: number;
  preferences?: Partial<LearningPreferences> | null;
}) => {
  const safeModuleCount = Math.max(0, Number(moduleCount) || 0);
  const safeTotalMinutes = Math.max(0, Number(totalMinutes) || 0);
  const safePreferences = normalizeLearningPreferences(preferences);

  const minutesPerModule = DEPTH_MINUTES_PER_MODULE[safePreferences.depth];
  const familiarityFactor = FAMILIARITY_MULTIPLIER[safePreferences.familiarity];

  const boundedMinMinutes = safeModuleCount * minutesPerModule.min * familiarityFactor;
  const boundedMaxMinutes = safeModuleCount * minutesPerModule.max * familiarityFactor;
  const boundedMidMinutes = (boundedMinMinutes + boundedMaxMinutes) / 2;

  const blendedMinutes = safeTotalMinutes > 0
    ? (safeTotalMinutes * 0.4) + (boundedMidMinutes * 0.6)
    : boundedMidMinutes;
  const realisticMinutes = Math.min(Math.max(blendedMinutes, boundedMinMinutes), boundedMaxMinutes);

  return {
    totalHours: (realisticMinutes / 60).toFixed(1),
    minHours: (boundedMinMinutes / 60).toFixed(1),
    maxHours: (boundedMaxMinutes / 60).toFixed(1),
    durationHint: `${safeModuleCount} modules • ${DEPTH_LABEL[safePreferences.depth]} • ${FAMILIARITY_LABEL[safePreferences.familiarity]}`,
    preferences: safePreferences,
  };
};
