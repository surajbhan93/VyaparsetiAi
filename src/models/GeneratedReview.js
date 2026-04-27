import mongoose from 'mongoose';

const generatedReviewSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true },
    location: { type: String },
    keywords: [{ type: String }],
    tone: { type: String, default: 'positive' },
    review: { type: String, required: true },
    rating: { type: Number, required: true },
    type: { type: String, enum: ['short', 'medium', 'detailed'], required: true },
    persona: { type: String, enum: ['student', 'parent', 'working_professional', 'general'], default: 'general' },
    postAfterDays: { type: Number, default: 0 },
    reviewHash: { type: String },
  },
  { timestamps: true },
);

const GeneratedReview = mongoose.model('GeneratedReview', generatedReviewSchema);
export default GeneratedReview;
