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

/**
 * ID of the currently expanded canvas document
 * null means no canvas is expanded
 */
export const expandedCanvasIdState = atom<string | null>({
  key: 'expandedCanvasIdState',
  default: null,
});

/**
 * Target rectangle for the expanded canvas panel
 * Used for animating the card to/from the expanded position
 */
export const canvasTargetRectState = atom<DOMRect | null>({
  key: 'canvasTargetRectState',
  default: null,
  dangerouslyAllowMutability: true,
});
