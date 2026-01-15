import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CanvasDocument } from 'librechat-data-provider';
import store from '~/store';

interface CanvasDocumentViewProps {
  document: CanvasDocument;
}

type AnimationPhase = 'idle' | 'expanding' | 'expanded' | 'collapsing';

interface AnimationState {
  phase: AnimationPhase;
  startRect: DOMRect | null;
  currentTargetRect: DOMRect | null;
}

// Height of the small placeholder when expanded
const PLACEHOLDER_HEIGHT = 56; // p-4 (32px) + text height (~24px)

function CanvasDocumentView({ document: canvasDoc }: CanvasDocumentViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useRecoilState(store.expandedCanvasIdState);
  const targetRect = useRecoilValue(store.canvasTargetRectState);

  const isThisExpanded = expandedId === canvasDoc.id;
  const [animation, setAnimation] = useState<AnimationState>({
    phase: 'idle',
    startRect: null,
    currentTargetRect: null,
  });

  // Track container height for smooth transitions
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const [cardHeight, setCardHeight] = useState<number>(0);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = canvasDoc.content.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(text);
    },
    [canvasDoc.content],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const blob = new Blob([canvasDoc.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${canvasDoc.title}.html`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [canvasDoc.content, canvasDoc.title],
  );

  // Measure card height on mount and content changes
  useEffect(() => {
    if (measureRef.current && animation.phase === 'idle') {
      const height = measureRef.current.getBoundingClientRect().height;
      setCardHeight(height);
      setContainerHeight('auto');
    }
  }, [animation.phase, canvasDoc.content]);

  // Handle expand animation
  const handleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!cardRef.current || !measureRef.current) return;

      const startRect = measureRef.current.getBoundingClientRect();
      const currentHeight = startRect.height;

      // Set explicit height before animating to placeholder height
      setCardHeight(currentHeight);
      setContainerHeight(currentHeight);

      // Start animation after a frame so height is set
      requestAnimationFrame(() => {
        setAnimation({
          phase: 'expanding',
          startRect,
          currentTargetRect: null,
        });
        setExpandedId(canvasDoc.id);

        // Animate container to placeholder height
        requestAnimationFrame(() => {
          setContainerHeight(PLACEHOLDER_HEIGHT);
        });
      });
    },
    [canvasDoc.id, setExpandedId],
  );

  // Handle collapse
  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Animate container back to full card height
      setContainerHeight(cardHeight);

      setAnimation((prev) => ({
        phase: 'collapsing',
        startRect: prev.startRect,
        currentTargetRect: prev.currentTargetRect,
      }));
    },
    [cardHeight],
  );

  // Watch for target rect to start expand animation
  useEffect(() => {
    if (animation.phase === 'expanding' && targetRect && isThisExpanded && !animation.currentTargetRect) {
      // Small delay to ensure the portal card renders at start position first
      const timer = setTimeout(() => {
        setAnimation((prev) => ({
          ...prev,
          currentTargetRect: targetRect,
        }));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [animation.phase, animation.currentTargetRect, targetRect, isThisExpanded]);

  // Keep target rect updated when expanded
  useEffect(() => {
    if ((animation.phase === 'expanded' || animation.phase === 'expanding') && targetRect && isThisExpanded) {
      setAnimation((prev) => ({
        ...prev,
        currentTargetRect: targetRect,
      }));
    }
  }, [targetRect, animation.phase, isThisExpanded]);

  // Handle expand animation end
  useEffect(() => {
    if (animation.phase === 'expanding' && animation.currentTargetRect) {
      const timer = setTimeout(() => {
        setAnimation((prev) => ({
          ...prev,
          phase: 'expanded',
        }));
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [animation.phase, animation.currentTargetRect]);

  // Handle collapse animation
  useEffect(() => {
    if (animation.phase === 'collapsing') {
      // Get the measurement element position to animate to
      const getMeasureRect = () => {
        if (measureRef.current) {
          return measureRef.current.getBoundingClientRect();
        }
        return null;
      };

      // Wait a frame for measurement element to render, then animate
      const timer = setTimeout(() => {
        const endRect = getMeasureRect();
        if (endRect) {
          // After animation completes, reset everything
          setTimeout(() => {
            setExpandedId(null);
            setAnimation({ phase: 'idle', startRect: null, currentTargetRect: null });
            setContainerHeight('auto');
          }, 350);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [animation.phase, setExpandedId]);

  // Get the collapse target position from the measurement element (actual card size)
  const getCollapseTargetRect = useCallback(() => {
    if (measureRef.current) {
      return measureRef.current.getBoundingClientRect();
    }
    return null;
  }, []);

  // Calculate current position for the portal card
  const getPortalStyle = (): React.CSSProperties => {
    if (animation.phase === 'expanding') {
      if (animation.currentTargetRect) {
        // Animate to expanded position
        return {
          position: 'fixed',
          top: animation.currentTargetRect.top,
          left: animation.currentTargetRect.left,
          width: animation.currentTargetRect.width,
          height: animation.currentTargetRect.height,
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      } else if (animation.startRect) {
        // Start at inline position
        return {
          position: 'fixed',
          top: animation.startRect.top,
          left: animation.startRect.left,
          width: animation.startRect.width,
          height: animation.startRect.height,
          zIndex: 9999,
          transition: 'none',
        };
      }
    }

    if (animation.phase === 'expanded' && animation.currentTargetRect) {
      // Stay at expanded position
      return {
        position: 'fixed',
        top: animation.currentTargetRect.top,
        left: animation.currentTargetRect.left,
        width: animation.currentTargetRect.width,
        height: animation.currentTargetRect.height,
        zIndex: 9999,
        transition: 'all 0.15s ease-out', // Quick transition for resize
      };
    }

    if (animation.phase === 'collapsing') {
      const collapseTarget = getCollapseTargetRect();
      if (collapseTarget) {
        // Animate back to inline position
        return {
          position: 'fixed',
          top: collapseTarget.top,
          left: collapseTarget.left,
          width: collapseTarget.width,
          height: collapseTarget.height,
          zIndex: 9999,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      } else if (animation.currentTargetRect) {
        // Start at expanded position before we have collapse target
        return {
          position: 'fixed',
          top: animation.currentTargetRect.top,
          left: animation.currentTargetRect.left,
          width: animation.currentTargetRect.width,
          height: animation.currentTargetRect.height,
          zIndex: 9999,
          transition: 'none',
        };
      }
    }

    return {};
  };

  // Card content component
  const CardContent = ({ isExpandedView = false }: { isExpandedView?: boolean }) => (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: '#181818',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        height: isExpandedView ? '100%' : 'auto',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <span className="truncate text-sm font-medium text-text-primary">
          {canvasDoc.title}
        </span>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Download
          </button>
          <button
            type="button"
            onClick={isExpandedView ? handleCollapse : handleExpand}
            disabled={!isExpandedView && expandedId !== null}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            aria-label={isExpandedView ? 'Collapse canvas' : 'Expand canvas'}
          >
            {isExpandedView ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
      <div className={`canvas-content px-6 pb-6 ${isExpandedView ? 'flex-1 overflow-auto' : ''}`}>
        <div
          className={`prose prose-sm dark:prose-invert max-w-none text-text-primary ${!isExpandedView ? 'line-clamp-10' : ''}`}
          dangerouslySetInnerHTML={{ __html: canvasDoc.content }}
        />
      </div>
    </div>
  );

  // Determine what to show
  const showPortalCard = animation.phase !== 'idle';
  const isExpandedOrAnimating = isThisExpanded || animation.phase !== 'idle';

  // Container style with animated height
  const containerStyle: React.CSSProperties = {
    height: containerHeight === 'auto' ? 'auto' : containerHeight,
    transition: isExpandedOrAnimating ? 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <div ref={cardRef} style={containerStyle}>
        {/*
          Hidden measurement element - always renders the full card for size calculation.
          Used to get the correct target dimensions for collapse animation.
          Position absolute so it doesn't affect container height during animation.
        */}
        <div
          ref={measureRef}
          style={{
            visibility: isExpandedOrAnimating ? 'hidden' : 'visible',
            position: isExpandedOrAnimating ? 'absolute' : 'relative',
            pointerEvents: isExpandedOrAnimating ? 'none' : 'auto',
            width: '100%',
            top: 0,
            left: 0,
          }}
        >
          <CardContent />
        </div>

        {/* Clickable placeholder shown when expanded */}
        {isExpandedOrAnimating && (
          <div
            className="cursor-pointer rounded-3xl border border-dashed border-border-medium p-4"
            style={{ backgroundColor: 'rgba(24, 24, 24, 0.3)' }}
            onClick={handleCollapse}
          >
            <span className="text-sm text-text-secondary">
              {canvasDoc.title} - Click to collapse
            </span>
          </div>
        )}
      </div>

      {/* Portal card for animation and expanded state */}
      {showPortalCard &&
        createPortal(
          <div style={getPortalStyle()}>
            <CardContent isExpandedView={animation.phase !== 'idle'} />
          </div>,
          document.body,
        )}
    </div>
  );
}

export default memo(CanvasDocumentView);
