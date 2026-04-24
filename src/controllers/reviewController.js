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
    let reply = await generateReply(prompt);
    let replyScore = scoreReply(reply, sentiment, customerName);

    if (replyScore < 60) {
      const strictPrompt = buildPrompt({ businessName, review, rating, customerName, tone, sentiment, variationSeed, strict: true });
      const retryReply = await generateReply(strictPrompt);
      const retryScore = scoreReply(retryReply, sentiment, customerName);

      if (retryScore > replyScore) {
        reply = retryReply;
        replyScore = retryScore;
      }
    }

    const replyAfterHours = DELAY_BY_SENTIMENT[sentiment];

    await saveReply({ businessName, review, rating, customerName, tone, sentiment, reply, replyScore });

    res.status(200).json(formatResponse({ reply, replyScore, replyAfterHours }));
  } catch (error) {
    next(error);
  }
};
