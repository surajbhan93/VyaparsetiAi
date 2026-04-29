import axios from 'axios';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Search top 5 results from Google Places
async function searchPlaces(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
  const response = await axios.get(url, {
    params: { query, key: API_KEY }
  });

  if (response.data.status !== 'OK') {
    throw new Error('Google Places API error: ' + response.data.status);
  }

  // Return top 5 results
  return response.data.results.slice(0, 5);
}

// Get detailed info for a place
async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json`;
  const response = await axios.get(url, {
    params: {
      place_id: placeId,
      key: API_KEY,
      fields: 'name,place_id,geometry,rating,user_ratings_total,formatted_address'
    }
  });
  return response.data.result;
}

export { searchPlaces, getPlaceDetails };