import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/api-keys';
import { createAuditLog } from '@/lib/audit';
import { FormType, FormStatus } from '@prisma/client';

// GET /api/v1/forms - List forms
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const caseId = searchParams.get('caseId');
    const type = searchParams.get('type') as FormType | null;
    const status = searchParams.get('status') as FormStatus | null;

    const where: any = { organizationId: orgId };
    if (caseId) where.caseId = caseId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [forms, total] = await Promise.all([
      db.form.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          case: { select: { id: true, caseNumber: true, title: true } },
        },
      }),
      db.form.count({ where }),
    ]);

    return NextResponse.json({
      data: forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing forms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/forms - Create form
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await getAuthContext(request);

    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, caseId, data, recordingId } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    // Verify case belongs to organization if provided
    if (caseId) {
      const caseExists = await db.case.findFirst({
        where: { id: caseId, organizationId: orgId },
      });
      if (!caseExists) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    // Get template for form type
    const template = getFormTemplate(type);

    const form = await db.form.create({
      data: {
        title,
        type,
        data: data || template,
        status: 'DRAFT',
        organizationId: orgId,
        caseId,
        recordingId,
        createdById: userId,
      },
    });

    // Create audit log
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'FORM_CREATED',
      resourceType: 'form',
      resourceId: form.id,
      details: { title, type },
      request,
    });

    // Create activity if linked to a case
    if (caseId) {
      await db.activity.create({
        data: {
          type: 'FORM_CREATED',
          content: `Form "${title}" created`,
          caseId,
          userId,
        },
      });
    }

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getFormTemplate(type: FormType): Record<string, any> {
  const templates: Record<FormType, any> = {
    PATENT_APPLICATION: {
      inventionTitle: '',
      inventors: [],
      abstract: '',
      claims: [],
      description: '',
      drawings: [],
      priorityDate: null,
      filingDate: null,
      applicationNumber: '',
      technicalField: '',
      backgroundArt: '',
    },
    TRADEMARK_APPLICATION: {
      mark: '',
      markType: '',
      goodsAndServices: [],
      classes: [],
      applicant: {
        name: '',
        address: '',
        entityType: '',
      },
      useInCommerce: false,
      firstUseDate: null,
      specimens: [],
    },
    COPYRIGHT_REGISTRATION: {
      workTitle: '',
      workType: '',
      authors: [],
      creationDate: null,
      publicationDate: null,
      claimant: {
        name: '',
        address: '',
      },
      workDescription: '',
      preexistingMaterial: '',
      deposit: [],
    },
    IDS_FORM: {
      applicationNumber: '',
      filingDate: null,
      applicant: '',
      title: '',
      references: [],
      certification: false,
    },
    OFFICE_ACTION_RESPONSE: {
      applicationNumber: '',
      officeActionDate: null,
      responseDeadline: null,
      rejections: [],
      arguments: [],
      amendments: [],
    },
    ASSIGNMENT: {
      assignor: {
        name: '',
        address: '',
      },
      assignee: {
        name: '',
        address: '',
      },
      ipRights: [],
      consideration: '',
      effectiveDate: null,
    },
    POWER_OF_ATTORNEY: {
      principal: {
        name: '',
        address: '',
      },
      attorney: {
        name: '',
        registrationNumber: '',
        address: '',
      },
      scope: [],
      effectiveDate: null,
    },
    OTHER: {
      fields: {},
    },
  };

  return templates[type] || templates.OTHER;
}

async function getAuthContext(request: NextRequest): Promise<{ orgId: string | null; userId: string }> {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey, ['forms:read', 'forms:write']);
    if (keyData) {
      return { orgId: keyData.organizationId, userId: keyData.createdById };
    }
  }

  const { orgId, userId } = auth();
  return { orgId: orgId || null, userId: userId || '' };
}
