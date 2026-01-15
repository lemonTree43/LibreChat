import React, { useEffect, useCallback, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useSetRecoilState } from 'recoil';
import type { Pluggable } from 'unified';
import type { CanvasDocument } from 'librechat-data-provider';
import { useMessageContext } from '~/Providers';
import CanvasDocumentView from './CanvasDocumentView';
import store from '~/store';

/**
 * Remark plugin to parse canvas directives
 * Syntax: :::canvas{id="doc-1" title="My Document"}
 * content here
 * :::
 */
export const canvasPlugin: Pluggable = () => {
  return (tree) => {
    visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node, index, parent) => {
      if (node.type === 'textDirective') {
        const replacementText = `:${node.name}`;
        if (parent && Array.isArray(parent.children) && typeof index === 'number') {
          parent.children[index] = {
            type: 'text',
            value: replacementText,
          };
        }
      }
      if (node.name !== 'canvas') {
        return;
      }
      node.data = {
        hName: 'canvas-document',
        hProperties: node.attributes,
        ...node.data,
      };
      return node;
    });
  };
};

interface CanvasDirectiveProps {
  id?: string;
  title?: string;
  children: React.ReactNode;
  node: unknown;
}

/**
 * Extracts text content from React children (handles nested structures)
 */
function extractContent(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractContent).join('');
  }
  if (React.isValidElement(children) && children.props?.children) {
    return extractContent(children.props.children);
  }
  return '';
}

const defaultTitle = 'Untitled Document';
const defaultId = 'canvas-doc';

export function CanvasDirectiveComponent({
  id: propId,
  title: propTitle,
  children,
  node: _node,
}: CanvasDirectiveProps) {
  const { messageId } = useMessageContext();
  const setDocuments = useSetRecoilState(store.canvasDocumentsState);
  const [document, setDocument] = useState<CanvasDocument | null>(null);

  const throttledUpdateRef = useRef(
    throttle((updateFn: () => void) => {
      updateFn();
    }, 25),
  );

  const updateDocument = useCallback(() => {
    const content = extractContent(children);
    const title = propTitle ?? defaultTitle;
    const id = propId ?? `${defaultId}_${messageId}`;
    const documentKey = `${id}_${title}_${messageId}`.replace(/\s+/g, '_').toLowerCase();

    throttledUpdateRef.current(() => {
      if (documentKey === `${defaultId}_${defaultTitle}_${messageId}`.replace(/\s+/g, '_').toLowerCase()) {
        return;
      }

      const now = new Date();
      const currentDocument: CanvasDocument = {
        id: documentKey,
        conversationId: '', // Will be set by context if needed
        messageId,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };

      setDocuments((prevDocuments) => {
        if (
          prevDocuments[documentKey] != null &&
          prevDocuments[documentKey].content === content
        ) {
          return prevDocuments;
        }

        return {
          ...prevDocuments,
          [documentKey]: currentDocument,
        };
      });

      setDocument(currentDocument);
    });
  }, [propId, propTitle, children, messageId, setDocuments]);

  useEffect(() => {
    updateDocument();
  }, [updateDocument]);

  if (!document) {
    return null;
  }

  return <CanvasDocumentView document={document} />;
}

export default CanvasDirectiveComponent;
