import { memo, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { CanvasDocument } from 'librechat-data-provider';

interface CanvasCardContentProps {
  document: CanvasDocument;
  isExpandedView?: boolean;
  onExpand?: (e: React.MouseEvent) => void;
  onCollapse?: (e: React.MouseEvent) => void;
  expandDisabled?: boolean;
}

function CanvasCardContent({
  document: canvasDoc,
  isExpandedView = false,
  onExpand,
  onCollapse,
  expandDisabled = false,
}: CanvasCardContentProps) {
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

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (isExpandedView && onCollapse) {
        onCollapse(e);
      } else if (!isExpandedView && onExpand) {
        onExpand(e);
      }
    },
    [isExpandedView, onExpand, onCollapse],
  );

  return (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: '#181818',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        height: isExpandedView ? '100%' : 'auto',
      }}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <span className="truncate text-sm font-medium text-text-primary">{canvasDoc.title}</span>
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
            onClick={handleToggle}
            disabled={!isExpandedView && expandDisabled}
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
}

export default memo(CanvasCardContent);
