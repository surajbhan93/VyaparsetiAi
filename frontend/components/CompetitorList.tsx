"use client";

import { analyzeCompetitor } from "@/lib/api";
import { useState } from "react";
import AnalysisCard from "./AnalysisCard";

// ─── Types ───────────────────────────────────────────────
interface Competitor {
  name: string;
  rating?: string | number;
  review_count?: string | number;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  maps_url?: string;
}

interface CardState {
  loading: boolean;
  analysis: any | null;
  error: string | null;
  open: boolean;
}

// ─── Sub-components ───────────────────────────────────────

function RatingStars({ rating }: { rating?: string | number }) {
  const num = parseFloat(String(rating || 0));
  if (!num) return <span className="cpl-na">No rating</span>;
  const full = Math.floor(num);
  const half = num - full >= 0.5;
  return (
    <span className="cpl-stars" aria-label={`${num} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={
            i < full
              ? "cpl-star filled"
              : i === full && half
              ? "cpl-star half"
              : "cpl-star"
          }
        >
          ★
        </span>
      ))}
      <span className="cpl-rating-num">{num.toFixed(1)}</span>
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value?: string | number | null;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="cpl-info-row">
      <span className="cpl-info-icon" aria-hidden>
        {icon}
      </span>
      <span className="cpl-info-label">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="cpl-info-link"
        >
          {value}
        </a>
      ) : (
        <span className="cpl-info-value">{value}</span>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "#ef4444"
      : score >= 60
      ? "#f97316"
      : score >= 40
      ? "#eab308"
      : "#22c55e";
  return (
    <span className="cpl-score-badge" style={{ "--badge-color": color } as any}>
      {score}
      <small>/100</small>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────

export default function CompetitorList({ data }: { data: Competitor[] }) {
  const [cardStates, setCardStates] = useState<Record<number, CardState>>({});

  const getState = (i: number): CardState =>
    cardStates[i] ?? { loading: false, analysis: null, error: null, open: false };

  const setCardState = (i: number, patch: Partial<CardState>) =>
    setCardStates((prev) => ({
      ...prev,
      [i]: { ...getState(i), ...patch },
    }));

  const handleAnalyze = async (comp: Competitor, i: number) => {
    const state = getState(i);

    // Toggle close if already open
    if (state.open && state.analysis) {
      setCardState(i, { open: false });
      return;
    }

    // Already fetched — just re-open
    if (state.analysis) {
      setCardState(i, { open: true });
      return;
    }

    setCardState(i, { loading: true, error: null });
    try {
      const res = await analyzeCompetitor(comp);
      setCardState(i, { loading: false, analysis: res.data, open: true });
    } catch (err: any) {
      setCardState(i, {
        loading: false,
        error: err?.message || "Analysis failed. Please try again.",
      });
    }
  };

  if (!data?.length) {
    return (
      <div className="cpl-empty">
        <span className="cpl-empty-icon">🔍</span>
        <p>No competitors found. Try a different keyword or city.</p>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <section className="cpl-root">
        <header className="cpl-header">
          <h2 className="cpl-heading">
            Competitors
            <span className="cpl-count">{data.length}</span>
          </h2>
          <p className="cpl-subheading">
            Click <strong>Analyze</strong> on any business for an AI-powered
            competitive report.
          </p>
        </header>

        <div className="cpl-grid">
          {data.map((c, i) => {
            const state = getState(i);
            const score = state.analysis?.scores?.overall;

            return (
              <article key={i} className={`cpl-card ${state.open ? "cpl-card--open" : ""}`}>
                {/* Card Header */}
                <div className="cpl-card-top">
                  <div className="cpl-card-title-row">
                    <div>
                      <h3 className="cpl-card-name">{c.name}</h3>
                      {c.category && (
                        <span className="cpl-category">{c.category}</span>
                      )}
                    </div>
                    {score != null && <ScoreBadge score={score} />}
                  </div>

                  <div className="cpl-metrics">
                    <RatingStars rating={c.rating} />
                    {c.review_count && (
                      <span className="cpl-reviews">
                        {c.review_count} reviews
                      </span>
                    )}
                  </div>
                </div>

                {/* Info rows */}
                <div className="cpl-info-list">
                  <InfoRow icon="📍" label="Address" value={c.address} />
                  <InfoRow icon="📞" label="Phone" value={c.phone} href={c.phone ? `tel:${c.phone}` : undefined} />
                  <InfoRow
                    icon="🌐"
                    label="Website"
                    value={c.website ? new URL(c.website).hostname : undefined}
                    href={c.website}
                  />
                  <InfoRow icon="⏰" label="Hours" value={c.hours} />
                  <InfoRow
                    icon="🗺️"
                    label="Maps"
                    value={c.maps_url ? "Open in Google Maps" : undefined}
                    href={c.maps_url}
                  />
                </div>

                {/* Profile completeness pills */}
                <div className="cpl-pills">
                  {[
                    { label: "Phone",   has: !!c.phone },
                    { label: "Website", has: !!c.website },
                    { label: "Address", has: !!c.address },
                    { label: "Hours",   has: !!c.hours },
                  ].map(({ label, has }) => (
                    <span
                      key={label}
                      className={`cpl-pill ${has ? "cpl-pill--yes" : "cpl-pill--no"}`}
                    >
                      {has ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>

                {/* Error */}
                {state.error && (
                  <div className="cpl-error" role="alert">
                    ⚠️ {state.error}
                  </div>
                )}

                {/* Analyze button */}
                <button
                  className={`cpl-btn ${state.loading ? "cpl-btn--loading" : ""} ${state.open ? "cpl-btn--close" : ""}`}
                  onClick={() => handleAnalyze(c, i)}
                  disabled={state.loading}
                  aria-busy={state.loading}
                >
                  {state.loading ? (
                    <>
                      <span className="cpl-spinner" aria-hidden />
                      Analyzing…
                    </>
                  ) : state.open ? (
                    "Hide Analysis ↑"
                  ) : state.analysis ? (
                    "Show Analysis ↓"
                  ) : (
                    "✦ Analyze"
                  )}
                </button>

                {/* Analysis panel */}
                {state.open && state.analysis && (
                  <div className="cpl-analysis-panel">
                    <AnalysisCard data={state.analysis} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

  .cpl-root {
    font-family: 'DM Sans', sans-serif;
    max-width: 900px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
    --brand:   #0f4c35;
    --accent:  #22c55e;
    --warn:    #f97316;
    --danger:  #ef4444;
    --muted:   #6b7280;
    --border:  #e5e7eb;
    --surface: #ffffff;
    --bg:      #f9fafb;
    --radius:  14px;
    --shadow:  0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.05);
    --shadow-hover: 0 4px 20px rgba(0,0,0,.10);
  }

  /* Header */
  .cpl-header { margin-bottom: 1.5rem; }
  .cpl-heading {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: .5rem;
    margin: 0 0 .25rem;
  }
  .cpl-count {
    background: var(--brand);
    color: #fff;
    font-size: .75rem;
    font-weight: 600;
    border-radius: 99px;
    padding: .15rem .55rem;
    letter-spacing: .03em;
  }
  .cpl-subheading { color: var(--muted); font-size: .875rem; margin: 0; }

  /* Grid */
  .cpl-grid { display: grid; gap: 1rem; }

  /* Card */
  .cpl-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem 1.25rem 1rem;
    box-shadow: var(--shadow);
    transition: box-shadow .2s, border-color .2s;
  }
  .cpl-card:hover { box-shadow: var(--shadow-hover); }
  .cpl-card--open { border-color: var(--accent); }

  /* Card top */
  .cpl-card-top { margin-bottom: .85rem; }
  .cpl-card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: .5rem;
    margin-bottom: .4rem;
  }
  .cpl-card-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 .2rem;
    line-height: 1.3;
  }
  .cpl-category {
    font-size: .72rem;
    font-weight: 500;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: .1rem .5rem;
    display: inline-block;
  }

  /* Score badge */
  .cpl-score-badge {
    flex-shrink: 0;
    font-family: 'DM Mono', monospace;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--badge-color, #22c55e);
    border: 2px solid var(--badge-color, #22c55e);
    border-radius: 8px;
    padding: .2rem .5rem;
    line-height: 1;
    white-space: nowrap;
  }
  .cpl-score-badge small {
    font-size: .6rem;
    color: var(--muted);
    margin-left: .1rem;
  }

  /* Stars */
  .cpl-metrics { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
  .cpl-stars { display: inline-flex; align-items: center; gap: 1px; }
  .cpl-star { font-size: .95rem; color: #d1d5db; }
  .cpl-star.filled { color: #f59e0b; }
  .cpl-star.half {
    background: linear-gradient(90deg, #f59e0b 50%, #d1d5db 50%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .cpl-rating-num {
    font-family: 'DM Mono', monospace;
    font-size: .8rem;
    font-weight: 500;
    color: #374151;
    margin-left: .25rem;
  }
  .cpl-reviews { font-size: .8rem; color: var(--muted); }
  .cpl-na { font-size: .8rem; color: var(--muted); font-style: italic; }

  /* Info list */
  .cpl-info-list { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .85rem; }
  .cpl-info-row {
    display: flex;
    align-items: baseline;
    gap: .4rem;
    font-size: .82rem;
    color: #374151;
    min-width: 0;
  }
  .cpl-info-icon { font-size: .85rem; flex-shrink: 0; }
  .cpl-info-label { color: var(--muted); flex-shrink: 0; font-size: .78rem; }
  .cpl-info-value { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cpl-info-link {
    flex: 1;
    color: #2563eb;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }
  .cpl-info-link:hover { text-decoration: underline; }

  /* Pills */
  .cpl-pills { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .9rem; }
  .cpl-pill {
    font-size: .68rem;
    font-weight: 500;
    border-radius: 99px;
    padding: .15rem .55rem;
    border: 1px solid transparent;
  }
  .cpl-pill--yes { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .cpl-pill--no  { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }

  /* Error */
  .cpl-error {
    font-size: .8rem;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: .5rem .75rem;
    margin-bottom: .75rem;
  }

  /* Button */
  .cpl-btn {
    width: 100%;
    padding: .6rem 1rem;
    background: var(--brand);
    color: #fff;
    border: none;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .45rem;
    transition: background .15s, transform .1s, opacity .15s;
  }
  .cpl-btn:hover:not(:disabled) { background: #0a3828; transform: translateY(-1px); }
  .cpl-btn:active { transform: translateY(0); }
  .cpl-btn:disabled { opacity: .6; cursor: not-allowed; }
  .cpl-btn--loading { background: #374151; }
  .cpl-btn--close { background: #6b7280; }
  .cpl-btn--close:hover:not(:disabled) { background: #4b5563; }

  /* Spinner */
  .cpl-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: cpl-spin .7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes cpl-spin { to { transform: rotate(360deg); } }

  /* Analysis panel */
  .cpl-analysis-panel {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1.5px dashed var(--border);
    animation: cpl-slide-in .2s ease;
  }
  @keyframes cpl-slide-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Empty state */
  .cpl-empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--muted);
    font-family: 'DM Sans', sans-serif;
  }
  .cpl-empty-icon { font-size: 2rem; display: block; margin-bottom: .75rem; }
`;