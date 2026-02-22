from typing import TypeVar
from fastapi import HTTPException, Depends, Request
from app.core.security.api import  reusable_oauth
from app.models.auth.model import Token, Policy, RefreshTokenReq
from app.models.role.model import Role
from app.models.user.model import User
from app.services.auth.auth_service import SecurityService, AuthService
from app.services.dramatiq.dramatiq_service import DramatiqService
from app.services.email.email import EmailService
from app.services.role.role_service import RoleService
from app.services.user.user_service import UserService, MyUserService

T = TypeVar('T')


def get_role_service() -> RoleService:
    """Dependency to get role service instance"""
    return RoleService()

def get_email_service():
    return EmailService()


def get_security_service() -> SecurityService:
    return SecurityService(password_policy=Policy())


def get_auth_service(security_service=Depends(get_security_service)) -> AuthService:
    return AuthService(security_service)

def get_dramatiq_service(request: Request) -> DramatiqService:
    return DramatiqService(request.app.state.redis_client)

def get_user_service(
        email_service: EmailService = Depends(get_email_service),
        auth_service: AuthService = Depends(get_auth_service),
):
    return UserService(email_service, auth_service)


def valid_token(token: str,
                security_service: SecurityService = Depends(get_security_service)
                ):
    return security_service.validate_access_token(token)


def valid_access_token(token: str = Depends(reusable_oauth),
                       security_service: SecurityService = Depends(get_security_service)
                       ):
    return security_service.validate_access_token(token)


def validate_refresh_token(req: RefreshTokenReq,
                           security_service: SecurityService = Depends(get_security_service)
                           ) -> Token:
    return security_service.validate_access_token(req.refreshToken)


def validate_link_token(token: str,
                        security_service: SecurityService = Depends(get_security_service)
                        ) -> Token:
    if token.startswith("Bearer "):
        token = token[7:]
    return security_service.validate_access_token(token)


async def current_user(
        token: Token = Depends(valid_access_token),
        user_service=Depends(get_user_service)
) -> User:
    """Access the current user. If a token is not provided it will fall back on API key."""
    if not token:
        raise HTTPException(401, "Not authenticated.")
    return await user_service.current_user(token)


def get_self_user_service(me: User = Depends(current_user)):
    return MyUserService(me)


async def admin_access(user: User = Depends(current_user)) -> User:
    user_roles = [r.name for r in await user.user_roles()]
    if "admin" in user_roles:
        return user
    else:
        raise HTTPException(
            status_code=401, detail="Not enough privileges."
        )


class CheckScope:
    def __init__(self, scope: str):
        self.scope = scope

    async def __call__(self, user: User = Depends(current_user)):
        if user._using_api_key:
            if self.scope in user._api_key.scopes:
                return
            else:
                raise HTTPException(status_code=403, detail=f"API key is missing scope: {self.scope}")
        else:
            user_roles = await user.user_roles()
            if not user_roles:
                raise HTTPException(status_code=403,
                                    detail="User is not authorized to access, or does not contain any roles")
            all_roles: dict[str, Role] = {r.name: r for r in (await Role.all().to_list())}
            for role in user_roles:
                if role.name == "admin":
                    """User is an admin. Has global access"""
                    return
                if self.scope in all_roles[role.name].scopes:
                    """Scope is in role scopes, and user has it assigned"""
                    return
            else:
                raise HTTPException(status_code=403, detail=f"Missing scope: {self.scope}")
