from datetime import datetime, UTC
from enum import Enum
from beanie import Document
from pydantic import BaseModel, Field, EmailStr
from pymongo import IndexModel, ASCENDING


class MessageStatus(str, Enum):
    pending = "pending"
    open = "open"
    closed = "closed"


class MessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Sender's name")
    email: EmailStr = Field(description="Sender's email address")
    message: str = Field(min_length=1, max_length=5000, description="Message body")


class Message(Document, MessageCreate):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="When the message was received")
    status: MessageStatus = Field(default=MessageStatus.pending, description="Message processing status")

    class Settings:
        name = "Message"
        indexes = [
            IndexModel(
                [("email", ASCENDING), ("created_at", ASCENDING), ("status", ASCENDING)],
                unique=True,
                name="email_created_at_status_unique"
            ),
            IndexModel([("email", ASCENDING)], name="email_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]

    def __repr__(self) -> str:
        return f"<Message from={self.email}>"
