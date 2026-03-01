from beanie import PydanticObjectId
from fastapi import HTTPException
from loguru import logger

from app.contact.model import Message, MessageStatus
from app.utills.email.email import EmailService


class MessageService:

    async def list_messages(
        self,
        status: MessageStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Message]:
        query = Message.find()
        if status is not None:
            query = query.find(Message.status == status)
        return await query.sort("-created_at").skip(skip).limit(limit).to_list()

    async def get_message(self, message_id: str) -> Message:
        try:
            obj_id = PydanticObjectId(message_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid message ID")
        msg = await Message.get(obj_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        return msg

    async def update_status(self, message_id: str, status: MessageStatus) -> Message:
        msg = await self.get_message(message_id)
        msg.status = status
        await msg.save()
        logger.info("Updated message {} status to {}", message_id, status)
        return msg

    async def delete_message(self, message_id: str) -> None:
        msg = await self.get_message(message_id)
        await msg.delete()
        logger.info("Deleted message {}", message_id)

    async def reply(
        self,
        message_id: str,
        reply_text: str,
        email_service: EmailService,
    ) -> None:
        msg = await self.get_message(message_id)
        email_data = email_service.generate_reply_email(
            recipient_name=msg.name,
            recipient_email=str(msg.email),
            reply_text=reply_text,
        )
        await email_service.send_email_async(email_data)
        logger.info("Sent reply to {} for message {}", msg.email, message_id)
