import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/v1/recordings/[id]/transcribe - Transcribe a recording
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recording = await db.recording.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (!recording.fileUrl) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }

    // Update status to processing
    await db.recording.update({
      where: { id: params.id },
      data: { status: 'PROCESSING' },
    });

    try {
      // Fetch the audio file
      const audioResponse = await fetch(recording.fileUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioFile = new File([audioBuffer], 'audio.webm', { type: recording.mimeType || 'audio/webm' });

      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
      });

      // Update recording with transcription
      const updatedRecording = await db.recording.update({
        where: { id: params.id },
        data: {
          transcription: transcription.text,
          status: 'COMPLETED',
        },
      });

      // Create audit log
      await createAuditLog({
        organizationId: orgId,
        userId,
        action: 'RECORDING_TRANSCRIBED',
        resourceType: 'recording',
        resourceId: params.id,
        details: { wordCount: transcription.text.split(' ').length },
        request,
      });

      // Create activity if linked to a case
      if (recording.caseId) {
        await db.activity.create({
          data: {
            type: 'RECORDING_TRANSCRIBED',
            content: `Recording "${recording.title}" transcribed`,
            caseId: recording.caseId,
            userId,
          },
        });
      }

      return NextResponse.json({
        id: updatedRecording.id,
        transcription: transcription.text,
        status: 'COMPLETED',
      });
    } catch (transcriptionError: any) {
      // Update status to failed
      await db.recording.update({
        where: { id: params.id },
        data: { status: 'FAILED' },
      });

      console.error('Transcription error:', transcriptionError);
      return NextResponse.json(
        { error: 'Transcription failed', details: transcriptionError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error transcribing recording:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['recordings:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
