import { detectSentiment } from '../services/sentimentService.js';
import { getVariationSeed, saveReply } from '../services/dedupService.js';
import { buildPrompt } from '../services/promptBuilderService.js';
import { generateReply } from '../services/aiService.js';
import { scoreReply } from '../services/qualityScoreService.js';
import { formatResponse } from '../utils/responseFormatter.js';

const DELAY_BY_SENTIMENT = {
  negative: 2,
  neutral: 4,
  positive: 8,
};

export const replyToReview = async (req, res, next) => {
  try {
    const { businessName, review, rating, customerName, tone } = req.body;

    const sentiment = detectSentiment(review, rating);
    const variationSeed = await getVariationSeed(review);

    const prompt = buildPrompt({ businessName, review, rating, customerName, tone, sentiment, variationSeed });
    const reply = await generateReply(prompt);

    const replyScore = scoreReply(reply, sentiment, customerName);
    const replyAfterHours = DELAY_BY_SENTIMENT[sentiment];

    await saveReply({ businessName, review, rating, customerName, tone, sentiment, reply, replyScore });

    res.status(200).json(formatResponse({ reply, replyScore, replyAfterHours }));
  } catch (error) {
    next(error);
  }
};
