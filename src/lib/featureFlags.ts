/**
 * Project-wide feature flags.
 *
 * Flip these to toggle a feature surface on/off across the entire app
 * without touching individual components.
 */

/**
 * When true, every PRO-gated feature unlocks for every user and every
 * "PRO" / upgrade label in the UI is hidden. This is the "everything
 * free during launch" mode — set back to `false` to re-enable the
 * paywall (no code changes needed; the gates are still in the codebase).
 *
 * Affects:
 *   • LearnHub  — unlocks non-free tracks, hides PRO badge + upsell
 *   • PromptLearnClient — unlocks all modules, hides per-module Pro chip
 *   • PromptBattle — Revise-prompt feature available to all
 *   • WelcomeCarousel — module chips display as FREE instead of PRO
 *
 * Does NOT affect:
 *   • profile.is_pro chip — identifies real paid users, separate concern
 */
export const PRO_FEATURES_FREE = false;