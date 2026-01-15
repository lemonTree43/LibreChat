import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICanvasDocument extends Document {
  conversationId: string;
  messageId: string;
  title: string;
  content: string;
  user: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const canvasDocumentSchema: Schema<ICanvasDocument> = new Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

canvasDocumentSchema.index({ conversationId: 1, user: 1 });
canvasDocumentSchema.index({ messageId: 1, user: 1 });

export default canvasDocumentSchema;
