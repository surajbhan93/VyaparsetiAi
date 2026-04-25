export default function AnalysisCard({ data }: any) {
  return (
    <div className="mt-6 p-6 bg-black rounded-xl shadow">

      <h2 className="text-2xl font-bold">{data.name}</h2>

      <p>⭐ Rating: {data.rating}</p>
      <p>📊 Reviews: {data.reviews}</p>

      <h3 className="mt-3 font-semibold text-green-600">Strength</h3>
      <ul>
        {data.strength.map((s: string, i: number) => (
          <li key={i}>✔ {s}</li>
        ))}
      </ul>

      <h3 className="mt-3 font-semibold text-red-600">Weakness</h3>
      <ul>
        {data.weakness.map((w: string, i: number) => (
          <li key={i}>✖ {w}</li>
        ))}
      </ul>

      <p className="mt-3 font-bold text-blue-600">Score: {data.score}</p>

      {data.ai && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <h3 className="font-semibold">AI Insights</h3>

          {data.ai.weaknesses && (
            <>
              <p className="font-medium">Weaknesses:</p>
              <ul>
                {data.ai.weaknesses.map((w: string, i: number) => (
                  <li key={i}>- {w}</li>
                ))}
              </ul>
            </>
          )}

          {data.ai.strategies && (
            <>
              <p className="font-medium mt-2">Strategies:</p>
              <ul>
                {data.ai.strategies.map((s: string, i: number) => (
                  <li key={i}>- {s}</li>
                ))}
              </ul>
            </>
          )}

          {data.ai.positioning && (
            <p className="mt-2">🎯 {data.ai.positioning}</p>
          )}
        </div>
      )}
    </div>
  );
}