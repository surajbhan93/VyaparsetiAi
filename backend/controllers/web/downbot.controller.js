import axios from "axios";

export const getCompetitors = async (req, res) => {
  try {
    const { businessName, location } = req.body;

    if (!businessName || !location) {
      return res.status(400).json({
        success: false,
        message: "businessName and location required",
      });
    }

    // 🔑 Google Places API
    const API_KEY = process.env.GOOGLE_API_KEY;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${businessName}+in+${location}&key=${API_KEY}`;

    const response = await axios.get(url);

    const results = response.data.results.slice(0, 10);

    const competitors = results.map((place) => ({
      name: place.name,
      rating: place.rating || 0,
      reviews: place.user_ratings_total || 0,
      address: place.formatted_address,
      placeId: place.place_id,
    }));

    return res.json({
      success: true,
      count: competitors.length,
      competitors,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching competitors",
    });
  }
};