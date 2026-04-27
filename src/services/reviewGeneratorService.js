/**
 * Review Generator Service
 * Handles AI generation, parsing, duplicate detection, rating assignment, and persistence.
 */

import crypto from 'crypto';
import { AppError } from '../middlewares/errorHandler.js';
import GeneratedReview from '../models/GeneratedReview.js';
import {
  buildGeneratePrompt,
  assignPersonas,
  assignPostSchedule,
} from './generateReviewsPromptBuilder.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Rating ranges by tone ────────────────────────────────────────────────────
const RATING_RANGES = {
  positive: { min: 4, max: 5 },
  neutral: { min: 3, max: 4 },
  mixed: { min: 3, max: 5 },
};

/**
 * Assigns a rating based on tone and a small random variation.
 * @param {string} tone
 * @param {number} aiRating - rating suggested by AI (may be undefined)
 * @returns {number}
 */
const assignRating = (tone, aiRating) => {
  const range = RATING_RANGES[tone] || RATING_RANGES.positive;
  if (aiRating && aiRating >= range.min && aiRating <= range.max) return aiRating;
  // Randomly pick within range for natural distribution
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

// ─── Duplicate Detection ──────────────────────────────────────────────────────

/**
 * Computes a simple Jaccard similarity between two strings (word-level).
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
const jaccardSimilarity = (a, b) => {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

/**
 * Filters out reviews that are too similar to each other.
 * Threshold: 0.5 Jaccard similarity (50% word overlap).
 */
const deduplicateReviews = (reviews) => {
  const unique = [];
  for (const candidate of reviews) {
    const isDuplicate = unique.some(
      (existing) => jaccardSimilarity(existing.review, candidate.review) >= 0.5,
    );
    if (!isDuplicate) unique.push(candidate);
  }
  return unique;
};

/**
 * Hashes a review string for storage-level dedup.
 */
const hashReview = (text) => crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');

// ─── AI Call ──────────────────────────────────────────────────────────────────

/**
 * Calls the Groq API with the given prompt and returns the raw text response.
 */
const callGroqAPI = async (prompt) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1500,
      temperature: 0.85, // Higher temperature for more varied, human-like output
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new AppError(`Groq API error: ${response.statusText} — ${errText}`, 502);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new AppError('AI returned an empty response', 500);
  return content;
};

// ─── Response Parsing ─────────────────────────────────────────────────────────

/**
 * Parses the AI response into a structured array of review objects.
 * Handles cases where the model wraps JSON in markdown code fences.
 */
const parseAIResponse = (rawContent) => {
  // Strip markdown code fences if present
  const cleaned = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // Extract the JSON array
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new AppError('AI response did not contain a valid JSON array', 500);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('Parsed value is not an array');
    return parsed;
  } catch {
    throw new AppError('Failed to parse AI-generated reviews as JSON', 500);
  }
};

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates, deduplicates, rates, and saves reviews.
 *
 * @param {object} params
 * @param {string} params.businessName
 * @param {string} params.location
 * @param {string[]} params.keywords
 * @param {string} params.tone
 * @param {number} params.reviewCount
 * @returns {Promise<object[]>} array of review objects ready for the API response
 */
export const generateReviews = async ({ businessName, location, keywords, tone, reviewCount }) => {
  const personas = assignPersonas(reviewCount);
  const postSchedule = assignPostSchedule(reviewCount);

  const prompt = buildGeneratePrompt({ businessName, location, keywords, tone, reviewCount, personas });

  // Attempt generation — retry once if we don't get enough unique reviews
  let reviews = [];
  let attempts = 0;
  const maxAttempts = 2;

  while (reviews.length < reviewCount && attempts < maxAttempts) {
    const needed = reviewCount - reviews.length;
    const batchPrompt =
      attempts === 0
        ? prompt
        : buildGeneratePrompt({
            businessName,
            location,
            keywords,
            tone,
            reviewCount: needed,
            personas: personas.slice(reviews.length),
          });

    const rawContent = await callGroqAPI(batchPrompt);
    const parsed = parseAIResponse(rawContent);

    // Normalise and validate each item
    const normalised = parsed
      .filter((item) => item && typeof item.review === 'string' && item.review.trim().length > 0)
      .map((item, i) => ({
        review: item.review.trim(),
        rating: assignRating(tone, item.rating),
        type: ['short', 'medium', 'detailed'].includes(item.type) ? item.type : 'medium',
        persona: personas[reviews.length + i] || 'general',
        postAfterDays: postSchedule[reviews.length + i] ?? 0,
      }));

    // Merge with already-collected reviews and deduplicate across the full set
    const combined = deduplicateReviews([...reviews, ...normalised]);
    reviews = combined.slice(0, reviewCount);
    attempts++;
  }

  if (reviews.length === 0) {
    throw new AppError('AI failed to generate any valid reviews after retries', 500);
  }

  // Persist to MongoDB
  const docsToSave = reviews.map((r) => ({
    businessName,
    location,
    keywords,
    tone,
    review: r.review,
    rating: r.rating,
    type: r.type,
    persona: r.persona,
    postAfterDays: r.postAfterDays,
    reviewHash: hashReview(r.review),
  }));

  await GeneratedReview.insertMany(docsToSave, { ordered: false }).catch((err) => {
    // Ignore duplicate key errors (E11000) — non-fatal
    if (err.code !== 11000) throw err;
  });

  return reviews;
};
