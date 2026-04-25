import pytest
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.database import SessionLocal, init_db, Base, engine
from backend.models import Listing, Report, ReportType
from backend.detector import (
    ingest_report,
    analyze_listing,
    compute_trust_score,
    get_rolling_stats,
    Z_SCORE_THRESHOLD,
)

@pytest.fixture(scope="function")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.query(Report).delete()
    db.query(Listing).delete()
    db.commit()
    db.close()

def test_ingest_report_creates_listing(db_session):
    lid = ingest_report(db_session, 999, "spam", datetime.utcnow(), "US")
    assert lid is not None
    listing = db_session.query(Listing).filter(Listing.id == lid).first()
    assert listing is not None
    assert listing.listing_id == "999"

def test_ingest_report_adds_report(db_session):
    lid = ingest_report(db_session, 100, "spam", datetime.utcnow(), "US")
    reports = db_session.query(Report).filter(Report.listing_id == lid).all()
    assert len(reports) == 1
    assert reports[0].type == ReportType.spam

def test_analyze_no_reports(db_session):
    lid = ingest_report(db_session, 200, "spam", datetime.utcnow(), "US")
    res = analyze_listing(db_session, lid)
    assert res["anomaly"] is False
    assert res["counts"]["total_24h"] >= 0

def test_analyze_spike_detection(db_session):
    lid = ingest_report(db_session, 300, "spam", datetime.utcnow(), "US")
    # inject 50 reports to trigger spike
    for i in range(50):
        db_session.add(Report(listing_id=lid, type=ReportType.does_not_exist, timestamp=datetime.utcnow(), region="US"))
    db_session.commit()
    res = analyze_listing(db_session, lid)
    assert res["anomaly"] is True
    assert "Spike" in res["reason"]

def test_analyze_repetition_detection(db_session):
    lid = ingest_report(db_session, 400, "spam", datetime.utcnow(), "US")
    # 20 same type reports
    for i in range(20):
        db_session.add(Report(listing_id=lid, type=ReportType.spam, timestamp=datetime.utcnow(), region="US"))
    db_session.commit()
    res = analyze_listing(db_session, lid)
    assert res["anomaly"] is True
    assert "repetition" in res["reason"].lower()

def test_analyze_region_dispersion(db_session):
    lid = ingest_report(db_session, 500, "spam", datetime.utcnow(), "US")
    # reports from 4 distinct regions
    for region in ["US", "CA", "UK", "DE"]:
        db_session.add(Report(listing_id=lid, type=ReportType.spam, timestamp=datetime.utcnow(), region=region))
    db_session.commit()
    res = analyze_listing(db_session, lid)
    assert res["anomaly"] is True
    assert "distinct regions" in res["reason"]

def test_z_score_anomaly(db_session):
    lid = ingest_report(db_session, 600, "spam", datetime.utcnow(), "US")
    # baseline of 3 reports per day for 30 days = mean 3, std small
    now = datetime.utcnow()
    for i in range(30):
        day = now - timedelta(days=i)
        for _ in range(3):
            db_session.add(Report(listing_id=lid, type=ReportType.spam, timestamp=day, region="US"))
    db_session.commit()
    # now inject 20 in last 24h -> z-score high
    for _ in range(20):
        db_session.add(Report(listing_id=lid, type=ReportType.spam, timestamp=now, region="US"))
    db_session.commit()
    res = analyze_listing(db_session, lid)
    stats = res.get("stats", {})
    z = stats.get("z_score", 0)
    assert z >= Z_SCORE_THRESHOLD or res["anomaly"]

def test_compute_trust_score_drops_on_anomaly(db_session):
    lid = ingest_report(db_session, 700, "spam", datetime.utcnow(), "US")
    listing = db_session.query(Listing).filter(Listing.id == lid).first()
    initial_score = listing.trust_score
    # trigger anomaly
    for i in range(50):
        db_session.add(Report(listing_id=lid, type=ReportType.does_not_exist, timestamp=datetime.utcnow(), region="US"))
    db_session.commit()
    score = compute_trust_score(db_session, lid)
    assert score < initial_score

def test_compute_trust_score_sets_under_review(db_session):
    # Create listing directly (skip ingest to control data)
    from backend.models import Listing
    listing = Listing(listing_id="test-800", name="Test", trust_score=100, status="normal")
    db_session.add(listing)
    db_session.commit()
    lid = listing.id
    # Add 55 reports to trigger spike anomaly (50+ threshold)
    from backend.models import Report, ReportType
    from datetime import datetime
    now = datetime.utcnow()
    for i in range(55):
        db_session.add(Report(listing_id=lid, type=ReportType.spam, timestamp=now, region="US"))
    db_session.commit()
    # compute_trust_score is called once per ingestion event; each call reduces score by 25 if anomaly detected
    # First call: 100 - 25 = 75
    # Second call: 75 - 25 = 50 (under_review)
    compute_trust_score(db_session, lid)
    compute_trust_score(db_session, lid)
    db_session.refresh(listing)
    assert listing.trust_score == 50
    assert listing.status == "under_review"

def test_get_rolling_stats_default(db_session):
    lid = ingest_report(db_session, 900, "spam", datetime.utcnow(), "US")
    stats = get_rolling_stats(db_session, lid)
    assert "mean" in stats
    assert "std" in stats