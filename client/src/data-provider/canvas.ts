import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationResult } from '@tanstack/react-query';
import type {
  CanvasDocumentResponse,
  CanvasDocumentsResponse,
  CreateCanvasDocumentParams,
} from 'librechat-data-provider';
import { QueryKeys, dataService } from 'librechat-data-provider';

/**
 * Hook to get canvas documents for a conversation
 */
export const useGetCanvasDocuments = (
  conversationId: string,
  config?: UseQueryOptions<CanvasDocumentsResponse>,
) => {
  return useQuery<CanvasDocumentsResponse>(
    [QueryKeys.canvasDocuments, conversationId],
    () => dataService.getCanvasDocumentsByConversation(conversationId),
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

/**
 * Hook to get a single canvas document
 */
export const useGetCanvasDocument = (
  documentId: string,
  config?: UseQueryOptions<CanvasDocumentResponse>,
) => {
  return useQuery<CanvasDocumentResponse>(
    [QueryKeys.canvasDocument, documentId],
    () => dataService.getCanvasDocument(documentId),
    {
      enabled: !!documentId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

/**
 * Hook to create a canvas document
 */
export const useCreateCanvasDocument = (): UseMutationResult<
  CanvasDocumentResponse,
  unknown,
  CreateCanvasDocumentParams & { conversationId?: string; messageId?: string },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation(
    (payload) => dataService.createCanvasDocument(payload),
    {
      onSuccess: (data, variables) => {
        if (variables.conversationId) {
          queryClient.invalidateQueries([QueryKeys.canvasDocuments, variables.conversationId]);
        }
      },
    },
  );
};

/**
 * Hook to update a canvas document
 */
export const useUpdateCanvasDocument = (): UseMutationResult<
  CanvasDocumentResponse,
  unknown,
  { id: string; payload: Partial<CreateCanvasDocumentParams> },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, payload }) => dataService.updateCanvasDocument(id, payload),
    {
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.canvasDocument, data.id], data);
      },
    },
  );
};

/**
 * Hook to delete a canvas document
 */
export const useDeleteCanvasDocument = (): UseMutationResult<
  { message: string },
  unknown,
  { id: string; conversationId?: string },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id }) => dataService.deleteCanvasDocument(id),
    {
      onSuccess: (_, variables) => {
        queryClient.removeQueries([QueryKeys.canvasDocument, variables.id]);
        if (variables.conversationId) {
          queryClient.invalidateQueries([QueryKeys.canvasDocuments, variables.conversationId]);
        }
      },
    },
  );
};
