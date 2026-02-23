from datetime import datetime, UTC
from beanie import Document
from pydantic import BaseModel, Field, EmailStr


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Sender's name")
    email: EmailStr = Field(description="Sender's email address")
    message: str = Field(min_length=1, max_length=5000, description="Message body")


class ContactMessage(Document, ContactMessageCreate):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="When the message was received")

    class Settings:
        name = "ContactMessage"

    def __repr__(self) -> str:
        return f"<ContactMessage from={self.email}>"
