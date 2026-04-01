const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function getProductSummary(title, reviews = []) {
  if (!process.env.GROQ_API_KEY) return 'AI summary not available (GROQ_API_KEY missing).';
  
  const reviewsText = reviews.length > 0 
    ? reviews.map(r => `- ${r}`).join('\n') 
    : 'No detailed reviews provided.';

  const prompt = `
    You are an expert product reviewer. Based on the product title and review summaries below, 
    provide a concise (3-4 bullet points) summary of the key strengths and weaknesses.
    Product: ${title}
    Reviews:
    ${reviewsText}
    
    Format the output as simple Markdown bullet points.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 256,
      top_p: 1,
      stream: false,
      stop: null
    });

    return chatCompletion.choices[0]?.message?.content || 'Unable to generate summary.';
  } catch (err) {
    console.error('Groq Error:', err.message);
    return 'Summary generation failed due to API error.';
  }
}

module.exports = { getProductSummary };
