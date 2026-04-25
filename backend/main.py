from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import SessionLocal, init_db
from .detector import ingest_report, analyze_listing, compute_trust_score, maybe_alert
from .models import Listing, Report, Alert
from .notifications import notify
import datetime as dt
import datetime
from sqlalchemy import func

app = FastAPI(title="Abuse Detection & Protection System (Ethical)")

@app.on_event("startup")
def startup_event():
    init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ReportInput(BaseModel):
    listing_id: int
    report_type: str
    region: str | None = None
    timestamp: int | None = None  # epoch seconds

class ListingInput(BaseModel):
    listing_id: str
    name: str | None = None
    country: str | None = None
    region: str | None = None

@app.post("/init-listing")
def init_listing(payload: ListingInput, db: Session = Depends(get_db)):
    l = Listing(listing_id=payload.listing_id, name=payload.name or "", country=payload.country, region=payload.region)
    db.add(l)
    db.commit()
    db.refresh(l)
    return {"status": "created", "listing_id": l.id}

@app.post("/reports/ingest")
def ingest(payload: ReportInput, db: Session = Depends(get_db)):
    ts = payload.timestamp
    if ts is None:
        ts = int(dt.datetime.utcnow().timestamp())
    listing_id = ingest_report(db, payload.listing_id, payload.report_type, dt.datetime.utcfromtimestamp(ts), payload.region)
    score = compute_trust_score(db, listing_id)
    det = analyze_listing(db, listing_id)
    if det.get("anomaly"):
        reason = det.get("reason", "Anomalous activity detected")
        maybe_alert(db, listing_id, reason, score_change=-25)
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if listing:
            notify(listing_id, reason, score or 0, listing.name or "")
    return {"listing_id": listing_id, "trust_score": score, "anomaly": det.get("anomaly"), "reason": det.get("reason")}

@app.get("/listings/{id}")
def get_listing(id: int, db: Session = Depends(get_db)):
    l = db.query(Listing).filter(Listing.id == id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {
        "id": l.id,
        "listing_id": l.listing_id,
        "name": l.name,
        "region": l.region,
        "country": l.country,
        "trust_score": l.trust_score,
        "status": l.status,
    }

@app.get("/listings/{id}/score")
def get_score(id: int, db: Session = Depends(get_db)):
    l = db.query(Listing).filter(Listing.id == id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Listing not found")
    det = analyze_listing(db, id)
    return {"trust_score": l.trust_score, "anomaly": det.get("anomaly"), "reason": det.get("reason")}

@app.get("/listings")
def list_all_listings(db: Session = Depends(get_db)):
    listings = db.query(Listing).all()
    return [{"id": l.id, "listing_id": l.listing_id, "name": l.name, "trust_score": l.trust_score, "status": l.status} for l in listings]

@app.get("/alerts/{listing_id}")
def get_alerts(listing_id: int, db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.listing_id == listing_id).order_by(Alert.timestamp.desc()).all()
    return [{"id": a.id, "reason": a.reason, "score_change": a.score_change, "timestamp": a.timestamp.isoformat()} for a in alerts]

@app.get("/reports/{listing_id}/history")
def get_report_history(listing_id: int, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    daily = db.query(
        func.date(Report.timestamp).label("date"),
        func.count(Report.id).label("count")
    ).filter(
        Report.listing_id == listing_id
    ).group_by("date").all()
    return [{"date": str(row.date), "count": row.count} for row in daily]
