import crypto from 'crypto';
import Review from '../models/Review.js';

export const getVariationSeed = async (review) => {
  const hash = crypto.createHash('md5').update(review).digest('hex');
  const count = await Review.countDocuments({ reviewHash: hash });
  return count % 5;
};

export const saveReply = async ({ businessName, review, rating, customerName, tone, sentiment, reply, replyScore }) => {
  const hash = crypto.createHash('md5').update(review).digest('hex');
  const doc = new Review({ businessName, review, rating, customerName, tone, sentiment, reply, replyScore, reviewHash: hash });
  return await doc.save();
};
