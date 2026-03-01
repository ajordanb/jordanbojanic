from fastapi import APIRouter, Depends
from app.contact.model import MessageOut, MessageUpdate, MessageReply, MessageStatus
from app.contact.service import MessageService
from app.models.util.model import Message as UtilMessage
from app.utills.dependencies import admin_access, CheckScope
from app.utills.email.email import EmailService

read_scope = Depends(CheckScope("messages.read"))
write_scope = Depends(CheckScope("messages.write"))


def get_message_service() -> MessageService:
    return MessageService()


def get_email_service() -> EmailService:
    return EmailService()


admin_message_router = APIRouter(
    prefix="/messages",
    tags=["Messages (Admin)"],
)


@admin_message_router.get(
    "",
    response_model=list[MessageOut],
    dependencies=[Depends(admin_access), read_scope],
)
async def list_messages(
    status: MessageStatus | None = None,
    skip: int = 0,
    limit: int = 50,
    service: MessageService = Depends(get_message_service),
) -> list[MessageOut]:
    messages = await service.list_messages(status=status, skip=skip, limit=limit)
    return [MessageOut.from_doc(m) for m in messages]


@admin_message_router.get(
    "/{message_id}",
    response_model=MessageOut,
    dependencies=[Depends(admin_access), read_scope],
)
async def get_message(
    message_id: str,
    service: MessageService = Depends(get_message_service),
) -> MessageOut:
    msg = await service.get_message(message_id)
    return MessageOut.from_doc(msg)


@admin_message_router.patch(
    "/{message_id}",
    response_model=MessageOut,
    dependencies=[Depends(admin_access), write_scope],
)
async def update_message_status(
    message_id: str,
    body: MessageUpdate,
    service: MessageService = Depends(get_message_service),
) -> MessageOut:
    msg = await service.update_status(message_id, body.status)
    return MessageOut.from_doc(msg)


@admin_message_router.delete(
    "/{message_id}",
    response_model=UtilMessage,
    dependencies=[Depends(admin_access), write_scope],
)
async def delete_message(
    message_id: str,
    service: MessageService = Depends(get_message_service),
) -> UtilMessage:
    await service.delete_message(message_id)
    return UtilMessage(message="Message deleted successfully")


@admin_message_router.post(
    "/{message_id}/reply",
    response_model=UtilMessage,
    dependencies=[Depends(admin_access), write_scope],
)
async def reply_to_message(
    message_id: str,
    body: MessageReply,
    service: MessageService = Depends(get_message_service),
    email_service: EmailService = Depends(get_email_service),
) -> UtilMessage:
    await service.reply(message_id, body.reply_text, email_service)
    return UtilMessage(message="Reply sent successfully")
