"""Tests for user management endpoints."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.user import User


class TestGetCurrentUser:
    """Test getting current user profile."""

    @pytest.mark.asyncio
    async def test_get_current_user_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting current user profile with valid token."""
        response = await authenticated_client.get("/api/users/me")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["display_name"] == test_user.display_name
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_get_current_user_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test getting current user without authentication fails."""
        response = await async_client.get("/api/users/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUpdateCurrentUser:
    """Test updating current user profile."""

    @pytest.mark.asyncio
    async def test_update_display_name(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test updating display name."""
        new_name = "Updated Test User"
        response = await authenticated_client.patch(
            "/api/users/me",
            json={"display_name": new_name}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["display_name"] == new_name

        # Verify in database
        updated_user = await User.get(test_user.id)
        assert updated_user.display_name == new_name

    @pytest.mark.asyncio
    async def test_update_avatar_url(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test updating avatar URL."""
        new_avatar = "https://example.com/avatar.jpg"
        response = await authenticated_client.patch(
            "/api/users/me",
            json={"avatar_url": new_avatar}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["avatar_url"] == new_avatar

        # Verify in database
        updated_user = await User.get(test_user.id)
        assert updated_user.avatar_url == new_avatar

    @pytest.mark.asyncio
    async def test_update_multiple_fields(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test updating multiple fields at once."""
        updates = {
            "display_name": "New Name",
            "avatar_url": "https://example.com/new-avatar.jpg"
        }
        response = await authenticated_client.patch(
            "/api/users/me",
            json=updates
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["display_name"] == updates["display_name"]
        assert data["avatar_url"] == updates["avatar_url"]

    @pytest.mark.asyncio
    async def test_update_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test updating user without authentication fails."""
        response = await async_client.patch(
            "/api/users/me",
            json={"display_name": "Hacker"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_update_empty_display_name(
        self,
        authenticated_client: AsyncClient
    ):
        """Test updating with empty display name fails."""
        response = await authenticated_client.patch(
            "/api/users/me",
            json={"display_name": ""}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetUserById:
    """Test getting user profile by ID."""

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test getting user profile by ID."""
        response = await async_client.get(f"/api/users/{test_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["username"] == test_user.username
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_user(
        self,
        async_client: AsyncClient
    ):
        """Test getting nonexistent user returns 404."""
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format
        response = await async_client.get(f"/api/users/{fake_id}")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_inactive_user(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test getting inactive user returns 404."""
        test_user.is_active = False
        await test_user.save()

        response = await async_client.get(f"/api/users/{test_user.id}")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_user_invalid_id(
        self,
        async_client: AsyncClient
    ):
        """Test getting user with invalid ID format."""
        response = await async_client.get("/api/users/invalid-id")

        assert response.status_code in [
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_404_NOT_FOUND
        ]


class TestGetUserByUsername:
    """Test getting user profile by username."""

    @pytest.mark.asyncio
    async def test_get_user_by_username_success(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test getting user profile by username."""
        response = await async_client.get(
            f"/api/users/{test_user.username}/by-username"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == test_user.username
        assert data["id"] == str(test_user.id)

    @pytest.mark.asyncio
    async def test_get_user_by_nonexistent_username(
        self,
        async_client: AsyncClient
    ):
        """Test getting user by nonexistent username returns 404."""
        response = await async_client.get(
            "/api/users/nonexistentuser/by-username"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio
    async def test_get_inactive_user_by_username(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test getting inactive user by username returns 404."""
        test_user.is_active = False
        await test_user.save()

        response = await async_client.get(
            f"/api/users/{test_user.username}/by-username"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUserProfilePrivacy:
    """Test user profile privacy and data exposure."""

    @pytest.mark.asyncio
    async def test_password_not_exposed_in_response(
        self,
        authenticated_client: AsyncClient
    ):
        """Test that hashed password is never exposed in API responses."""
        response = await authenticated_client.get("/api/users/me")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "password" not in data
        assert "hashed_password" not in data

    @pytest.mark.asyncio
    async def test_sensitive_fields_not_exposed_for_other_users(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test that sensitive fields are not exposed for other users."""
        response = await async_client.get(f"/api/users/{test_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Email might be public or private depending on requirements
        assert "hashed_password" not in data
        assert "google_id" not in data
        assert "facebook_id" not in data
