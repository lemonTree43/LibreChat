import { z } from 'zod';

const CREATE_CANVAS_DESCRIPTION = `Creates a new editable document that appears in the chat and can be expanded for editing.

When to use \`create_canvas_document\`:
- The user asks you to write, draft, or create a document, essay, article, or any substantial text content
- The user wants content that they can edit and refine
- Creating structured documents like reports, proposals, or formatted content

When NOT to use \`create_canvas_document\`:
- For simple, short responses that don't need editing
- For code snippets (use artifacts instead)
- For quick answers or explanations

The document will appear as an interactive card in the chat that the user can click to expand and edit.`;

const CREATE_CONTENT_DESCRIPTION = `The document content as HTML. Use proper HTML formatting:
- Headings: <h1>, <h2>, <h3>
- Bold: <strong>text</strong>
- Italic: <em>text</em>
- Underline: <u>text</u>
- Paragraphs: <p>text</p>
- Lists: <ul><li>item</li></ul> or <ol><li>item</li></ol>
- Colors: <span style="color:#hex">text</span>
- Highlights: <mark style="background-color:#hex">text</mark>
- Alignment: <p style="text-align:center">text</p>`;

const EDIT_CANVAS_DESCRIPTION = `Edits an existing canvas document with surgical operations.

Operations:
- \`rewrite\`: Replace entire content (use sparingly, only for major restructuring)
- \`replace\`: Find text and replace (can use HTML in replacement)
- \`format\`: Apply formatting without changing text (bold, italic, setColor, setHighlight, setTextAlign)

Guidelines:
1. Use \`replace\` for small text changes
2. Use \`format\` for styling without changing text
3. Use \`rewrite\` only for major restructuring
4. Always output valid HTML`;

const formatCommandSchema = z.enum([
  'bold',
  'italic',
  'underline',
  'setColor',
  'setHighlight',
  'setTextAlign',
]);

const operationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('rewrite'),
    content: z.string().describe('The new complete HTML content for the document'),
  }),
  z.object({
    type: z.literal('replace'),
    search: z.string().describe('The text to find in the document'),
    replace: z.string().describe('The text to replace it with (can include HTML)'),
  }),
  z.object({
    type: z.literal('format'),
    search: z.string().describe('The text to format'),
    command: formatCommandSchema.describe('The formatting command to apply'),
    value: z
      .string()
      .optional()
      .describe('Value for the command (e.g., color hex code, alignment)'),
  }),
]);

export const canvasToolkit = {
  create_canvas_document: {
    name: 'create_canvas_document' as const,
    description: CREATE_CANVAS_DESCRIPTION,
    schema: z.object({
      title: z.string().describe('The document title'),
      content: z.string().describe(CREATE_CONTENT_DESCRIPTION),
    }),
    responseFormat: 'content' as const,
  },
  edit_canvas_document: {
    name: 'edit_canvas_document' as const,
    description: EDIT_CANVAS_DESCRIPTION,
    schema: z.object({
      documentId: z.string().describe('The ID of the document to edit'),
      operations: z
        .array(operationSchema)
        .describe('Array of operations to apply to the document'),
    }),
    responseFormat: 'content' as const,
  },
} as const;

export type CanvasToolkit = typeof canvasToolkit;
