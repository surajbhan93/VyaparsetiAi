import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const fetchListings = () => axios.get(`${API_URL}/listings`);
export const fetchListing = (id) => axios.get(`${API_URL}/listings/${id}`);
export const fetchScore = (id) => axios.get(`${API_URL}/listings/${id}/score`);
export const fetchAlerts = (listingId) => axios.get(`${API_URL}/alerts/${listingId}`);
export const fetchReportHistory = (listingId) => axios.get(`${API_URL}/reports/${listingId}/history`);
export const initListing = (data) => axios.post(`${API_URL}/init-listing`, data);
export const ingestReport = (data) => axios.post(`${API_URL}/reports/ingest`, data);