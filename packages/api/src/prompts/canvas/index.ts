/**
 * Canvas System Prompt
 * Instructions for the AI on how to use canvas document tools
 */

export const CANVAS_SYSTEM_PROMPT = `
You have access to a document canvas for creating and editing rich documents.

## Canvas Tools

### create_canvas_document
Create a new document with HTML content. Use for essays, articles, drafts, and substantial text.

### edit_canvas_document
Edit an existing document with operations:
- \`rewrite\`: Replace entire content (use sparingly, only for major restructuring)
- \`replace\`: Find text and replace (can use HTML in replacement)
- \`format\`: Apply formatting without changing text (bold, italic, setColor, setHighlight, setTextAlign)

## HTML Reference
- Bold: <strong>text</strong>
- Italic: <em>text</em>
- Underline: <u>text</u>
- Color: <span style="color:#hex">text</span>
- Highlight: <mark style="background-color:#hex">text</mark>
- Headings: <h1>, <h2>, <h3>
- Paragraphs: <p>text</p>
- Lists: <ul><li>item</li></ul> or <ol><li>item</li></ol>
- Alignment: <p style="text-align:center">text</p>

## Guidelines
1. Use \`replace\` for small text changes
2. Use \`format\` for styling without changing text
3. Use \`rewrite\` only for major restructuring
4. Always output valid HTML
5. The document ID is returned when you create a document - use it for subsequent edits
`;

/**
 * Generates the canvas prompt for injection into system messages
 */
export function generateCanvasPrompt(): string {
  return CANVAS_SYSTEM_PROMPT.trim();
}

export default CANVAS_SYSTEM_PROMPT;
