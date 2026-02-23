from fastapi import APIRouter, BackgroundTasks, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.contact.model import ContactMessage, ContactMessageCreate
from app.models.util.model import Message
from app.utills.email.email import EmailService
from app.tasks.background_tasks import send_contact_notification_task, send_contact_confirmation_task

limiter = Limiter(key_func=get_remote_address)

contact_router = APIRouter(tags=["Contact"], prefix="/contact")


@contact_router.post("", response_model=Message)
@limiter.limit("5/minute")
async def submit_contact_message(
    request: Request,
    body: ContactMessageCreate,
    bg: BackgroundTasks,
) -> Message:
    message = ContactMessage(**body.model_dump())
    await message.insert()

    email_service = EmailService()
    bg.add_task(send_contact_notification_task, email_service, body)
    bg.add_task(send_contact_confirmation_task, email_service, body)

    return Message(message="Message sent successfully")
