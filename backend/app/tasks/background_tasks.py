import asyncio
import dramatiq
import app.dramatiq.dramatiq_config  # noqa: F401 - Configure broker before defining actors
from loguru import logger
from app.services.email.email import EmailService
from app.models.user.model import User

@dramatiq.actor(max_retries=3, store_results=True)
def send_welcome_email_task(user_email: str, token: str) -> bool:
    """Background task to send welcome email"""
    email_service = EmailService()
    email_data = email_service.generate_welcome_email(user_email, token)
    return email_service.send_email(email_data)


@dramatiq.actor(max_retries=3, store_results=True)
def send_reset_password_email_task(user_email: str, token: str) -> bool:
    """Background task to send password reset email"""
    email_service = EmailService()
    email_data = email_service.generate_reset_password_email(user_email, token)
    return email_service.send_email(email_data)


@dramatiq.actor(max_retries=3, store_results=True)
def send_magic_link_email_task(user_email: str, token: str) -> bool:
    email_service = EmailService()
    email_data = email_service.generate_magic_link_email(user_email, token)
    return email_service.send_email(email_data)

@dramatiq.actor(max_retries=3, store_results=True)
def ensure_ri_delete_role(role_id: str) -> dict:
    """
    Remove a role from all users who have it (referential integrity cleanup)
    """
    async def _cleanup_role_references():
        try:
            logger.info(f"Starting referential integrity cleanup for role: {role_id}")
            users_with_role = await User.has_role(role_id)
            updated_users = []
            failed_updates = []
            if not users_with_role:
                logger.info(f"No users found with role {role_id}, cleanup complete")
                return {
                    "role_id": role_id,
                    "users_updated": 0,
                    "updated_user_ids": [],
                    "failed_updates": [],
                    "success": True
                }

            for user in users_with_role:
                try:
                    if user and hasattr(user, 'roles'):
                        original_role_count = len(user.roles)
                        filtered_roles = [role for role in user.roles if str(role) != str(role_id)]

                        if len(filtered_roles) != original_role_count:
                            user.roles = filtered_roles
                            await user.save()
                            updated_users.append(user.id)
                            logger.info(f"Removed role {role_id} from user {user.email}")
                        else:
                            logger.debug(f"User {user.email} did not have role {role_id}")
                except Exception as user_error:
                    logger.error(f"Failed to update user {getattr(user, 'email', 'unknown')}: {user_error}")
                    failed_updates.append({
                        "user_id": str(getattr(user, 'id', 'unknown')),
                        "error": str(user_error)
                    })

            result = {
                "role_id": role_id,
                "users_updated": len(updated_users),
                "updated_user_ids": [str(uid) for uid in updated_users],
                "failed_updates": failed_updates,
                "success": len(failed_updates) == 0
            }

            if failed_updates:
                logger.warning(f"Referential integrity cleanup completed with {len(failed_updates)} failures. Updated {len(updated_users)} users.")
            else:
                logger.info(f"Referential integrity cleanup completed successfully. Updated {len(updated_users)} users.")

            return result

        except Exception as e:
            logger.error(f"Referential integrity cleanup failed for role {role_id}: {e}")
            return {
                "role_id": role_id,
                "users_updated": 0,
                "updated_user_ids": [],
                "failed_updates": [],
                "success": False,
                "error": str(e)
            }

    return asyncio.run(_cleanup_role_references())