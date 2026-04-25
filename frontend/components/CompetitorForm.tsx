"use client";

import { useState } from "react";
import { getCompetitors } from "@/lib/api";

export default function CompetitorForm({ setData }: any) {
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await getCompetitors(city, keyword);
    setData(res.competitors || []);
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg">
      <input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="border p-2 mr-2"
      />
      <input
        placeholder="Keyword"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="border p-2 mr-2"
      />
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2">
        {loading ? "Loading..." : "Find Competitors"}
      </button>
    </div>
  );
}