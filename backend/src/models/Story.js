import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const storySchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    location: { type: String, enum: ['mathura', 'rewari'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    body: { type: String, required: true },
    excerpt: { type: String, default: '' },
    author: { type: String, default: 'Mahawar Sabha' },
    tags: { type: [String], default: [] },
    coverUrl: { type: String, default: '' }, // external URL fallback
    coverAssetId: { type: String, default: '' }, // FileAsset.id reference
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    is_deleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

storySchema.index({ location: 1, published: 1, is_deleted: 1, publishedAt: -1 });

storySchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('Story', storySchema);
