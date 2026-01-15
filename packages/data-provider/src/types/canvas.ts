/**
 * Canvas Document Types
 * Types for the Canvas feature - WYSIWYG document editing in chat
 */

export interface CanvasDocument {
  id: string;
  conversationId: string;
  messageId: string;
  title: string;
  content: string; // HTML content
  createdAt?: Date;
  updatedAt?: Date;
}

export type FormatCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'setColor'
  | 'setHighlight'
  | 'setTextAlign';

export type CanvasOperation =
  | { type: 'rewrite'; content: string }
  | { type: 'replace'; search: string; replace: string }
  | { type: 'format'; search: string; command: FormatCommand; value?: string };

export interface CreateCanvasDocumentParams {
  title: string;
  content: string;
}

export interface EditCanvasDocumentParams {
  documentId: string;
  operations: CanvasOperation[];
}

export interface CanvasDocumentResponse {
  id: string;
  title: string;
  content: string;
  conversationId: string;
  messageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasDocumentsResponse {
  documents: CanvasDocumentResponse[];
}
