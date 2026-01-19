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

  // Track the target rect captured once for the expand animation
  const expandTargetRectRef = useRef<DOMRect | null>(null);

  // Track whether the portal has rendered its initial frame at start position
  const [hasRenderedInitialFrame, setHasRenderedInitialFrame] = useState(false);

  // Track container height for smooth transitions
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const [cardHeight, setCardHeight] = useState<number>(0);

  // Track the predicted collapse target position (where ghost will be after panel expands)
  const collapseTargetRectRef = useRef<DOMRect | null>(null);

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

      console.log('[EXPAND] handleExpand clicked, capturing startRect:', {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });

      // Store the start rect for expand animation
      expandStartRectRef.current = rect;
      setCollapseStartRect(null);
      setCardHeight(currentHeight);
      setContainerHeight(currentHeight);

      // Reset initial frame flag
      setHasRenderedInitialFrame(false);

      // Start animation
      requestAnimationFrame(() => {
        console.log('[EXPAND] Setting phase to expanding');
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

  // Calculate predicted collapse target position
  // Called when collapse starts to predict where ghost will be after panel expands
  const calculateCollapseTargetPosition = useCallback(() => {
    if (!ghostRef.current) return;

    const currentGhostRect = ghostRef.current.getBoundingClientRect();
    setInlineRect(currentGhostRect);

    // Find the messages panel to calculate width change
    const messagesPanel = document.getElementById('messages-view');
    if (messagesPanel) {
      const panelRect = messagesPanel.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // When canvas collapses, messages panel expands to ~97% of viewport (minus nav ~3%)
      const navSize = 0.03; // 3% for nav when collapsed
      const expandedPanelWidth = viewportWidth * (1 - navSize);

      console.log('[COLLAPSE DEBUG] Panel measurements:', {
        currentPanelLeft: panelRect.left,
        currentPanelWidth: panelRect.width,
        viewportWidth,
        expandedPanelWidth,
      });

      console.log('[COLLAPSE DEBUG] Ghost measurements:', {
        ghostLeft: currentGhostRect.left,
        ghostWidth: currentGhostRect.width,
        ghostTop: currentGhostRect.top,
        ghostHeight: currentGhostRect.height,
      });

      // The content area has padding on both sides
      // We need to find the content container's padding/margin structure
      // The ghost is NOT positioned by percentage - it's inside a centered content area

      // Calculate the right edge distance from panel right (this includes scrollbar, padding)
      const ghostRightEdge = currentGhostRect.left + currentGhostRect.width;
      const panelRightEdge = panelRect.left + panelRect.width;
      const rightPadding = panelRightEdge - ghostRightEdge;

      // The left padding from panel to ghost
      const leftPadding = currentGhostRect.left - panelRect.left;

      console.log('[COLLAPSE DEBUG] Padding analysis:', {
        leftPadding,
        rightPadding,
        totalPadding: leftPadding + rightPadding,
        contentWidth: panelRect.width - leftPadding - rightPadding,
      });

      // Calculate expanded panel width properly:
      // The sidebar (panelRect.left) stays fixed
      // When canvas collapses, the messages panel expands to fill that space
      // Expanded width = viewport - sidebar - collapsed_nav_width
      // The nav panel collapses to essentially 0 (just the resize handle)

      const sidebarWidth = panelRect.left; // The sidebar is to the left of the panel
      const collapsedNavWidth = 0; // Nav collapses to ~0 when canvas is gone
      const predictedExpandedPanelWidth = viewportWidth - sidebarWidth - collapsedNavWidth;

      console.log('[COLLAPSE DEBUG] Panel expansion calculation:', {
        sidebarWidth,
        collapsedNavWidth,
        predictedExpandedPanelWidth,
      });

      // The ghost is centered in the panel
      const panelCenter = panelRect.left + panelRect.width / 2;
      const ghostCenter = currentGhostRect.left + currentGhostRect.width / 2;
      const offsetFromCenter = ghostCenter - panelCenter;

      console.log('[COLLAPSE DEBUG] Center analysis:', {
        panelCenter,
        ghostCenter,
        offsetFromCenter,
      });

      // Calculate the expanded panel center
      const expandedPanelCenter = panelRect.left + predictedExpandedPanelWidth / 2;

      // The ghost stays centered (offset from center should remain ~0)
      const predictedGhostCenter = expandedPanelCenter + offsetFromCenter;
      const predictedWidth = currentGhostRect.width + 64; // Based on actual observation
      const predictedLeft = predictedGhostCenter - predictedWidth / 2;

      console.log('[COLLAPSE DEBUG] Predicted values:', {
        expandedPanelCenter,
        predictedGhostCenter,
        predictedLeft,
        predictedWidth,
      });

      // Create a predicted rect
      collapseTargetRectRef.current = {
        top: currentGhostRect.top,
        left: predictedLeft,
        width: predictedWidth,
        height: currentGhostRect.height,
        bottom: currentGhostRect.bottom,
        right: predictedLeft + predictedWidth,
        x: predictedLeft,
        y: currentGhostRect.top,
        toJSON: () => ({}),
      } as DOMRect;

      console.log('[COLLAPSE] Final predicted target:', {
        top: currentGhostRect.top,
        left: predictedLeft,
        width: predictedWidth,
        height: currentGhostRect.height,
      });

      // Log actual position after animation for comparison
      setTimeout(() => {
        if (ghostRef.current) {
          const actualRect = ghostRef.current.getBoundingClientRect();
          const actualPanelRect = messagesPanel.getBoundingClientRect();
          console.log('[COLLAPSE DEBUG] ACTUAL final position (after animation):', {
            actualLeft: actualRect.left,
            actualWidth: actualRect.width,
            actualTop: actualRect.top,
            diffLeft: actualRect.left - predictedLeft,
            diffWidth: actualRect.width - predictedWidth,
          });
          console.log('[COLLAPSE DEBUG] ACTUAL panel after animation:', {
            panelLeft: actualPanelRect.left,
            panelWidth: actualPanelRect.width,
            panelCenter: actualPanelRect.left + actualPanelRect.width / 2,
            ghostCenter: actualRect.left + actualRect.width / 2,
            ghostLeftPadding: actualRect.left - actualPanelRect.left,
          });
        }
      }, ANIMATION_DURATION + 50);
    } else {
      console.log('[COLLAPSE DEBUG] Messages panel not found!');
      // Fallback if we can't find the panel
      collapseTargetRectRef.current = currentGhostRect;
    }
  }, [setInlineRect]);

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

      // Calculate predicted target position
      calculateCollapseTargetPosition();

      // Reset initial frame flag for collapse animation
      setHasRenderedInitialFrame(false);

      // Start collapsing phase - container height will animate after initial frame renders
      setAnimationPhase('collapsing');
    },
    [setAnimationPhase, isThisExpanded, targetRect, collapseStartRect, setCollapseStartRect, calculateCollapseTargetPosition],
  );

  // When collapse is triggered from CanvasPlaceholderPanel, we need to calculate the target position
  // This effect runs when animation phase changes to collapsing
  useEffect(() => {
    if (animationPhase === 'collapsing' && isThisExpanded && !collapseTargetRectRef.current) {
      calculateCollapseTargetPosition();
    }
  }, [animationPhase, isThisExpanded, calculateCollapseTargetPosition]);

  // After portal renders at start position, trigger animation to target on next frame
  useEffect(() => {
    if (!hasRenderedInitialFrame && isThisExpanded && animationPhase === 'expanding') {
      // Wait for targetRect to be available (now calculated, so immediately correct)
      if (!targetRect) return;

      // Capture the target rect (calculated dimensions are immediately correct)
      if (!expandTargetRectRef.current) {
        expandTargetRectRef.current = targetRect;
        console.log('[EXPAND] Captured targetRect:', {
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        });
      }

      // Use double rAF to ensure the start position is painted before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('[EXPAND] Setting hasRenderedInitialFrame=true');
          setHasRenderedInitialFrame(true);
        });
      });
    }

    if (!hasRenderedInitialFrame && isThisExpanded && animationPhase === 'collapsing') {
      // For collapsing, we need collapseStartRect (captured when collapse was triggered)
      if (!collapseStartRect) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasRenderedInitialFrame(true);
          // Animate container height back to full card height
          setContainerHeight(cardHeight);
        });
      });
    }
  }, [hasRenderedInitialFrame, isThisExpanded, animationPhase, cardHeight, targetRect, collapseStartRect]);

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
        expandTargetRectRef.current = null;
        collapseTargetRectRef.current = null;
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
      const capturedTarget = expandTargetRectRef.current;

      if (hasRenderedInitialFrame && capturedTarget) {
        console.log('[STYLE] expanding -> animating to capturedTarget:', {
          left: capturedTarget.left,
          width: capturedTarget.width,
          height: capturedTarget.height,
        });
        // Animate from start position to captured target position
        return {
          position: 'fixed',
          top: capturedTarget.top,
          left: capturedTarget.left,
          width: capturedTarget.width,
          height: capturedTarget.height,
          zIndex: 9999,
          transition: `all ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        };
      } else if (startRect) {
        console.log('[STYLE] expanding -> at startRect (no transition):', {
          left: startRect.left,
          width: startRect.width,
          height: startRect.height,
        });
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
      // Use the predicted target position (calculated when collapse started)
      const predictedTarget = collapseTargetRectRef.current;

      if (hasRenderedInitialFrame && predictedTarget) {
        // Animate to predicted inline position
        return {
          position: 'fixed',
          top: predictedTarget.top,
          left: predictedTarget.left,
          width: predictedTarget.width,
          height: predictedTarget.height,
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
    <div style={{ margin: '1rem 0' }}>
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
