import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/listings`);
      setListings(res.data);
    } catch (err) {
      console.error('Failed to fetch listings', err);
    }
    setLoading(false);
  };

  const selectListing = async (id) => {
    setSelectedListing(id);
    try {
      const res = await axios.get(`${API_URL}/listings/${id}/score`);
      setScoreData(res.data);
    } catch (err) {
      console.error('Failed to fetch score', err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Abuse Detection Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ width: '250px', borderRight: '1px solid #ccc', paddingRight: '20px' }}>
          <h3>Listings</h3>
          {loading ? <p>Loading...</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {listings.map(l => (
                <li 
                  key={l.id}
                  onClick={() => selectListing(l.id)}
                  style={{ 
                    padding: '10px', 
                    cursor: 'pointer',
                    backgroundColor: selectedListing === l.id ? '#e0e0e0' : 'transparent',
                    marginBottom: '5px'
                  }}
                >
                  <strong>{l.name || l.listing_id}</strong>
                  <br/>
                  <small>Trust: {l.trust_score}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {selectedListing && scoreData ? (
            <>
              <h2>Listing {selectedListing}</h2>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', flex: 1 }}>
                  <h4>Trust Score</h4>
                  <div style={{ fontSize: '32px', color: scoreData.trust_score < 70 ? 'red' : 'green' }}>
                    {scoreData.trust_score}
                  </div>
                </div>
                <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', flex: 1 }}>
                  <h4>Status</h4>
                  <div style={{ fontSize: '24px' }}>{scoreData.status || 'normal'}</div>
                </div>
              </div>
              
              {scoreData.anomaly && (
                <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                  <h4 style={{ color: '#c62828', margin: 0 }}>⚠️ Anomaly Detected</h4>
                  <p>{scoreData.reason}</p>
                </div>
              )}

              <h3>Report Trends</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreData.history || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p>Select a listing to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;