import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class ReportType(enum.Enum):
    edit_suggest = "edit_suggest"
    close_or_remove = "close_or_remove"
    spam = "spam"
    does_not_exist = "does_not_exist"

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(String, unique=True, index=True)
    name = Column(String)
    country = Column(String)
    region = Column(String)
    trust_score = Column(Integer, default=100)
    status = Column(String, default="normal")  # normal / under_review / flagged

    reports = relationship("Report", back_populates="listing", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="listing", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    type = Column(Enum(ReportType))
    timestamp = Column(DateTime)
    region = Column(String)

    listing = relationship("Listing", back_populates="reports")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    timestamp = Column(DateTime)
    reason = Column(String)
    score_change = Column(Integer)

    listing = relationship("Listing", back_populates="alerts")
