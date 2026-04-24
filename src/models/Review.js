import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true },
    review: { type: String, required: true },
    rating: { type: Number, required: true },
    customerName: { type: String },
    tone: { type: String },
    sentiment: { type: String },
    reply: { type: String },
    replyScore: { type: Number },
    reviewHash: { type: String },
  },
  { timestamps: true },
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
