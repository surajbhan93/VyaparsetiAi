from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import Listing, Report, ReportType
from .database import SessionLocal

Z_SCORE_THRESHOLD = 2.5
DEFAULT_MEAN = 5.0
DEFAULT_STD = 2.0

def ingest_report(db: Session, listing_id: int, report_type: str, timestamp=None, region=None):
    listing = db.query(Listing).filter(Listing.listing_id == str(listing_id)).first()
    if listing is None:
        listing = Listing(listing_id=str(listing_id), name="Unknown", region=region or "")
        db.add(listing)
        db.commit()
        db.refresh(listing)
    r = Report(listing_id=listing.id, type=ReportType(report_type), timestamp=timestamp or datetime.utcnow(), region=region)
    db.add(r)
    db.commit()
    return listing.id

def get_rolling_stats(db: Session, listing_id: int, window_days: int = 30):
    now = datetime.utcnow()
    start = now - timedelta(days=window_days)
    daily_counts = db.query(
        func.date(Report.timestamp).label("day"),
        func.count(Report.id).label("count")
    ).filter(
        Report.listing_id == listing_id,
        Report.timestamp >= start
    ).group_by("day").all()

    counts = [row.count for row in daily_counts]
    if not counts:
        return {"mean": DEFAULT_MEAN, "std": DEFAULT_STD, "baseline": DEFAULT_MEAN}
    mean_val = sum(counts) / len(counts)
    variance = sum((c - mean_val) ** 2 for c in counts) / len(counts)
    std_val = variance ** 0.5
    return {"mean": mean_val, "std": std_val if std_val > 0 else 1.0, "baseline": mean_val}

def analyze_listing(db: Session, listing_id: int):
    now = datetime.utcnow()
    day24 = now - timedelta(hours=24)
    reports = db.query(Report).filter(Report.listing_id == listing_id, Report.timestamp >= day24).all()
    total_24h = len(reports)

    type_counts = {}
    for r in reports:
        t = r.type.value if hasattr(r.type, 'value') else str(r.type)
        type_counts[t] = type_counts.get(t, 0) + 1
    max_type = max(type_counts.values()) if type_counts else 0

    regions = set([r.region for r in reports if r.region])
    region_count = len(regions)

    stats = get_rolling_stats(db, listing_id)
    if stats["std"] > 0:
        z_score = (total_24h - stats["mean"]) / stats["std"]
    else:
        z_score = 0.0

    anomaly = False
    reason = ""
    if total_24h >= 50:
        anomaly = True
        reason = f"Spike: {total_24h} reports in 24h"
    elif z_score >= Z_SCORE_THRESHOLD:
        anomaly = True
        reason = f"Z-score anomaly: z={z_score:.2f} (baseline mean={stats['mean']:.1f})"
    if max_type >= 20:
        anomaly = True
        reason = reason or f"High repetition of same type: {max_type}"
    if region_count >= 4:
        anomaly = True
        reason = reason or f"Reports from {region_count} distinct regions"

    return {
        "listing_id": listing_id,
        "anomaly": anomaly,
        "reason": reason,
        "counts": {"total_24h": total_24h, "type_counts": type_counts, "regions": region_count},
        "stats": {"mean": stats["mean"], "std": stats["std"], "z_score": z_score}
    }

def compute_trust_score(db: Session, listing_id: int):
    res = analyze_listing(db, listing_id)
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing is None:
        return None
    score = listing.trust_score or 100
    if res["anomaly"]:
        score = max(0, score - 25)
    listing.trust_score = score
    if score < 70:
        listing.status = "under_review"
    db.commit()
    return score

def maybe_alert(db: Session, listing_id: int, reason: str, score_change: int = 0):
    from .models import Alert
    alert = Alert(listing_id=listing_id, timestamp=datetime.utcnow(), reason=reason, score_change=score_change)
    db.add(alert)
    db.commit()

def send_notification(listing_id: int, reason: str, trust_score: int):
    print(f"[ALERT] Listing {listing_id}: {reason}")
    print(f"[ALERT] Current trust score: {trust_score}")
    print("[ALERT] Notification would be sent via email/webhook (stub)")