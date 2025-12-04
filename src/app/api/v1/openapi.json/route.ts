import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IP Paralegal Platform API',
    description: 'Enterprise API for intellectual property case management, audio transcription, and form automation.',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@ipparalegal.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  security: [
    { ApiKeyAuth: [] },
    { BearerAuth: [] },
  ],
  paths: {
    '/cases': {
      get: {
        summary: 'List cases',
        tags: ['Cases'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/CaseStatus' } },
          { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/CaseType' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of cases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Case' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create case',
        tags: ['Cases'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCaseRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Case created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Case' },
              },
            },
          },
        },
      },
    },
    '/cases/{id}': {
      get: {
        summary: 'Get case',
        tags: ['Cases'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Case details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CaseDetail' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Update case',
        tags: ['Cases'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCaseRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Case updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Case' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Delete case',
        tags: ['Cases'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Case deleted' },
        },
      },
    },
    '/recordings': {
      get: {
        summary: 'List recordings',
        tags: ['Recordings'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'caseId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/RecordingStatus' } },
        ],
        responses: {
          200: {
            description: 'List of recordings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Recording' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create recording metadata',
        tags: ['Recordings'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRecordingRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Recording created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Recording' },
              },
            },
          },
        },
      },
    },
    '/recordings/{id}/transcribe': {
      post: {
        summary: 'Transcribe recording',
        tags: ['Recordings'],
        description: 'Transcribes audio using OpenAI Whisper API',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Transcription result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    transcription: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/recordings/{id}/analyze': {
      post: {
        summary: 'Analyze recording',
        tags: ['Recordings'],
        description: 'Analyzes transcription using AI to extract IP-relevant information',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  provider: { type: 'string', enum: ['openai', 'anthropic'], default: 'openai' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Analysis result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalysisResult' },
              },
            },
          },
        },
      },
    },
    '/forms': {
      get: {
        summary: 'List forms',
        tags: ['Forms'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'caseId', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/FormType' } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/FormStatus' } },
        ],
        responses: {
          200: {
            description: 'List of forms',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Form' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create form',
        tags: ['Forms'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateFormRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Form created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Form' },
              },
            },
          },
        },
      },
    },
    '/forms/{id}': {
      get: {
        summary: 'Get form',
        tags: ['Forms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Form details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Form' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Update form',
        tags: ['Forms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateFormRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Form updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Form' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Delete form',
        tags: ['Forms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Form deleted' },
        },
      },
    },
    '/forms/{id}/populate': {
      post: {
        summary: 'Auto-populate form',
        tags: ['Forms'],
        description: 'Uses AI to populate form fields from recording analysis',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  recordingId: { type: 'string', description: 'Recording ID to populate from' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Form populated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    data: { type: 'object' },
                    fieldsPopulated: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    schemas: {
      CaseType: {
        type: 'string',
        enum: ['PATENT', 'TRADEMARK', 'COPYRIGHT', 'TRADE_SECRET', 'OTHER'],
      },
      CaseStatus: {
        type: 'string',
        enum: ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'PENDING_OFFICE', 'CLOSED', 'ARCHIVED'],
      },
      RecordingStatus: {
        type: 'string',
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      },
      FormType: {
        type: 'string',
        enum: ['PATENT_APPLICATION', 'TRADEMARK_APPLICATION', 'COPYRIGHT_REGISTRATION', 'IDS_FORM', 'OFFICE_ACTION_RESPONSE', 'ASSIGNMENT', 'POWER_OF_ATTORNEY', 'OTHER'],
      },
      FormStatus: {
        type: 'string',
        enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SUBMITTED', 'REJECTED'],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Case: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          caseNumber: { type: 'string' },
          title: { type: 'string' },
          type: { $ref: '#/components/schemas/CaseType' },
          status: { $ref: '#/components/schemas/CaseStatus' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string' },
          description: { type: 'string' },
          filingDeadline: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CaseDetail: {
        allOf: [
          { $ref: '#/components/schemas/Case' },
          {
            type: 'object',
            properties: {
              forms: { type: 'array', items: { $ref: '#/components/schemas/Form' } },
              recordings: { type: 'array', items: { $ref: '#/components/schemas/Recording' } },
              activities: { type: 'array', items: { $ref: '#/components/schemas/Activity' } },
            },
          },
        ],
      },
      CreateCaseRequest: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string' },
          type: { $ref: '#/components/schemas/CaseType' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string', format: 'email' },
          description: { type: 'string' },
          filingDeadline: { type: 'string', format: 'date-time' },
        },
      },
      UpdateCaseRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          status: { $ref: '#/components/schemas/CaseStatus' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string', format: 'email' },
          description: { type: 'string' },
          filingDeadline: { type: 'string', format: 'date-time' },
        },
      },
      Recording: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          duration: { type: 'integer' },
          fileSize: { type: 'integer' },
          status: { $ref: '#/components/schemas/RecordingStatus' },
          transcription: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateRecordingRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          caseId: { type: 'string' },
          duration: { type: 'integer' },
          fileSize: { type: 'integer' },
          mimeType: { type: 'string' },
        },
      },
      Form: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { $ref: '#/components/schemas/FormType' },
          status: { $ref: '#/components/schemas/FormStatus' },
          data: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateFormRequest: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string' },
          type: { $ref: '#/components/schemas/FormType' },
          caseId: { type: 'string' },
          data: { type: 'object' },
          recordingId: { type: 'string' },
        },
      },
      UpdateFormRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          data: { type: 'object' },
          status: { $ref: '#/components/schemas/FormStatus' },
        },
      },
      AnalysisResult: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          analysis: {
            type: 'object',
            properties: {
              inventionDescription: { type: 'string' },
              inventors: { type: 'array', items: { type: 'string' } },
              keyDates: { type: 'array', items: { type: 'object' } },
              claims: { type: 'array', items: { type: 'string' } },
              technicalDetails: { type: 'string' },
              actionItems: { type: 'array', items: { type: 'string' } },
              suggestedFormType: { $ref: '#/components/schemas/FormType' },
            },
          },
          provider: { type: 'string' },
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
