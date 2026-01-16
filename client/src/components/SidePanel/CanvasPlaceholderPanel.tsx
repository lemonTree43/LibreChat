import { useRef, useEffect, memo, useCallback } from 'react';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import { ResizableHandleAlt, ResizablePanel } from '@librechat/client';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import type { CanvasDocument } from 'librechat-data-provider';
import CanvasCardContent from '~/components/Canvas/CanvasCardContent';
import store from '~/store';

interface CanvasPlaceholderPanelProps {
  isExpanded: boolean;
  currentLayout: number[];
  minSizeMain: number;
  shouldRender: boolean;
  onRenderChange: (shouldRender: boolean) => void;
  hasArtifacts: boolean;
  expandedDocument: CanvasDocument | null;
}

// Padding inside the panel container (p-2 = 8px)
const PANEL_PADDING = 8;
// Resize handle width (approximate)
const HANDLE_WIDTH = 12;

const CanvasPlaceholderPanel = memo(function CanvasPlaceholderPanel({
  isExpanded,
  currentLayout,
  minSizeMain,
  shouldRender,
  onRenderChange,
  hasArtifacts,
  expandedDocument,
}: CanvasPlaceholderPanelProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setTargetRect = useSetRecoilState(store.canvasTargetRectState);
  const setCollapseStartRect = useSetRecoilState(store.canvasCollapseStartRectState);
  const expandedCanvasId = useRecoilValue(store.expandedCanvasIdState);
  const [animationPhase, setAnimationPhase] = useRecoilState(store.canvasAnimationPhaseState);

  // Calculate the final target rect based on layout percentages
  // This gives us the correct dimensions immediately, without waiting for animation
  const calculateFinalTargetRect = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Main panel takes currentLayout[0]%, canvas panel takes currentLayout[1]%
    const mainPanelWidth = (viewportWidth * currentLayout[0]) / 100;
    const canvasPanelWidth = (viewportWidth * currentLayout[1]) / 100;

    // The canvas panel starts after main panel + handle
    const panelLeft = mainPanelWidth + HANDLE_WIDTH;
    // Container inside has padding
    const containerLeft = panelLeft + PANEL_PADDING;
    const containerWidth = canvasPanelWidth - (PANEL_PADDING * 2) - HANDLE_WIDTH;
    const containerHeight = viewportHeight - (PANEL_PADDING * 2);

    return {
      top: PANEL_PADDING,
      left: containerLeft,
      width: containerWidth,
      height: containerHeight,
    };
  }, [currentLayout]);

  // Update target rect - use calculated values for immediate correct dimensions
  const updateTargetRect = useCallback(() => {
    if (!expandedCanvasId) return;

    // During expanding phase, use calculated dimensions (the panel is still animating)
    // After expanded, measure the actual container for accuracy
    if (animationPhase === 'expanding' || animationPhase === 'idle') {
      const calculated = calculateFinalTargetRect();
      console.log('[TARGET] calculated targetRect:', calculated);
      setTargetRect(calculated as DOMRect);
    } else if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log('[TARGET] measured targetRect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      setTargetRect(rect);
    }
  }, [expandedCanvasId, animationPhase, calculateFinalTargetRect, setTargetRect]);

  // Set target rect immediately when canvas expands (using calculated values)
  useEffect(() => {
    if (expandedCanvasId && (animationPhase === 'expanding' || animationPhase === 'idle')) {
      updateTargetRect();
    }
  }, [expandedCanvasId, animationPhase, updateTargetRect]);

  // Observe container for size changes (for resize handle dragging, window resize)
  useEffect(() => {
    if (!containerRef.current || !expandedCanvasId) return;

    // Use ResizeObserver for ongoing updates after animation completes
    const observer = new ResizeObserver(() => {
      if (animationPhase === 'expanded') {
        updateTargetRect();
      }
    });
    observer.observe(containerRef.current);

    window.addEventListener('resize', updateTargetRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [expandedCanvasId, animationPhase, updateTargetRect]);

  // Cleanup target rect when unmounting or collapsing
  useEffect(() => {
    return () => setTargetRect(null);
  }, [setTargetRect]);

  // Expand/collapse panel based on isExpanded
  useEffect(() => {
    if (isExpanded) {
      onRenderChange(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panelRef.current?.expand();
          panelRef.current?.resize(currentLayout[1]);
        });
      });
    } else if (shouldRender) {
      panelRef.current?.collapse();
      // Delay unmount for collapse animation
      setTimeout(() => onRenderChange(false), 300);
    }
  }, [isExpanded, shouldRender, onRenderChange, currentLayout]);

  // Handle collapse from the expanded card
  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // CRITICAL: Capture the current panel position BEFORE changing animation phase
      // This is the starting position for the collapse animation
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCollapseStartRect(rect);
      }
      setAnimationPhase('collapsing');
    },
    [setAnimationPhase, setCollapseStartRect],
  );

  if (!shouldRender) {
    return null;
  }

  // Show the actual card content when animation is complete (phase is 'expanded')
  const showActualCard = animationPhase === 'expanded' && expandedDocument;

  return (
    <>
      {isExpanded && (
        <ResizableHandleAlt withHandle className="bg-border-medium text-text-primary" />
      )}
      <ResizablePanel
        ref={panelRef}
        defaultSize={isExpanded ? currentLayout[1] : 0}
        minSize={minSizeMain}
        maxSize={70}
        collapsible={true}
        collapsedSize={0}
        order={hasArtifacts ? 3 : 2}
        id="canvas-placeholder-panel"
        className="canvas-panel-transition"
      >
        {/* Container for measuring target position AND rendering actual card when expanded */}
        <div ref={containerRef} className="h-full w-full p-2">
          {showActualCard && (
            <CanvasCardContent
              document={expandedDocument}
              isExpandedView={true}
              onCollapse={handleCollapse}
            />
          )}
        </div>
      </ResizablePanel>
    </>
  );
});

CanvasPlaceholderPanel.displayName = 'CanvasPlaceholderPanel';

export default CanvasPlaceholderPanel;
