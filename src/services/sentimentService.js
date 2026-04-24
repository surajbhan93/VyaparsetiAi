const negativeWords = ['bad', 'terrible', 'worst', 'awful', 'horrible', 'slow', 'rude', 'disappointing'];
const positiveWords = ['great', 'excellent', 'amazing', 'fantastic', 'good', 'loved', 'best', 'wonderful'];

export const detectSentiment = (review, rating) => {
  const lowerReview = review.toLowerCase();

  const negativeCount = negativeWords.filter((word) => lowerReview.includes(word)).length;
  const positiveCount = positiveWords.filter((word) => lowerReview.includes(word)).length;

  if (rating <= 2 && negativeCount >= positiveCount) return 'negative';
  if (rating >= 4 && positiveCount >= negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount > negativeCount) return 'positive';
  return 'neutral';
};
