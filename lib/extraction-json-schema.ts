/**
 * JSON Schema for Gemini structured output (response_format json_schema). It mirrors the
 * Extraction type; zod (lib/schemas.ts) still validates every reply.
 */
const str = { type: 'string' } as const;
const nullableStr = { type: 'string', nullable: true } as const;

export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: str,
    issuer: nullableStr,
    issuedOn: { ...nullableStr, description: 'YYYY-MM-DD as printed on the notice' },
    summary: str,
    audience: {
      type: 'object',
      properties: {
        all: { type: 'boolean' },
        years: { type: 'array', items: { type: 'string', enum: ['FE', 'SE', 'TE', 'BE'] } },
        branches: { type: 'array', items: str },
        divisions: { type: 'array', items: str },
      },
      required: ['all', 'years', 'branches', 'divisions'],
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          what: str,
          deadline: nullableStr,
          deadlineText: { ...str, description: 'original date wording copied verbatim, or empty' },
          location: nullableStr,
          requiredDocs: { type: 'array', items: str },
          fee: nullableStr,
          needsReview: { type: 'boolean' },
        },
        required: ['what', 'deadline', 'deadlineText', 'location', 'requiredDocs', 'fee', 'needsReview'],
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: str,
          start: nullableStr,
          end: nullableStr,
          dateText: { ...str, description: 'original date/time wording copied verbatim' },
          venue: nullableStr,
          needsReview: { type: 'boolean' },
        },
        required: ['title', 'start', 'end', 'dateText', 'venue', 'needsReview'],
      },
    },
    language: str,
  },
  required: ['title', 'issuer', 'issuedOn', 'summary', 'audience', 'actions', 'events', 'language'],
} as const;
