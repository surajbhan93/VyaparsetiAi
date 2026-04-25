import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
TO_EMAIL = os.getenv("TO_EMAIL", "")

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
PAGERDUTY_KEY = os.getenv("PAGERDUTY_KEY", "")

def send_email(subject: str, body: str):
    if not SMTP_USER or not TO_EMAIL:
        logger.warning("Email not configured - skipping")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = TO_EMAIL
        msg.attach(MIMEText(body, "html"))
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, TO_EMAIL, msg.as_string())
        logger.info(f"Email sent: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def send_slack_alert(text: str):
    if not SLACK_WEBHOOK_URL:
        logger.warning("Slack webhook not configured - skipping")
        return False
    try:
        payload = {"text": text}
        r = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
        logger.info(f"Slack alert sent: {text[:50]}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Slack alert: {e}")
        return False

def send_webhook_alert(payload: dict):
    if not WEBHOOK_URL:
        logger.warning("Webhook not configured - skipping")
        return False
    try:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
        logger.info(f"Webhook alert sent")
        return True
    except Exception as e:
        logger.error(f"Failed to send webhook: {e}")
        return False

def notify(listing_id: int, reason: str, trust_score: int, listing_name: str = ""):
    subject = f"[Alert] Suspicious activity on listing {listing_id}"
    body_html = f"""
    <h2>Suspicious Activity Detected</h2>
    <p><strong>Listing ID:</strong> {listing_id}</p>
    <p><strong>Name:</strong> {listing_name}</p>
    <p><strong>Reason:</strong> {reason}</p>
    <p><strong>Trust Score:</strong> {trust_score}</p>
    <p>Please review and take necessary action.</p>
    """
    text = f"Alert: Listing {listing_id} - {reason} (Trust: {trust_score})"
    
    send_email(subject, body_html)
    send_slack_alert(text)
    send_webhook_alert({"listing_id": listing_id, "reason": reason, "trust_score": trust_score, "listing_name": listing_name})