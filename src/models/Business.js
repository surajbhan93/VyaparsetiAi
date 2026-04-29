import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  placeId: { type: String, unique: true },
  businessName: String,
  location: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  confidenceScore: Number,
  source: String,
  createdAt: { type: Date, default: Date.now }
});

const Business = mongoose.model('Business', businessSchema);

export default Business;