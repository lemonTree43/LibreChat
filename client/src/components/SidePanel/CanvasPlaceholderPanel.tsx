import { useRef, useEffect, memo, useCallback } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { ResizableHandleAlt, ResizablePanel } from '@librechat/client';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import store from '~/store';

interface CanvasPlaceholderPanelProps {
  isExpanded: boolean;
  currentLayout: number[];
  minSizeMain: number;
  shouldRender: boolean;
  onRenderChange: (shouldRender: boolean) => void;
  hasArtifacts: boolean;
}

const CanvasPlaceholderPanel = memo(function CanvasPlaceholderPanel({
  isExpanded,
  currentLayout,
  minSizeMain,
  shouldRender,
  onRenderChange,
  hasArtifacts,
}: CanvasPlaceholderPanelProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setTargetRect = useSetRecoilState(store.canvasTargetRectState);
  const expandedCanvasId = useRecoilValue(store.expandedCanvasIdState);

  // Update target rect when container size/position changes
  const updateTargetRect = useCallback(() => {
    if (containerRef.current && expandedCanvasId) {
      const rect = containerRef.current.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [expandedCanvasId, setTargetRect]);

  // Observe container for size changes
  useEffect(() => {
    if (!containerRef.current || !expandedCanvasId) return;

    updateTargetRect();

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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panelRef.current?.expand();
          panelRef.current?.resize(currentLayout[1]);
          // Update rect after panel expands
          setTimeout(updateTargetRect, 50);
        });
      });
    } else if (shouldRender) {
      panelRef.current?.collapse();
      // Delay unmount for collapse animation
      setTimeout(() => onRenderChange(false), 300);
    }
  }, [isExpanded, shouldRender, onRenderChange, currentLayout, updateTargetRect]);

  if (!shouldRender) {
    return null;
  }

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
        {/* Container for measuring target position - the actual card is rendered via portal */}
        <div ref={containerRef} className="h-full w-full p-2" />
      </ResizablePanel>
    </>
  );
});

CanvasPlaceholderPanel.displayName = 'CanvasPlaceholderPanel';

export default CanvasPlaceholderPanel;
