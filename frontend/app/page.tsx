"use client";

import { useState } from "react";
import CompetitorForm from "@/components/CompetitorForm";
import CompetitorList from "@/components/CompetitorList";

export default function Home() {
  const [data, setData] = useState([]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        DownBot 🔥 Competitor Analyzer
      </h1>

      <CompetitorForm setData={setData} />
      <CompetitorList data={data} />
    </main>
  );
}