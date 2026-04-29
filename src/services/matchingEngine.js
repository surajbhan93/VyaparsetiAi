// Calculate how similar two strings are (0 to 1)
function nameSimilarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  
  const wordsA = a.split(' ');
  const wordsB = b.split(' ');
  const common = wordsA.filter(w => wordsB.includes(w));
  return common.length / Math.max(wordsA.length, wordsB.length);
}

// Check if location keyword matches the result's address
function locationMatch(address, keyword) {
  if (!keyword) return 0.5; // no location info, neutral
  return address.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0;
}

// Calculate confidence score
function calculateConfidence(place, query, locationKeyword) {
  const nameScore    = nameSimilarity(place.name, query) * 0.40;
  const locScore     = locationMatch(place.formatted_address || '', locationKeyword) * 0.30;
  const popularity   = Math.min((place.user_ratings_total || 0) / 500, 1) * 0.20;
  const exactKeyword = place.name.toLowerCase().includes(query.toLowerCase()) ? 0.10 : 0;

  return parseFloat((nameScore + locScore + popularity + exactKeyword).toFixed(2));
}

// Find best match from top 5 results
function findBestMatch(places, query, locationKeyword) {
  const scored = places.map(place => ({
    place,
    score: calculateConfidence(place, query, locationKeyword)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export { findBestMatch };