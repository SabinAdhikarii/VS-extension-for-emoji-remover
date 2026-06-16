/**
 * emojiUtils.ts
 * Core emoji detection and removal logic.
 */

// Comprehensive emoji regex covering:
// - Emoticons & misc symbols
// - Dingbats
// - Transport & map symbols
// - Enclosed characters
// - Supplemental symbols & pictographs
// - Symbols & pictographs extended
// - Flags (regional indicators)
// - Tags block (used in flag sequences)
// - Variation selectors (FE0F)
// - Zero Width Joiner sequences (family/profession emoji)
// - Skin tone modifiers
// - Keycap sequences (e.g. 1️⃣)
const EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F}|\u{20E3})?(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F}|\u{20E3})?)*[\u{1F3FB}-\u{1F3FF}]?/gu;

// Also catch regional indicator pairs (flags like 🇳🇵)
const FLAG_REGEX = /[\u{1F1E0}-\u{1F1FF}]{2}/gu;

// Variation selector-16 orphans left after emoji removal
const VARIATION_SELECTOR_REGEX = /\uFE0F/g;

// Text-mode emoji (like :) or :-) ) — optional, off by default
const TEXT_EMOTICON_REGEX = /(?<![a-zA-Z0-9])[:;=8][-o*']?[)(D\[\]{}@#$|\\\/pP3<>^*+oO0](?![a-zA-Z0-9])/g;

export interface RemovalResult {
  text: string;
  count: number;
  positions: number[];
}

/**
 * Remove all emoji from a string.
 * Returns the cleaned text, how many were removed, and their original positions.
 */
export function removeEmojis(input: string): RemovalResult {
  const positions: number[] = [];
  let count = 0;

  // First pass: find positions for reporting
  let match: RegExpExecArray | null;
  const emojiPattern = new RegExp(EMOJI_REGEX.source, 'gu');
  const flagPattern = new RegExp(FLAG_REGEX.source, 'gu');

  emojiPattern.lastIndex = 0;
  while ((match = emojiPattern.exec(input)) !== null) {
    positions.push(match.index);
    count++;
  }

  flagPattern.lastIndex = 0;
  while ((match = flagPattern.exec(input)) !== null) {
    if (!positions.includes(match.index)) {
      positions.push(match.index);
      count++;
    }
  }

  // Second pass: remove them
  let cleaned = input
    .replace(new RegExp(EMOJI_REGEX.source, 'gu'), '')
    .replace(new RegExp(FLAG_REGEX.source, 'gu'), '')
    .replace(VARIATION_SELECTOR_REGEX, '');

  // Clean up double spaces left behind (in comments/strings)
  cleaned = cleaned.replace(/([^\S\n]) +/g, '$1');
  // Clean up trailing spaces on lines
  cleaned = cleaned.replace(/[ \t]+$/gm, '');

  return { text: cleaned, count, positions };
}

/**
 * Count emojis in a string without modifying it.
 */
export function countEmojis(input: string): number {
  const emojiMatches = input.match(new RegExp(EMOJI_REGEX.source, 'gu')) ?? [];
  const flagMatches = input.match(new RegExp(FLAG_REGEX.source, 'gu')) ?? [];
  return emojiMatches.length + flagMatches.length;
}

/**
 * Check whether a string contains any emojis.
 */
export function hasEmojis(input: string): boolean {
  return (
    new RegExp(EMOJI_REGEX.source, 'gu').test(input) ||
    new RegExp(FLAG_REGEX.source, 'gu').test(input)
  );
}
