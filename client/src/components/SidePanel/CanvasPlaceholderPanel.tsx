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

  // Calculate target rect based on final layout percentages
  // This gives us the position the panel WILL be at, not where it currently is
  const calculateTargetRect = useCallback(() => {
    if (!containerRef.current) return;

    // Get the parent panel group's dimensions
    const panelGroup = containerRef.current.closest('[data-panel-group]');
    if (!panelGroup) return;

    const groupRect = panelGroup.getBoundingClientRect();
    const totalWidth = groupRect.width;

    // Calculate positions based on final layout percentages
    // currentLayout = [mainPanelPercent, canvasPanelPercent, navPanelPercent]
    const mainPanelWidth = (totalWidth * currentLayout[0]) / 100;
    const canvasPanelWidth = (totalWidth * currentLayout[1]) / 100;

    // Account for resize handle width (approximately 12px)
    const handleWidth = 12;

    // The canvas panel starts after the main panel + handle
    const canvasPanelLeft = groupRect.left + mainPanelWidth + handleWidth;

    // Container has p-2 padding (8px)
    const padding = 8;

    const rect = {
      top: groupRect.top + padding,
      left: canvasPanelLeft + padding,
      width: canvasPanelWidth - handleWidth - (padding * 2),
      height: groupRect.height - (padding * 2),
      bottom: groupRect.bottom - padding,
      right: canvasPanelLeft + canvasPanelWidth - padding,
      x: canvasPanelLeft + padding,
      y: groupRect.top + padding,
      toJSON: () => rect,
    } as DOMRect;

    setTargetRect(rect);
  }, [currentLayout, setTargetRect]);

  // Update target rect from actual measurement (for when panel is fully expanded)
  const updateTargetRect = useCallback(() => {
    if (containerRef.current && expandedCanvasId) {
      const rect = containerRef.current.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [expandedCanvasId, setTargetRect]);

  // Observe container for size changes (after initial expansion)
  useEffect(() => {
    if (!containerRef.current || !expandedCanvasId) return;

    // Use ResizeObserver for ongoing updates (resize handle dragging, window resize)
    const observer = new ResizeObserver(updateTargetRect);
    observer.observe(containerRef.current);

    window.addEventListener('resize', updateTargetRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [expandedCanvasId, updateTargetRect]);

  // Cleanup target rect when unmounting or collapsing
  useEffect(() => {
    return () => setTargetRect(null);
  }, [setTargetRect]);

  // Expand/collapse panel based on isExpanded
  useEffect(() => {
    if (isExpanded) {
      onRenderChange(true);
      // Calculate target rect IMMEDIATELY based on final layout
      // This gives us the correct target position before the panel animates
      calculateTargetRect();
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
  }, [isExpanded, shouldRender, onRenderChange, currentLayout, calculateTargetRect]);

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
