import { memo, useCallback } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { motion } from 'framer-motion';
import { Minimize2 } from 'lucide-react';
import store from '~/store';

/**
 * Expanded canvas card that renders in the side panel.
 * Uses the same layoutId as the inline card for smooth FLIP animation.
 */
const CanvasExpandedView = memo(function CanvasExpandedView() {
  const [expandedId, setExpandedId] = useRecoilState(store.expandedCanvasIdState);
  const canvasDocuments = useRecoilValue(store.canvasDocumentsState);

  const canvasDoc = expandedId ? canvasDocuments[expandedId] : null;

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canvasDoc) return;
      const text = canvasDoc.content.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(text);
    },
    [canvasDoc],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canvasDoc) return;
      const blob = new Blob([canvasDoc.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${canvasDoc.title}.html`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [canvasDoc],
  );

  const handleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedId(null);
    },
    [setExpandedId],
  );

  if (!canvasDoc) return null;

  return (
    <motion.div
      layoutId={`canvas-card-${canvasDoc.id}`}
      className="flex h-full flex-col gap-1 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: '#181818',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
      // Use layout to animate position and size without scaling children
      layout
      transition={{
        layout: {
          type: 'spring',
          stiffness: 200,
          damping: 25,
        },
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
            onClick={handleCollapse}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Collapse canvas"
          >
            <Minimize2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="canvas-content flex-1 overflow-auto px-6 pb-6">
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: canvasDoc.content }}
        />
      </div>
    </motion.div>
  );
});

export default CanvasExpandedView;
