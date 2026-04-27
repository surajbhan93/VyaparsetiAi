import { generateReviews } from '../services/reviewGeneratorService.js';

/**
 * POST /api/reviews/generate
 *
 * Generates human-like, SEO-optimized reviews for a business using AI.
 */
export const generateReviewsHandler = async (req, res, next) => {
  try {
    const { businessName, location, keywords, tone, reviewCount } = req.body;

    const reviews = await generateReviews({ businessName, location, keywords, tone, reviewCount });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
