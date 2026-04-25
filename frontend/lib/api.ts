// lib/api.ts

const BASE_URL = "http://localhost:5000/api/downbot";

// 🔥 Get competitors
export const getCompetitors = async (city: string, keyword: string) => {
  const res = await fetch(`${BASE_URL}/competitors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ city, keyword }),
  });

  return res.json();
};

// 🔥 Analyze competitor
export const analyzeCompetitor = async (competitor: any) => {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ competitor }),
  });

  return res.json();
};