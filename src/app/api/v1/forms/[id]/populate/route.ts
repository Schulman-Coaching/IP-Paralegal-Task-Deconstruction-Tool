import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/v1/forms/[id]/populate - Auto-populate form from recording analysis
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
    const { recordingId } = body;

    const form = await db.form.findFirst({
      where: { id: params.id, organizationId: orgId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get recording with analysis
    const recording = await db.recording.findFirst({
      where: {
        id: recordingId || form.recordingId,
        organizationId: orgId,
      },
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (!recording.analysis && !recording.transcription) {
      return NextResponse.json({ error: 'Recording has no analysis or transcription' }, { status: 400 });
    }

    // Use AI to map analysis to form fields
    const formTemplate = form.data as Record<string, any>;
    const analysis = recording.analysis as Record<string, any> | null;
    const transcription = recording.transcription;

    const prompt = `Given the following form template and recording analysis/transcription, populate the form fields with relevant data.

Form Type: ${form.type}
Form Template:
${JSON.stringify(formTemplate, null, 2)}

${analysis ? `Recording Analysis:\n${JSON.stringify(analysis, null, 2)}` : ''}

${transcription ? `Transcription:\n${transcription}` : ''}

Return ONLY a valid JSON object with the form fields populated with relevant data extracted from the analysis and transcription. Keep the same structure as the form template.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert IP paralegal assistant that populates legal forms accurately based on provided information. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const populatedData = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Merge populated data with existing form data
    const mergedData = deepMerge(formTemplate, populatedData);

    // Update form with populated data
    const updatedForm = await db.form.update({
      where: { id: params.id },
      data: {
        data: mergedData,
        recordingId: recording.id,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'FORM_POPULATED',
      resourceType: 'form',
      resourceId: params.id,
      details: { recordingId: recording.id, fieldsPopulated: Object.keys(populatedData).length },
      request,
    });

    // Create activity if linked to a case
    if (form.caseId) {
      await db.activity.create({
        data: {
          type: 'FORM_POPULATED',
          content: `Form "${form.title}" auto-populated from recording`,
          caseId: form.caseId,
          userId,
        },
      });
    }

    return NextResponse.json({
      id: updatedForm.id,
      data: mergedData,
      fieldsPopulated: Object.keys(populatedData).length,
    });
  } catch (error) {
    console.error('Error populating form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  for (const key in source) {
    if (source[key] !== null && source[key] !== undefined && source[key] !== '') {
      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object') {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else if (Array.isArray(source[key]) && source[key].length > 0) {
        output[key] = source[key];
      } else if (!Array.isArray(source[key])) {
        output[key] = source[key];
      }
    }
  }

  return output;
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['forms:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
