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
    # Check if user already exists
    existing_user = await User.find_one(
        (User.email == user_data.email) | (User.username == user_data.username)
    )

    if existing_user:
        if existing_user.email == user_data.email:
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
        email=user_data.email,
        username=user_data.username,
        display_name=user_data.display_name or user_data.username,
        hashed_password=get_password_hash(user_data.password),
    )

    await user.insert()

    return user


@router.post("/login", response_model=Token)
@migration_target("sublayers_server.handlers.site_auth.StandardLoginHandler (login)")
async def login(user_data: UserLogin) -> dict[str, str]:
    """
    Login with email and password.

    Returns JWT access token.
    """
    # Find user by email
    user = await User.find_one(User.email == user_data.email)

    if not user or not verify_password(user_data.password, user.hashed_password):
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

    # Create access token
    access_token = create_access_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


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

    # Create access token
    access_token = create_access_token(subject=str(user.id))

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
