/**
 * Prompt Engineering Service for AI Review Generator
 * Builds structured prompts that produce varied, human-like, SEO-optimized reviews.
 */

const TONE_INSTRUCTIONS = {
  positive: 'The reviews should be enthusiastic and highly positive (4–5 stars).',
  neutral: 'The reviews should be balanced and matter-of-fact (3–4 stars).',
  mixed: 'Mix 80% positive reviews (4–5 stars) with 20% neutral reviews (3 stars). Occasionally mention a minor suggestion.',
};

const PERSONA_DESCRIPTIONS = {
  student: 'a student who personally attended or used the service',
  parent: 'a parent whose child used the service',
  working_professional: 'a working professional who used the service in their spare time',
  general: 'a genuine customer',
};

/**
 * Builds the AI prompt for generating reviews.
 *
 * @param {object} params
 * @param {string} params.businessName
 * @param {string} params.location
 * @param {string[]} params.keywords
 * @param {string} params.tone - 'positive' | 'neutral' | 'mixed'
 * @param {number} params.reviewCount
 * @param {string[]} params.personas - array of persona strings per review
 * @returns {string} prompt
 */
export const buildGeneratePrompt = ({ businessName, location, keywords, tone, reviewCount, personas }) => {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.positive;
  const keywordList = keywords.join(', ');
  const locationClause = location ? ` in ${location}` : '';

  // Build per-review instructions so the model knows exactly what type and persona to use
  const reviewInstructions = personas
    .map((persona, i) => {
      const typeLabel = getReviewType(i, reviewCount);
      const lengthGuide = LENGTH_GUIDES[typeLabel];
      const personaDesc = PERSONA_DESCRIPTIONS[persona] || PERSONA_DESCRIPTIONS.general;
      return `Review ${i + 1}: Write as ${personaDesc}. Type: ${typeLabel} (${lengthGuide}). Naturally include 1–2 of the keywords.`;
    })
    .join('\n');

  return `You are a review-writing assistant. Generate ${reviewCount} realistic, human-like Google reviews for "${businessName}"${locationClause}.

Keywords to weave in naturally (do NOT stuff): ${keywordList}

Tone guidance: ${toneInstruction}

Per-review instructions:
${reviewInstructions}

Rules:
- Each review must be unique — no repeated sentences or phrases across reviews.
- Vary sentence structure and vocabulary across reviews.
- Use first-person expressions like "I personally liked…", "My experience was…", "We found that…".
- Introduce slight natural grammar variations (contractions, casual phrasing) to sound human.
- Do NOT mention star counts or ratings inside the review text.
- Do NOT use generic filler like "I highly recommend" in every review — vary the closing.
- Do NOT repeat the business name in every review.

Return ONLY a valid JSON array. No markdown, no explanation. Format:
[
  { "review": "...", "rating": <number 1-5>, "type": "short|medium|detailed", "persona": "<persona>" },
  ...
]`;
};

const LENGTH_GUIDES = {
  short: '1–2 sentences, ~15–30 words',
  medium: '2–3 sentences, ~40–60 words',
  detailed: '3–5 sentences, ~70–120 words',
};

/**
 * Determines review type based on index to ensure a natural distribution.
 * For any count, roughly: 1/3 short, 1/3 medium, 1/3 detailed.
 */
export const getReviewType = (index, total) => {
  const types = [];
  for (let i = 0; i < total; i++) {
    if (i % 3 === 0) types.push('detailed');
    else if (i % 3 === 1) types.push('short');
    else types.push('medium');
  }
  return types[index] || 'medium';
};

/**
 * Assigns personas in a rotating, varied pattern.
 * @param {number} count
 * @returns {string[]}
 */
export const assignPersonas = (count) => {
  const pool = ['student', 'parent', 'working_professional', 'general'];
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]);
};

/**
 * Assigns postAfterDays for scheduling — staggers posts naturally.
 * @param {number} count
 * @returns {number[]}
 */
export const assignPostSchedule = (count) => {
  // Stagger: 0, 2, 4, 6, ... days
  return Array.from({ length: count }, (_, i) => i * 2);
};
