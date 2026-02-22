from fastapi import APIRouter, Depends, Body, HTTPException, Request
from app.core.security.helpers import password_authenticated_user, client_id_authenticated_user
from app.models.auth.model import SocialLoginRequest, Token

from app.core.security.api import (
    CustomOAuth2RequestForm,
)
from app.models.auth.model import RefreshToken
from app.core.security.social import provider_map
from app.core.config import settings
from app.models.user.model import User
from app.services.auth.auth_service import AuthService
from app.utills.dependencies import get_auth_service, validate_refresh_token, validate_link_token

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

auth_router = APIRouter(tags=["Authentication"], prefix="/auth")


@auth_router.post("/token")
@limiter.limit("10/minute")
async def login_ep(
        request: Request,
        form: CustomOAuth2RequestForm = Depends(),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    if form.username and form.password:
        user = await password_authenticated_user(form)
        provider = "username_password"
    elif form.client_id:
        user = await client_id_authenticated_user(form)
        provider = "client_id"
    else:
        raise HTTPException(401, "No login info")

    scopes, user_role_names = await user.get_user_scopes_and_roles()

    if user._using_api_key:
        access_token, at_expires = auth_service.create_access_token(
            subject=user.email,
            client_id=user._api_key.client_id
        )
        refresh_token, rt_expires = auth_service.create_refresh_token(
            subject=user.email,
            client_id=user._api_key.client_id
        )
    else:
        access_token, at_expires = auth_service.create_access_token(
            subject=user.email,
            scopes=scopes,
            roles=user_role_names
        )
        refresh_token, rt_expires = auth_service.create_refresh_token(
            subject=user.email,
            scopes=scopes,
            roles=user_role_names
        )

    user.log_login(payload={
        "source": "token_login",
        "provider": provider,
    })
    await user.save()

    return RefreshToken(
        accessToken=access_token,
        accessTokenExpires=at_expires,
        refreshToken=refresh_token,
        refreshTokenExpires=rt_expires,
    )


@auth_router.post("/social_login")
@limiter.limit("10/minute")
async def social_login_ep(
        request: Request,
        req: SocialLoginRequest,
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    email = await provider_map[req.provider](req.data, req.redirect_url)
    user = await User.by_email(email)

    if user is None:
        if not settings.allow_new_users:
            raise HTTPException(
                status_code=403,
                detail="New users are not allowed in this environment",
            )
        user = User(email=email, source=req.provider)
        await user.save()

    scopes, user_role_names = await user.get_user_scopes_and_roles()

    tokens = auth_service.create_token_pair(
        subject=user.email,
        scopes=scopes,
        roles=user_role_names
    )

    user.log_login(payload={
        "source": "social_login",
        "provider": req.provider,
    })
    await user.save()

    return RefreshToken(
        accessToken=tokens["access_token"],
        accessTokenExpires=tokens["access_expires_at"],
        refreshToken=tokens["refresh_token"],
        refreshTokenExpires=tokens["refresh_expires_at"],
    )


@auth_router.post("/refresh")
@limiter.limit("20/minute")
async def refresh(
        request: Request,
        token_data: Token = Depends(validate_refresh_token),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    """Returns a new access token from a refresh token"""
    user = await User.by_email(token_data.sub)
    scopes, user_role_names = await user.get_user_scopes_and_roles()
    access_token, at_expires = auth_service.create_access_token(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=scopes,
        roles=user_role_names
    )
    refresh_token, rt_expires = auth_service.create_refresh_token(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=token_scopes,
        roles=token_roles
    )

    return RefreshToken(
        accessToken=access_token,
        accessTokenExpires=at_expires,
        refreshToken=refresh_token,
        refreshTokenExpires=rt_expires,
    )


@auth_router.post("/validate_magic_link")
@limiter.limit("10/minute")
async def validate_magic_link(
        request: Request,
        token_data=Depends(validate_link_token),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    user = await User.by_email(token_data.sub)
    scopes, user_role_names = await user.get_user_scopes_and_roles()
    tokens = auth_service.create_token_pair(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=scopes,
        roles=user_role_names
    )
    user.log_login(payload={
        "source": "magic_link",
        "provider": "email",
    })
    await user.save()
    return RefreshToken(
        accessToken=tokens["access_token"],
        accessTokenExpires=tokens["access_expires_at"],
        refreshToken=tokens["refresh_token"],
        refreshTokenExpires=tokens["refresh_expires_at"],
    )


@auth_router.post("/check_password")
async def check_password_strength(
        password: str = Body(...),
        auth_service: AuthService = Depends(get_auth_service)  # FIXED: Add dependency parameter
):
    try:
        is_valid = auth_service.security_service.validate_password_strength(password)
        return {"valid": is_valid, "message": "Password meets requirements"}
    except HTTPException as e:
        return {"valid": False, "message": e.detail}


