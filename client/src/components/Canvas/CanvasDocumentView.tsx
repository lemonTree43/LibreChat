import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import type { CanvasDocument } from 'librechat-data-provider';
import CanvasCardContent from './CanvasCardContent';
import store from '~/store';

interface CanvasDocumentViewProps {
  document: CanvasDocument;
}

// Height of the small placeholder when expanded
const PLACEHOLDER_HEIGHT = 56;
const ANIMATION_DURATION = 300;

function CanvasDocumentView({ document: canvasDoc }: CanvasDocumentViewProps) {
  const ghostRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useRecoilState(store.expandedCanvasIdState);
  const [animationPhase, setAnimationPhase] = useRecoilState(store.canvasAnimationPhaseState);
  const targetRect = useRecoilValue(store.canvasTargetRectState);
  const collapseStartRect = useRecoilValue(store.canvasCollapseStartRectState);
  const setInlineRect = useSetRecoilState(store.canvasInlineRectState);
  const setCollapseStartRect = useSetRecoilState(store.canvasCollapseStartRectState);

  const isThisExpanded = expandedId === canvasDoc.id;

  // Track the starting rect for expand animation (inline position)
  const expandStartRectRef = useRef<DOMRect | null>(null);

  // Track whether the portal has rendered its initial frame at start position
  const [hasRenderedInitialFrame, setHasRenderedInitialFrame] = useState(false);

  // Track container height for smooth transitions
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const [cardHeight, setCardHeight] = useState<number>(0);

  // Update inline rect when ghost position changes
  const updateInlineRect = useCallback(() => {
    if (ghostRef.current && isThisExpanded) {
      const rect = ghostRef.current.getBoundingClientRect();
      setInlineRect(rect);
    }
  }, [isThisExpanded, setInlineRect]);

  // Observe ghost element for position changes (needed for collapse animation target)
  useEffect(() => {
    if (!ghostRef.current || !isThisExpanded) return;

    updateInlineRect();

    const observer = new ResizeObserver(updateInlineRect);
    observer.observe(ghostRef.current);

    const scrollHandler = () => updateInlineRect();
    window.addEventListener('scroll', scrollHandler, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [isThisExpanded, updateInlineRect]);

  // Measure card height on mount and content changes (only when this card is idle)
  useEffect(() => {
    if (ghostRef.current && !isThisExpanded && animationPhase === 'idle') {
      const height = ghostRef.current.getBoundingClientRect().height;
      setCardHeight(height);
      setContainerHeight('auto');
    }
  }, [animationPhase, canvasDoc.content, isThisExpanded]);

  // Handle expand
  const handleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!ghostRef.current) return;

      const rect = ghostRef.current.getBoundingClientRect();
      const currentHeight = rect.height;

      // Store the start rect for expand animation
      expandStartRectRef.current = rect;
      setCollapseStartRect(null);
      setCardHeight(currentHeight);
      setContainerHeight(currentHeight);

      // Reset initial frame flag
      setHasRenderedInitialFrame(false);

      // Start animation
      requestAnimationFrame(() => {
        setAnimationPhase('expanding');
        setExpandedId(canvasDoc.id);

        // Animate container to placeholder height
        requestAnimationFrame(() => {
          setContainerHeight(PLACEHOLDER_HEIGHT);
        });
      });
    },
    [canvasDoc.id, setExpandedId, setAnimationPhase, setCollapseStartRect],
  );

  // Handle collapse - triggered from inline placeholder click
  // Note: When collapse is triggered from CanvasPlaceholderPanel, it captures the rect there
  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isThisExpanded) return;

      // If collapse is triggered from inline placeholder, capture targetRect
      // (CanvasPlaceholderPanel already captures it when triggered from there)
      if (!collapseStartRect && targetRect) {
        setCollapseStartRect(targetRect);
      }

      // Get current inline ghost position for animation target
      if (ghostRef.current) {
        const rect = ghostRef.current.getBoundingClientRect();
        setInlineRect(rect);
      }

      // Reset initial frame flag for collapse animation
      setHasRenderedInitialFrame(false);

      // Start collapsing phase - container height will animate after initial frame renders
      setAnimationPhase('collapsing');
    },
    [setAnimationPhase, setInlineRect, isThisExpanded, targetRect, collapseStartRect, setCollapseStartRect],
  );

  // After portal renders at start position, trigger animation to target on next frame
  useEffect(() => {
    if (!hasRenderedInitialFrame && isThisExpanded && (animationPhase === 'expanding' || animationPhase === 'collapsing')) {
      // Use double rAF to ensure the browser has painted the initial position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasRenderedInitialFrame(true);
          // When collapsing, animate container height back to full card height
          if (animationPhase === 'collapsing') {
            setContainerHeight(cardHeight);
          }
        });
      });
    }
  }, [hasRenderedInitialFrame, isThisExpanded, animationPhase, cardHeight]);

  // Watch for expand animation completion
  useEffect(() => {
    if (animationPhase === 'expanding' && hasRenderedInitialFrame && targetRect && isThisExpanded) {
      const timer = setTimeout(() => {
        setAnimationPhase('expanded');
        // Reset for next animation (collapse)
        setHasRenderedInitialFrame(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [animationPhase, hasRenderedInitialFrame, targetRect, isThisExpanded, setAnimationPhase]);

  // Handle collapse animation completion
  useEffect(() => {
    if (animationPhase === 'collapsing' && hasRenderedInitialFrame && isThisExpanded) {
      const timer = setTimeout(() => {
        setExpandedId(null);
        setAnimationPhase('idle');
        setContainerHeight('auto');
        expandStartRectRef.current = null;
        setCollapseStartRect(null);
        setHasRenderedInitialFrame(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [animationPhase, hasRenderedInitialFrame, isThisExpanded, setExpandedId, setAnimationPhase, setCollapseStartRect]);

  // Calculate portal card style based on animation phase
  const getPortalStyle = (): React.CSSProperties => {
    if (animationPhase === 'expanding' && isThisExpanded) {
      const startRect = expandStartRectRef.current;

      if (hasRenderedInitialFrame && targetRect) {
        // Animate to expanded position
        return {
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          zIndex: 9999,
          transition: `all ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        };
      } else if (startRect) {
        // Start at inline position (no transition)
        return {
          position: 'fixed',
          top: startRect.top,
          left: startRect.left,
          width: startRect.width,
          height: startRect.height,
          zIndex: 9999,
          transition: 'none',
        };
      }
    }

    if (animationPhase === 'collapsing' && isThisExpanded) {
      const inlineRect = ghostRef.current?.getBoundingClientRect();

      if (hasRenderedInitialFrame && inlineRect) {
        // Animate to inline position
        return {
          position: 'fixed',
          top: inlineRect.top,
          left: inlineRect.left,
          width: inlineRect.width,
          height: inlineRect.height,
          zIndex: 9999,
          transition: `all ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        };
      } else if (collapseStartRect) {
        // Start at expanded position (no transition)
        return {
          position: 'fixed',
          top: collapseStartRect.top,
          left: collapseStartRect.left,
          width: collapseStartRect.width,
          height: collapseStartRect.height,
          zIndex: 9999,
          transition: 'none',
        };
      }
    }

    return {};
  };

  // Determine what to render
  const isThisAnimating =
    isThisExpanded && (animationPhase === 'expanding' || animationPhase === 'collapsing');

  const showInlineCard = !isThisExpanded;
  const showPortalCard = isThisAnimating;
  const showPlaceholder = isThisExpanded;

  const containerStyle: React.CSSProperties = {
    height: isThisExpanded ? (containerHeight === 'auto' ? 'auto' : containerHeight) : 'auto',
    transition: isThisExpanded
      ? `height ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none',
    overflow: isThisExpanded ? 'hidden' : 'visible',
    position: 'relative',
  };

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <div style={containerStyle}>
        {/* Ghost element - always present for measurement, visible when not expanded */}
        <div
          ref={ghostRef}
          style={{
            visibility: showInlineCard ? 'visible' : 'hidden',
            position: showInlineCard ? 'relative' : 'absolute',
            pointerEvents: showInlineCard ? 'auto' : 'none',
            width: '100%',
            top: 0,
            left: 0,
          }}
        >
          <CanvasCardContent
            document={canvasDoc}
            isExpandedView={false}
            onExpand={handleExpand}
            expandDisabled={expandedId !== null}
          />
        </div>

        {/* Clickable placeholder shown when THIS card is expanded */}
        {showPlaceholder && (
          <div
            className="cursor-pointer rounded-3xl border border-dashed border-border-medium p-4"
            style={{ backgroundColor: 'rgba(24, 24, 24, 0.3)' }}
            onClick={handleCollapse}
          >
            <span className="text-sm text-text-secondary">{canvasDoc.title} - Click to collapse</span>
          </div>
        )}
      </div>

      {/* Portal card for animation only */}
      {showPortalCard &&
        createPortal(
          <div style={getPortalStyle()}>
            <CanvasCardContent
              document={canvasDoc}
              isExpandedView={true}
              onCollapse={handleCollapse}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

export default memo(CanvasDocumentView);
