Abuse Detection & Reputation Protection System (Ethical)

Overview
- A safe MVP to detect suspicious mass-reporting patterns against your own Google Maps listings and trigger alerts for review.
- Ingest reports, run lightweight anomaly detection, maintain a trust score, and notify business owners when anomalies occur.

How it works (high-level)
- Data Monitoring: Collects reports with timestamp, type, and region for each listing.
- Anomaly Detection: Looks for spikes, repeated types, and geographic dispersion within a 24h window.
- Trust Scoring: Updates a trust score and toggles listing status to under_review when needed.
- Alerts: Creates an alert entry and can be wired to email/SMS in a production deployment.

Usage (quick start)
- Install dependencies from backend/requirements.txt
- Run the API: uvicorn backend.main:app --reload
- Ingest a listing and reports via the API endpoints.

Notes
- This is an ethical detection tool for businesses to defend their own listings. Do not use to interfere with others' data.
