import { atom } from 'recoil';
import type { CanvasDocument } from 'librechat-data-provider';

/**
 * All canvas documents in the current conversation
 * Keyed by document ID
 */
export const canvasDocumentsState = atom<Record<string, CanvasDocument>>({
  key: 'canvasDocumentsState',
  default: {},
});
