"""User management routes."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentActiveUser
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.utils.deprecation import migration_target

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: CurrentActiveUser
) -> User:
    """
    Get current user profile.

    Returns detailed user information.
    """
    return current_user


@router.patch("/me", response_model=UserRead)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoHandler (update)")
async def update_current_user(
    user_update: UserUpdate,
    current_user: CurrentActiveUser
) -> User:
    """
    Update current user profile.

    Allows updating display name and avatar.
    """
    if user_update.display_name is not None:
        current_user.display_name = user_update.display_name

    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url

    await current_user.save()

    return current_user


@router.get("/{user_id}", response_model=UserRead)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoByIDHandler")
async def get_user_by_id(user_id: str) -> User:
    """
    Get user profile by ID.

    Public endpoint for viewing other players' profiles.
    """
    user = await User.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.get("/{username}/by-username", response_model=UserRead)
async def get_user_by_username(username: str) -> User:
    """
    Get user profile by username.

    Public endpoint for searching users by username.
    """
    user = await User.find_one(User.username == username)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user
