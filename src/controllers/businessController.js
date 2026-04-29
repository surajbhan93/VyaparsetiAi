import { isGoogleLink, resolveShortLink, extractFromUrl } from '../services/linkResolver.js';
import { searchPlaces } from '../services/placesService.js';
import { findBestMatch } from '../services/matchingEngine.js';
import Business from '../models/Business.js';
async function handleInput(req, res) {
    const USE_DUMMY = true;
  try {
    const { type, value } = req.body;

    // Step 1: Validate input
    if (!type || !value || !['link', 'name'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid input type or value' });
    }
    if (USE_DUMMY) {
      return res.json({
        success: true,
        data: {
          businessName: "ABC Coaching Civil Lines",
          placeId: "dummy123",
          location: "Prayagraj",
          coordinates: {
            lat: 25.4358,
            lng: 81.8463,
          },
          confidenceScore: 0.91,
          matchedBy: "name+location",
          source: "dummy_data",
          status: "validated",
        },
      });
    }

    const trimmedValue = value.trim();
    let searchQuery = trimmedValue;
    let locationKeyword = '';

    // Step 2: Handle link input
    if (type === 'link') {
      if (!isGoogleLink(trimmedValue)) {
        return res.status(400).json({ success: false, message: 'Invalid Google Business link' });
      }
      const fullUrl = await resolveShortLink(trimmedValue);
      const extracted = extractFromUrl(fullUrl);
      if (!extracted) {
        return res.status(400).json({ success: false, message: 'Could not extract business from link' });
      }
      searchQuery = extracted;
    }

    // Extract location keyword from name (e.g., "Maths Coaching Prayagraj" → "Prayagraj")
    const words = searchQuery.split(' ');
    if (words.length > 1) locationKeyword = words[words.length - 1];

    // Step 3: Check cache (MongoDB)
    const cached = await Business.findOne({ businessName: new RegExp(searchQuery, 'i') });
    if (cached) {
      return res.json({
        success: true,
        data: { ...cached.toObject(), source: 'cache', status: 'validated' }
      });
    }

    // Step 4: Fetch from Google Places (top 5)
    const places = await searchPlaces(searchQuery);

    // Step 5: Smart matching + confidence score
    const scored = findBestMatch(places, searchQuery, locationKeyword);
    const best = scored[0];

    // Step 6: Geo validation — low confidence fallback
    if (best.score < 0.7) {
      const suggestions = scored.slice(0, 3).map(s => s.place.name);
      return res.status(200).json({
        success: false,
        message: 'Low confidence match',
        suggestions
      });
    }

    const place = best.place;
    const result = {
      businessName: place.name,
      placeId: place.place_id,
      location: locationKeyword || place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      confidenceScore: best.score,
      matchedBy: 'name+location',
      source: 'google_places',
      status: 'validated'
    };

    // Step 7: Save to MongoDB
    await Business.findOneAndUpdate(
      { placeId: result.placeId },
      result,
      { upsert: true, new: true }
    );

    return res.json({ success: true, data: result });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export { handleInput };