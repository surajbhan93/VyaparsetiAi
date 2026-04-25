const fillerPhrases = ['we value your feedback', 'thank you for your review', 'we appreciate your feedback'];
const commitmentWords = ['improve', 'resolve', 'ensure', 'address', 'work on', 'fix', 'better', 'committed'];

export const scoreReply = (reply, sentiment, customerName) => {
  if (!reply || !reply.trim()) return 0;

  const trimmed = reply.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);
  let score = 0;

  if (trimmed.length >= 60 && trimmed.length <= 500) score += 20;

  if (customerName && customerName.length >= 3 && lower.includes(customerName.toLowerCase())) score += 20;

  if (lower.includes('thank')) score += 15;

  const hasFiller = fillerPhrases.some((phrase) => lower.includes(phrase));
  if (!hasFiller) score += 15;

  if (/[.!?]$/.test(trimmed)) score += 10;

  if (trimmed !== trimmed.toUpperCase()) score += 5;

  const uniqueWords = new Set(words);
  if (words.length > 0 && uniqueWords.size / words.length >= 0.6) score += 5;

  if (sentiment === 'negative' && lower.includes('sorry')) score += 5;

  if (sentiment === 'negative' && commitmentWords.some((w) => lower.includes(w))) score += 5;

  return Math.min(Math.max(score, 10), 100);
};
