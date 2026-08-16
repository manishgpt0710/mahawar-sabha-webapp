import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const fileAssetSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    location: { type: String, enum: ['mathura', 'rewari'], required: true },
    category: { type: String, enum: ['gallery', 'documents'], required: true },
    bucket: { type: String, required: true },
    storagePath: { type: String, required: true, unique: true },
    originalName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    is_deleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

fileAssetSchema.index({ location: 1, category: 1, is_deleted: 1, createdAt: -1 });

// Ensure _id is never leaked in API responses
fileAssetSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('FileAsset', fileAssetSchema);
