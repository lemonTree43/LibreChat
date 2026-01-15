import type { CanvasOperation, FormatCommand } from 'librechat-data-provider';

/**
 * Apply formatting to text by wrapping it in the appropriate HTML tags
 */
function applyFormat(html: string, search: string, command: FormatCommand, value?: string): string {
  const wrappers: Record<FormatCommand, string> = {
    bold: `<strong>${search}</strong>`,
    italic: `<em>${search}</em>`,
    underline: `<u>${search}</u>`,
    setColor: `<span style="color:${value}">${search}</span>`,
    setHighlight: `<mark style="background-color:${value}">${search}</mark>`,
    setTextAlign: search, // Text alignment is handled differently - usually at paragraph level
  };

  if (command === 'setTextAlign' && value) {
    // For text alignment, we need to wrap in a paragraph with style
    return html.replace(search, `<p style="text-align:${value}">${search}</p>`);
  }

  return html.replace(search, wrappers[command] || search);
}

/**
 * Execute a list of canvas operations on HTML content
 * @param html - The original HTML content
 * @param operations - Array of operations to apply
 * @returns The modified HTML content
 */
export function executeOperations(html: string, operations: CanvasOperation[]): string {
  let result = html;

  for (const op of operations) {
    if (op.type === 'rewrite') {
      result = op.content;
    } else if (op.type === 'replace') {
      result = result.replace(op.search, op.replace);
    } else if (op.type === 'format') {
      result = applyFormat(result, op.search, op.command, op.value);
    }
  }

  return result;
}

/**
 * Strip HTML tags from content to get plain text
 * @param html - HTML content
 * @returns Plain text without HTML tags
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Get a preview of HTML content as plain text
 * @param html - HTML content
 * @param maxLength - Maximum preview length
 * @returns Plain text preview
 */
export function getContentPreview(html: string, maxLength: number = 100): string {
  const plainText = stripHtmlTags(html);
  return truncateText(plainText, maxLength);
}

export default {
  executeOperations,
  applyFormat,
  stripHtmlTags,
  truncateText,
  getContentPreview,
};
