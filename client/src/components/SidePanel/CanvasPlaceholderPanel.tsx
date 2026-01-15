import { useRef, useEffect, memo, useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
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
  const setPlaceholderElement = useSetRecoilState(store.canvasPlaceholderElementState);

  // Callback ref to store the element directly in Recoil
  const placeholderRefCallback = useCallback(
    (element: HTMLDivElement | null) => {
      setPlaceholderElement(element);
    },
    [setPlaceholderElement],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => setPlaceholderElement(null);
  }, [setPlaceholderElement]);

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
        {/* Empty placeholder - just for measuring target position */}
        <div
          ref={placeholderRefCallback}
          className="h-full w-full"
          style={{ backgroundColor: 'rgba(50, 50, 50, 0.3)' }}
        />
      </ResizablePanel>
    </>
  );
});

CanvasPlaceholderPanel.displayName = 'CanvasPlaceholderPanel';

export default CanvasPlaceholderPanel;
