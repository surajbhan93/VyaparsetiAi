import axios from 'axios';

// Checks if input is a valid Google link
function isGoogleLink(value) {
  return value.includes('google.com/maps') || value.includes('share.google');
}

// Resolves short links to full URL
async function resolveShortLink(url) {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: () => true
    });
    return response.request.res.responseUrl || url;
  } catch (err) {
    throw new Error('Could not resolve short link');
  }
}

// Extract place name/id from full Google Maps URL
function extractFromUrl(fullUrl) {
  // Try to extract place name from URL
  const placeMatch = fullUrl.match(/place\/([^/]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }
  return null;
}

export { isGoogleLink, resolveShortLink, extractFromUrl };