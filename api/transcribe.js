const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function transcribeAudio(filePath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const audioFile = fs.createReadStream(filePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    return {
      text: transcription.text,
      segments: transcription.segments || [],
      language: transcription.language,
      duration: transcription.duration
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

module.exports = { transcribeAudio };
