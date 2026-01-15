import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CanvasDocument } from 'librechat-data-provider';
import store from '~/store';

interface CanvasDocumentViewProps {
  document: CanvasDocument;
}

function CanvasDocumentView({ document: canvasDoc }: CanvasDocumentViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inlineSpacerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useRecoilState(store.expandedCanvasIdState);
  const placeholderElement = useRecoilValue(store.canvasPlaceholderElementState);

  const isExpanded = expandedId === canvasDoc.id;
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties | null>(null);

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

  // Calculate target position from placeholder - using a ref to avoid stale closure
  const placeholderElementRef = useRef<HTMLDivElement | null>(null);
  placeholderElementRef.current = placeholderElement;

  const getTargetPosition = useCallback(() => {
    const element = placeholderElementRef.current;
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      zIndex: 9999,
    };
  }, []);

  // Sync position on resize (real-time)
  useEffect(() => {
    if (!isExpanded || !placeholderElement) {
      return;
    }

    const updatePosition = () => {
      const targetPos = getTargetPosition();
      if (targetPos) {
        setFixedStyle((prev) => ({
          ...targetPos,
          transition: prev?.transition,
        }));
      }
    };

    // ResizeObserver for panel resize
    const observer = new ResizeObserver(updatePosition);
    observer.observe(placeholderElement);

    // Also listen for window resize
    window.addEventListener('resize', updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [isExpanded, placeholderElement, getTargetPosition]);

  // Handle expand click
  const handleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!cardRef.current) {
        return;
      }

      // Capture current inline position
      const inlineRect = cardRef.current.getBoundingClientRect();

      // Calculate target position immediately (approximate - will be refined)
      // Use viewport-based calculation as initial target
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const targetWidth = viewportWidth * 0.48; // ~48% of viewport
      const targetLeft = viewportWidth * 0.5; // Start at middle, will animate to correct position

      // Start at inline position (no visual jump)
      setFixedStyle({
        position: 'fixed',
        top: inlineRect.top,
        left: inlineRect.left,
        width: inlineRect.width,
        height: inlineRect.height,
        zIndex: 9999,
        transition: 'none',
      });

      setExpandedId(canvasDoc.id);

      // Use double RAF to ensure initial position is painted before transition starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Apply transition and animate to approximate position
          setFixedStyle({
            position: 'fixed',
            top: 0,
            left: targetLeft,
            width: targetWidth,
            height: viewportHeight,
            zIndex: 9999,
            transition: 'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
          });

          // After animation completes, sync with actual placeholder position
          setTimeout(() => {
            const targetPos = getTargetPosition();
            if (targetPos) {
              setFixedStyle({
                ...targetPos,
                transition: 'none', // Instant adjustment
              });
            }
          }, 320);
        });
      });
    },
    [canvasDoc.id, setExpandedId, getTargetPosition],
  );

  // Handle collapse
  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!inlineSpacerRef.current) {
        return;
      }

      // Get the inline spacer position to animate back to
      const inlineRect = inlineSpacerRef.current.getBoundingClientRect();

      // First clear the expandedId to start panel collapse, but keep the card visible
      setExpandedId(null);

      // Animate card back to inline position
      requestAnimationFrame(() => {
        setFixedStyle((prev) => ({
          ...prev,
          position: 'fixed',
          top: inlineRect.top,
          left: inlineRect.left,
          width: inlineRect.width,
          height: inlineRect.height,
          zIndex: 9999,
          transition: 'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
        }));

        // After animation completes, remove the fixed card
        setTimeout(() => {
          setFixedStyle(null);
        }, 320);
      });
    },
    [setExpandedId],
  );

  // Card content - shared between inline and portal versions
  const cardContent = (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: '#181818',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        height: isExpanded ? '100%' : 'auto',
      }}
    >
      {/* Header with expand/collapse button */}
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-medium text-text-primary truncate">{canvasDoc.title}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
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
            onClick={isExpanded ? handleCollapse : handleExpand}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label={isExpanded ? 'Collapse canvas' : 'Expand canvas'}
          >
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Content - full height when expanded, clamped when inline */}
      <div className={`canvas-content px-6 pb-6 ${isExpanded ? 'flex-1 overflow-auto' : ''}`}>
        <div
          className={`prose prose-sm dark:prose-invert max-w-none text-text-primary ${!isExpanded ? 'line-clamp-10' : ''}`}
          dangerouslySetInnerHTML={{ __html: canvasDoc.content }}
        />
      </div>
    </div>
  );

  // When expanded or animating (fixedStyle set), render through portal to escape any parent clipping
  const showExpandedCard = isExpanded || fixedStyle != null;
  const expandedCard = showExpandedCard
    ? createPortal(
        <div
          style={
            fixedStyle ?? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              zIndex: 9999,
            }
          }
        >
          {cardContent}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      {/* Inline spacer when expanded (maintains scroll position and provides collapse target) */}
      {isExpanded && (
        <div
          ref={inlineSpacerRef}
          className="cursor-pointer rounded-3xl border border-dashed border-border-medium p-4"
          style={{ backgroundColor: 'rgba(24, 24, 24, 0.3)' }}
          onClick={handleCollapse}
        >
          <span className="text-sm text-text-secondary">{canvasDoc.title} - Click to collapse</span>
        </div>
      )}

      {/* Render expanded card via portal */}
      {expandedCard}

      {/* Inline card (only when not expanded) */}
      {!isExpanded && (
        <div ref={cardRef}>
          {cardContent}
        </div>
      )}
    </div>
  );
}

export default memo(CanvasDocumentView);
