import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    channelThumbnail: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    videoTitle: {
      type: String,
    },
    type: {
      type: String,
      enum: ['subscribers', 'likes', 'views', 'comments'],
      required: true,
    },
    targetCount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for completion percentage
campaignSchema.virtual('completionPercentage').get(function () {
  if (this.targetCount === 0) return 0;
  return Math.round((this.currentCount / this.targetCount) * 100);
});

// Virtual for remaining count
campaignSchema.virtual('remainingCount').get(function () {
  return Math.max(0, this.targetCount - this.currentCount);
});

campaignSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Campaign', campaignSchema);
