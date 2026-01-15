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
 * Reference to the placeholder element in the canvas panel
 * Used for position calculations during expand/collapse animations
 * We store the element directly (not a ref) to avoid Recoil freezing issues
 */
export const canvasPlaceholderElementState = atom<HTMLDivElement | null>({
  key: 'canvasPlaceholderElementState',
  default: null,
  // Prevent Recoil from freezing the DOM element
  dangerouslyAllowMutability: true,
});
