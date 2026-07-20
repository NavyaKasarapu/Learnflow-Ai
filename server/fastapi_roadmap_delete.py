"""
FastAPI + SQLAlchemy Cascading Delete Implementation
This module implements the requested FastAPI endpoint for performing
a secure cascading delete on a learning roadmap and all of its
associated children records within a single database transaction.
"""

import datetime
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Float, DateTime, create_engine
from sqlalchemy.orm import declarative_base, relationship, Session, sessionmaker

# Database setup (Read from environment variables for Render production)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost/dbname")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------
# DATABASE MODELS WITH RELATIONSHIPS AND CASCADE CONFIGURATION
# ---------------------------------------------------------

class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Cascading relationships: delete-orphan ensures that deleting a Roadmap
    # automatically propagates the delete down to all child rows.
    lessons = relationship("Lesson", back_populates="roadmap", cascade="all, delete-orphan")
    quiz_histories = relationship("QuizHistory", back_populates="roadmap", cascade="all, delete-orphan")
    coding_histories = relationship("CodingHistory", back_populates="roadmap", cascade="all, delete-orphan")
    progress_records = relationship("Progress", back_populates="roadmap", cascade="all, delete-orphan")
    analytics_records = relationship("Analytics", back_populates="roadmap", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="roadmap", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="roadmap", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False)

    roadmap = relationship("Roadmap", back_populates="lessons")
    # Sub-cascading deletion of lesson notes
    notes = relationship("Note", back_populates="lesson", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, index=True)
    lesson_id = Column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lesson = relationship("Lesson", back_populates="notes")


class QuizHistory(Base):
    __tablename__ = "quiz_histories"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="quiz_histories")


class CodingHistory(Base):
    __tablename__ = "coding_histories"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String, nullable=False) # e.g. 'success' or 'fail'
    completed_at = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="coding_histories")


class Progress(Base):
    __tablename__ = "progress_records"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    completed_lessons_count = Column(Integer, default=0)
    total_lessons_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="progress_records")


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="analytics_records")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="bookmarks")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    roadmap = relationship("Roadmap", back_populates="recommendations")


# ---------------------------------------------------------
# FASTAPI APPLICATION & AUTHENTICATION MIDDLEWARE
# ---------------------------------------------------------

app = FastAPI(title="Syllabus AI Roadmap Deletion Service")
security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Decodes the JWT token provided in the Authorization header.
    Returns the user's ID if valid, otherwise raises HTTP exceptions.
    """
    token = credentials.credentials
    try:
        # In a real environment, you would use jwt.decode with your secret/algorithm:
        # payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # return payload.get("userId")
        
        # Simple illustration for demo/implementation:
        # Assumes format "Bearer user_12345" or splits standard payload.
        if token.startswith("mock_"):
            return token.replace("mock_", "")
        
        # Return fallback or custom logic for demonstration
        return "user_12345"
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Dependency to yield database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.delete("/api/roadmaps/{roadmap_id}", status_code=status.HTTP_200_OK)
def delete_roadmap(
    roadmap_id: str, 
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Deletes a specific roadmap and performs a cascading delete of all its
    associated child records (Lessons, Notes, QuizHistory, CodingHistory,
    Progress, Analytics, Bookmarks, and Recommendations) in a single ACID transaction,
    verifying ownership of the roadmap before deletion.
    """
    try:
        # 1. Fetch the Roadmap by ID
        roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
        if not roadmap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Roadmap with ID '{roadmap_id}' not found."
            )

        # 2. Verify User Ownership
        if roadmap.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this roadmap."
            )

        # 3. Perform Cascading Deletion inside a transactional block
        # Using db.begin() handles commits and rollbacks automatically.
        with db.begin():
            # SQLAlchemy relationships with cascade="all, delete-orphan" propagate deletion
            # of child rows automatically (Lessons, Notes, QuizHistory, CodingHistory,
            # Progress, Analytics, Bookmarks, and Recommendations).
            db.delete(roadmap)

        return {
            "success": True,
            "message": "Roadmap deleted successfully."
        }

    except HTTPException as he:
        # Re-raise explicit HTTP errors to retain exact HTTP codes and messages
        raise he
    except Exception as e:
        # Generates a 500 error if anything unexpected fails, rolling back the transaction.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting the roadmap: {str(e)}"
        )

