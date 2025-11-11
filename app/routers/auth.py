"""Authentication routes."""

from datetime import datetime, UTC
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import CurrentActiveUser, get_current_user
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserRegister
from app.schemas.password_reset import (
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetResponse,
)
from app.schemas.user import UserRead
from app.utils.deprecation import migration_target

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@migration_target("sublayers_server.handlers.site_auth.StandardLoginHandler (register)")
async def register(user_data: UserRegister) -> User:
    """
    Register a new user.

    Creates a new user account with email and password.
    """
    from app.core.validators import validate_email, validate_password, validate_username
    from app.core.exceptions import DatabaseException, safe_database_operation

    # Validate input
    email = validate_email(user_data.email)
    username = validate_username(user_data.username)
    validate_password(user_data.password)

    try:
        # Check if user already exists
        existing_user = await User.find_one(
            (User.email == email) | (User.username == username)
        )

        if existing_user:
            if existing_user.email == email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )

        # Create new user
        user = User(
            email=email,
            username=username,
            display_name=user_data.display_name or username,
            hashed_password=get_password_hash(user_data.password),
        )

        await user.insert()
        return user

    except HTTPException:
        raise
    except Exception as e:
        raise DatabaseException("Failed to register user", original_error=e)


@router.post("/login", response_model=Token)
@migration_target("sublayers_server.handlers.site_auth.StandardLoginHandler (login)")
async def login(user_data: UserLogin) -> dict[str, str]:
    """
    Login with email and password.

    Returns JWT access token.
    """
    from app.core.validators import validate_email
    from app.core.exceptions import DatabaseException
    import logging

    logger = logging.getLogger(__name__)

    # Validate input
    email = validate_email(user_data.email)

    try:
        # Find user by email
        user = await User.find_one(User.email == email)

        if not user or not verify_password(user_data.password, user.hashed_password):
            # Log failed login attempt (without password!)
            logger.warning(f"Failed login attempt for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )

        # Update last login
        user.last_login = datetime.now(UTC)
        await user.save()

        logger.info(f"User logged in successfully: {user.username}")

        # Create access token with user metadata
        access_token = create_access_token(
            subject=str(user.id),
            user_data={
                "email": user.email,
                "username": user.username,
                "access_level": user.access_level,
                "is_active": user.is_active,
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {email}: {e}")
        raise DatabaseException("Login failed", original_error=e)


@router.post("/login/token", response_model=Token)
async def login_oauth2(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> dict[str, str]:
    """
    OAuth2 compatible token login.

    Uses username field for email.
    Required for Swagger UI authentication.
    """
    # OAuth2PasswordRequestForm uses 'username' field
    user = await User.find_one(User.email == form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Update last login
    user.last_login = datetime.now(UTC)
    await user.save()

    # Create access token with user metadata
    access_token = create_access_token(
        subject=str(user.id),
        user_data={
            "email": user.email,
            "username": user.username,
            "access_level": user.access_level,
            "is_active": user.is_active,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
@migration_target("sublayers_server.handlers.site_auth.LogoutHandler")
async def logout(current_user: CurrentActiveUser) -> dict[str, str]:
    """
    Logout current user.

    Note: JWT tokens are stateless, so logout is handled client-side
    by discarding the token. This endpoint is for compatibility.
    """
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
async def get_current_user_info(
    current_user: Annotated[User | None, Depends(get_current_user)]
) -> User:
    """
    Get current user information.

    Requires authentication.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    return current_user


@router.get("/verify")
async def verify_token(
    current_user: Annotated[User | None, Depends(get_current_user)]
) -> dict[str, bool]:
    """
    Verify if current token is valid.

    Returns authentication status.
    """
    return {
        "authenticated": current_user is not None,
        "user_id": str(current_user.id) if current_user else None
    }


@router.post("/password-reset/request", response_model=PasswordResetResponse)
async def request_password_reset(data: PasswordResetRequest) -> PasswordResetResponse:
    """
    Request password reset.

    Sends password reset email with token.
    Returns success even if email not found (security).
    """
    from app.core.validators import validate_email
    from app.core.password_reset import PasswordResetToken, send_password_reset_email
    from app.core.exceptions import DatabaseException
    import logging

    logger = logging.getLogger(__name__)

    # Validate email
    email = validate_email(data.email)

    try:
        # Find user by email
        user = await User.find_one(User.email == email)

        if user and user.is_active:
            # Create reset token
            token = PasswordResetToken.create_token(
                user_id=str(user.id),
                email=user.email,
                expires_in=3600  # 1 hour
            )

            # Send reset email
            await send_password_reset_email(user.email, token)

            logger.info(f"Password reset requested for {email}")
        else:
            # Don't reveal if user exists (security)
            logger.warning(f"Password reset requested for non-existent user: {email}")

        # Always return success to prevent email enumeration
        return PasswordResetResponse(
            message="If that email exists, a password reset link has been sent.",
            email=email
        )

    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        # Still return success to prevent information leakage
        return PasswordResetResponse(
            message="If that email exists, a password reset link has been sent.",
            email=email
        )


@router.post("/password-reset/confirm", response_model=PasswordResetResponse)
async def confirm_password_reset(data: PasswordResetConfirm) -> PasswordResetResponse:
    """
    Confirm password reset with token.

    Updates user password if token is valid.
    """
    from app.core.validators import validate_password
    from app.core.password_reset import PasswordResetToken
    from app.core.exceptions import DatabaseException
    import logging

    logger = logging.getLogger(__name__)

    # Validate new password
    validate_password(data.new_password)

    # Verify token
    token_data = PasswordResetToken.verify_token(data.token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    try:
        # Get user
        user = await User.get(token_data["user_id"])

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Update password
        user.hashed_password = get_password_hash(data.new_password)
        await user.save()

        # Invalidate token (one-time use)
        PasswordResetToken.invalidate_token(data.token)

        logger.info(f"Password reset successful for user {user.username}")

        return PasswordResetResponse(
            message="Password has been reset successfully",
            email=user.email
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirmation error: {e}")
        raise DatabaseException("Failed to reset password", original_error=e)
