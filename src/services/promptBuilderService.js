const variations = [
  'Start with gratitude, then address the concern, end with an invitation to return.',
  'Acknowledge the customer by name first, then respond to the specifics of their feedback.',
  'Open with empathy, validate their experience, close with a commitment to improve.',
  'Lead with the positive aspect they mentioned, then address any concern raised.',
  'Be warm and conversational. Avoid formal language. Respond like a human, not a brand.',
];

const toneInstructions = {
  professional: 'Use a professional and respectful tone.',
  friendly: 'Use a warm, friendly, and approachable tone.',
  apologetic: 'Use a sincere and apologetic tone if there is any concern.',
};

export const buildPrompt = ({ businessName, review, rating, customerName, tone, sentiment, variationSeed, strict = false }) => {
  const variation = variations[variationSeed];
  const toneInstruction = toneInstructions[tone] || toneInstructions.professional;
  const nameInstruction = customerName ? `The customer's name is ${customerName}. Use their name naturally at least once.` : '';
  const strictInstruction = strict ? `- You MUST address the customer by name.\n- You MUST include an expression of gratitude.\n- End the reply with a period, exclamation, or question mark.\n- Do NOT use any generic phrases.` : '';

  return `You are a professional reply writer for ${businessName}.

A customer left the following review (${rating}/5 stars):
"${review}"

Detected sentiment: ${sentiment}
${nameInstruction}

Instructions:
- ${toneInstruction}
- ${variation}
- Keep the reply between 60 and 120 words.
- Do not use generic phrases like "We value your feedback" or "Thank you for your review".
- Do not mention ratings or star counts.
- Write only the reply. No subject line. No sign-off label.
${strictInstruction}`;
};
