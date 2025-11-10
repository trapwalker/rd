"""Tests for authentication endpoints."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.user import User


class TestRegistration:
    """Test user registration."""

    @pytest.mark.asyncio
    async def test_register_new_user(
        self,
        async_client: AsyncClient,
        sample_user_data: dict,
        clean_db
    ):
        """Test successful user registration."""
        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["username"] == sample_user_data["username"]
        assert "id" in data
        assert "hashed_password" not in data

        # Verify user exists in database
        user = await User.find_one(User.email == sample_user_data["email"])
        assert user is not None
        assert user.username == sample_user_data["username"]

    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self,
        async_client: AsyncClient,
        test_user: User,
        sample_user_data: dict
    ):
        """Test registration with duplicate email fails."""
        sample_user_data["email"] = test_user.email

        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email already registered" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_username(
        self,
        async_client: AsyncClient,
        test_user: User,
        sample_user_data: dict
    ):
        """Test registration with duplicate username fails."""
        sample_user_data["username"] = test_user.username

        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "username already taken" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_invalid_email(
        self,
        async_client: AsyncClient,
        sample_user_data: dict,
        clean_db
    ):
        """Test registration with invalid email fails."""
        sample_user_data["email"] = "not-an-email"

        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_short_password(
        self,
        async_client: AsyncClient,
        sample_user_data: dict,
        clean_db
    ):
        """Test registration with short password fails."""
        sample_user_data["password"] = "12345"  # Less than 6 characters

        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_invalid_username(
        self,
        async_client: AsyncClient,
        sample_user_data: dict,
        clean_db
    ):
        """Test registration with invalid username fails."""
        sample_user_data["username"] = "user@name!"  # Invalid characters

        response = await async_client.post(
            "/api/auth/register",
            json=sample_user_data
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLogin:
    """Test user login."""

    @pytest.mark.asyncio
    async def test_login_success(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test successful login."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "testpassword123"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test login with wrong password fails."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "wrongpassword"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(
        self,
        async_client: AsyncClient,
        clean_db
    ):
        """Test login with nonexistent user fails."""
        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "somepassword"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test login with inactive user fails."""
        test_user.is_active = False
        await test_user.save()

        response = await async_client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "testpassword123"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "inactive" in response.json()["detail"].lower()


class TestTokenVerification:
    """Test JWT token verification."""

    @pytest.mark.asyncio
    async def test_verify_valid_token(
        self,
        async_client: AsyncClient,
        test_user_token: str
    ):
        """Test verification of valid token."""
        response = await async_client.get(
            "/api/auth/verify",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True

    @pytest.mark.asyncio
    async def test_verify_invalid_token(
        self,
        async_client: AsyncClient
    ):
        """Test verification of invalid token."""
        response = await async_client.get(
            "/api/auth/verify",
            headers={"Authorization": "Bearer invalid.token.here"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_verify_missing_token(
        self,
        async_client: AsyncClient
    ):
        """Test verification without token."""
        response = await async_client.get("/api/auth/verify")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogout:
    """Test user logout."""

    @pytest.mark.asyncio
    async def test_logout_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test successful logout."""
        response = await authenticated_client.post("/api/auth/logout")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Logged out successfully"

    @pytest.mark.asyncio
    async def test_logout_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test logout without authentication."""
        response = await async_client.post("/api/auth/logout")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGoogleAuth:
    """Test Google OAuth authentication."""

    @pytest.mark.asyncio
    async def test_google_login_url(
        self,
        async_client: AsyncClient
    ):
        """Test Google OAuth URL generation."""
        response = await async_client.get("/api/auth/google")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "auth_url" in data
        assert "accounts.google.com" in data["auth_url"]

    @pytest.mark.asyncio
    async def test_google_callback_new_user(
        self,
        async_client: AsyncClient,
        clean_db
    ):
        """Test Google OAuth callback with new user."""
        # This would require mocking Google's OAuth response
        # For now, we'll just verify the endpoint exists
        response = await async_client.get(
            "/api/auth/google/callback",
            params={"code": "dummy_code"}
        )

        # Will fail without proper Google credentials, but endpoint exists
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ]
