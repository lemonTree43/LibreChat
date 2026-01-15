import canvasDocumentSchema, { ICanvasDocument } from '~/schema/canvasDocument';

/**
 * Creates or returns the CanvasDocument model using the provided mongoose instance and schema
 */
export function createCanvasDocumentModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.CanvasDocument ||
    mongoose.model<ICanvasDocument>('CanvasDocument', canvasDocumentSchema)
  );
}
