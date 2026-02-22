from pathlib import Path
from jinja2 import  Environment, FileSystemLoader
from typing import Any
import emails
import asyncio
from concurrent.futures import ThreadPoolExecutor
from loguru import logger

from app.core.config import settings
from app.models.util.model import EmailData




class EmailService:
    def __init__(self):
        template_dir = Path(__file__).parent / "email-templates" / "built"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        self.executor = ThreadPoolExecutor(max_workers=2)

    def render_email_template(self,
                              template_name: str,
                              context: dict[str, Any]) -> str:
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(context)
        except Exception as e:
            logger.error(f"Failed to render email template {template_name}: {e}")
            raise

    async def send_email_async(self, email: EmailData) -> bool:
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(self.executor, self._send_email_sync, email)
            return result
        except Exception as e:
            logger.error(f"Failed to send email to {email.to}: {e}")
            return False

    def _send_email_sync(self, email: EmailData) -> bool:
        if not settings.emails_enabled:
            logger.warning("Email sending is disabled in settings")
            return False
        try:
            message = emails.Message(
                subject=email.subject,
                html=email.html_content,
                mail_from=(settings.emails_from_name, settings.emails_from_email),
            )

            for attachment in email.attachments or []:
                message.attach(filename=attachment.file_name, data=attachment.file_data)
            smtp_options = {
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "timeout": 30  # Add timeout
            }
            if settings.smtp_tls:
                smtp_options["tls"] = True
            elif settings.smtp_ssl:
                smtp_options["ssl"] = True

            if settings.smtp_user:
                smtp_options["user"] = settings.smtp_user
            if settings.smtp_password:
                smtp_options["password"] = settings.smtp_password

            response = message.send(to=email.to, smtp=smtp_options)
            if response.status_code == 250:
                logger.info(f"Email sent successfully to {email.to}")
                return True
            else:
                logger.error(f"Failed to send email to {email.to}: {response}")
                return False

        except Exception as e:
            logger.error(f"Error sending email to {email.to}: {e}")
            return False

    def send_email(self, email: EmailData) -> bool:
        return self._send_email_sync(email)

    def generate_reset_password_email(self, reset_email: str, token: str) -> EmailData:
        subject = f"Password recovery for {reset_email}"
        link = f"{settings.app_domain}/password_reset?token={token}&email={reset_email}"
        logger.debug(f"Generated reset link: {link}")
        context = {
            "reset_email": reset_email,
            "valid_minutes": settings.email_reset_token_expire_minutes,
            "reset_link": link,
            "app_name": getattr(settings, 'app_name', 'Your App'),
        }
        logger.debug(f"Template context: {context}")
        html_content = self.render_email_template(
            template_name="reset_password.html",
            context=context,
        )
        return EmailData(to=reset_email, html_content=html_content, subject=subject)

    def generate_magic_link_email(self, user_email: str, token: str) -> EmailData:
        subject = f"Magic link for {user_email}"
        link = f"{settings.app_domain}/magic_link?code={token}"
        html_content = self.render_email_template(
            template_name="magic_link.html",
            context={
                "user_email": user_email,
                "valid_minutes": settings.email_reset_token_expire_minutes,
                "magic_link": link,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            }
        )
        return EmailData(to=user_email, html_content=html_content, subject=subject)

    def generate_welcome_email(self, user_email: str, token: str) -> EmailData:
        subject = f"Welcome to {getattr(settings, 'app_name', 'our platform')}!"
        link = f"{settings.app_domain}/set_password?token={token}&email={user_email}"
        html_content = self.render_email_template(
            template_name="welcome_email.html",
            context={
                "user_email": user_email,
                "valid_minutes": settings.email_reset_token_expire_minutes,
                "setup_link": link,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            },
        )
        return EmailData(to=user_email, html_content=html_content, subject=subject)


    async def send_welcome_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_welcome_email(user_email, token)
        return await self.send_email_async(email_data)

    async def send_reset_password_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_reset_password_email(user_email, token)
        return await self.send_email_async(email_data)

    async def send_magic_link_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_magic_link_email(user_email, token)
        return await self.send_email_async(email_data)

    def __del__(self):
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
