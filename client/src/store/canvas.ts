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
 * Animation phase for the currently expanding/collapsing canvas
 * - idle: Card is inline in chat, rendered in normal DOM flow
 * - expanding: Portal card animates from inline ghost to expanded ghost
 * - expanded: Animation done, card is rendered inside CanvasPlaceholderPanel DOM
 * - collapsing: Portal card animates from expanded ghost to inline ghost
 */
export type CanvasAnimationPhase = 'idle' | 'expanding' | 'expanded' | 'collapsing';

export const canvasAnimationPhaseState = atom<CanvasAnimationPhase>({
  key: 'canvasAnimationPhaseState',
  default: 'idle',
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

/**
 * Inline ghost rectangle (position of the card in the chat scroll view)
 * Used for animating the card to/from the inline position
 */
export const canvasInlineRectState = atom<DOMRect | null>({
  key: 'canvasInlineRectState',
  default: null,
  dangerouslyAllowMutability: true,
});

/**
 * Collapse start rectangle (position of the expanded panel when collapse starts)
 * Captured at the moment collapse is triggered so we can animate from it
 */
export const canvasCollapseStartRectState = atom<DOMRect | null>({
  key: 'canvasCollapseStartRectState',
  default: null,
  dangerouslyAllowMutability: true,
});
