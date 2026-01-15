import { memo, useCallback } from 'react';
import type { CanvasDocument } from 'librechat-data-provider';

interface CanvasDocumentViewProps {
  document: CanvasDocument;
}

function CanvasDocumentView({ document: canvasDoc }: CanvasDocumentViewProps) {
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = canvasDoc.content.replace(/<[^>]*>/g, '');
    await navigator.clipboard.writeText(text);
  }, [canvasDoc.content]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([canvasDoc.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${canvasDoc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [canvasDoc.content, canvasDoc.title]);

  return (
    <div className="not-prose" style={{ margin: '1rem 0' }}>
      <div
        className="flex gap-1 flex-col overflow-hidden rounded-3xl"
        style={{ backgroundColor: '#181818', border: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-sm font-medium text-text-primary truncate">
            {canvasDoc.title}
          </span>
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
          </div>
        </div>

        {/* Content */}
        <div className="canvas-content px-6 pb-6">
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-text-primary line-clamp-10"
            dangerouslySetInnerHTML={{ __html: canvasDoc.content }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(CanvasDocumentView);
