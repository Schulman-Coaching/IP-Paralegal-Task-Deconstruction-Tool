import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const IP_ANALYSIS_PROMPT = `You are an expert IP paralegal assistant. Analyze the following transcription and extract relevant information for intellectual property case management.

Extract the following:
1. **Invention/Work Description**: Main subject matter
2. **Inventors/Creators**: Names mentioned
3. **Key Dates**: Filing dates, priority dates, deadlines mentioned
4. **Claims/Rights**: Specific claims or rights discussed
5. **Prior Art/References**: Any references to existing patents, trademarks, or works
6. **Technical Details**: Technical specifications relevant to the IP
7. **Client Information**: Contact details, company names
8. **Action Items**: Tasks or follow-ups mentioned
9. **Risk Factors**: Potential issues or concerns
10. **Suggested Form Type**: Patent, Trademark, or Copyright based on content

Provide your analysis in a structured JSON format.`;

// POST /api/v1/recordings/[id]/analyze - AI analysis of transcription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider || 'openai'; // 'openai' or 'anthropic'

    const recording = await db.recording.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (!recording.transcription) {
      return NextResponse.json({ error: 'Recording not transcribed yet' }, { status: 400 });
    }

    let analysis: string;

    if (provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${IP_ANALYSIS_PROMPT}\n\nTranscription:\n${recording.transcription}`,
          },
        ],
      });

      analysis = response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: IP_ANALYSIS_PROMPT,
          },
          {
            role: 'user',
            content: `Transcription:\n${recording.transcription}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      analysis = response.choices[0]?.message?.content || '{}';
    }

    // Parse analysis to extract structured data
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      parsedAnalysis = { rawAnalysis: analysis };
    }

    // Update recording with analysis
    const updatedRecording = await db.recording.update({
      where: { id: params.id },
      data: {
        analysis: parsedAnalysis,
        analyzedAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'RECORDING_ANALYZED',
      resourceType: 'recording',
      resourceId: params.id,
      details: { provider },
      request,
    });

    // Create activity if linked to a case
    if (recording.caseId) {
      await db.activity.create({
        data: {
          type: 'RECORDING_ANALYZED',
          content: `Recording "${recording.title}" analyzed with ${provider}`,
          caseId: recording.caseId,
          userId,
        },
      });
    }

    return NextResponse.json({
      id: updatedRecording.id,
      analysis: parsedAnalysis,
      provider,
    });
  } catch (error) {
    console.error('Error analyzing recording:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['recordings:write', 'analysis:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
