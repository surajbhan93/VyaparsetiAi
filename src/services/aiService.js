import { AppError } from '../middlewares/errorHandler.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const generateReply = async (prompt) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new AppError(`Groq API error: ${response.statusText}`, 500);
  }

  const data = await response.json();
  const reply = data.choices[0]?.message?.content?.trim();

  if (!reply) throw new AppError('AI returned an empty reply', 500);

  return reply;
};
