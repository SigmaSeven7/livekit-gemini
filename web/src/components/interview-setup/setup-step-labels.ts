import {
  setup_diff_beginner,
  setup_diff_challenging,
  setup_diff_easy,
  setup_diff_expert,
  setup_diff_moderate,
  setup_exp_01,
  setup_exp_10p,
  setup_exp_13,
  setup_exp_35,
  setup_exp_510,
} from "@/paraglide/messages";

export function difficultyLevelLabel(level: number | undefined): string {
  const l = level ?? 3;
  if (l === 1) return String(setup_diff_easy());
  if (l === 2) return String(setup_diff_beginner());
  if (l === 3) return String(setup_diff_moderate());
  if (l === 4) return String(setup_diff_challenging());
  return String(setup_diff_expert());
}

export function experienceRangeLabel(level: number | undefined): string {
  const l = level ?? 3;
  if (l === 1) return String(setup_exp_01());
  if (l === 2) return String(setup_exp_13());
  if (l === 3) return String(setup_exp_35());
  if (l === 4) return String(setup_exp_510());
  return String(setup_exp_10p());
}
