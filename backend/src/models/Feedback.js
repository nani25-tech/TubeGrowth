import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    email: { type: String, required: false, trim: true },
    message: { type: String, required: true, trim: true },
    page: { type: String, required: false, trim: true },
    userAgent: { type: String, required: false },
    ip: { type: String, required: false },
    handled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
