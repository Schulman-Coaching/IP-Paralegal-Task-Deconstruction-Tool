const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SYSTEM_PROMPTS = {
  patent: `You are an expert IP paralegal assistant specializing in patent applications.
Analyze the provided text and extract all relevant information for a patent application including:
- Invention title
- Inventor names and contact information
- Invention description and technical field
- Key features and claims
- Prior art references mentioned
- Filing dates or deadlines mentioned
- Any drawings or figures described

Format your response as structured JSON with clear field names.`,

  trademark: `You are an expert IP paralegal assistant specializing in trademark applications.
Analyze the provided text and extract all relevant information for a trademark application including:
- Mark name/text
- Mark description
- Owner/applicant name and address
- Type of mark (word, design, combined)
- Goods and services description
- International class(es)
- First use dates (in commerce, anywhere)
- Specimens described
- Any existing registrations mentioned

Format your response as structured JSON with clear field names.`,

  copyright: `You are an expert IP paralegal assistant specializing in copyright registrations.
Analyze the provided text and extract all relevant information for a copyright registration including:
- Work title
- Type of work (literary, musical, visual, software, etc.)
- Author name(s) and citizenship
- Claimant name and address
- Year of creation
- Year of publication (if published)
- Nature of authorship
- Work made for hire status
- Any preexisting material or new material added

Format your response as structured JSON with clear field names.`
};

async function analyzeWithGPT(text, formType = 'patent') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = SYSTEM_PROMPTS[formType] || SYSTEM_PROMPTS.patent;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please analyze the following text and extract relevant information for a ${formType} application:\n\n${text}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('GPT analysis error:', error);
    throw new Error(`GPT analysis failed: ${error.message}`);
  }
}

async function analyzeWithClaude(text, formType = 'patent') {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const systemPrompt = SYSTEM_PROMPTS[formType] || SYSTEM_PROMPTS.patent;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Please analyze the following text and extract relevant information for a ${formType} application. Return your response as valid JSON only, with no additional text:\n\n${text}` }
      ]
    });

    const content = response.content[0].text;
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse JSON from Claude response');
  } catch (error) {
    console.error('Claude analysis error:', error);
    throw new Error(`Claude analysis failed: ${error.message}`);
  }
}

module.exports = { analyzeWithGPT, analyzeWithClaude };
