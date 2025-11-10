"""Tests for game API endpoints."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models.user import User


class TestPlayerStats:
    """Test player statistics endpoint."""

    @pytest.mark.asyncio
    async def test_get_player_stats_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting player stats with authentication."""
        response = await authenticated_client.get("/api/game/stats")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["level"] == test_user.level
        assert data["experience"] == test_user.experience
        assert data["coins"] == test_user.coins
        assert "next_level_xp" in data
        assert data["next_level_xp"] > 0

    @pytest.mark.asyncio
    async def test_get_player_stats_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test getting player stats without authentication fails."""
        response = await async_client.get("/api/game/stats")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_next_level_xp_calculation(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test next level XP calculation is correct."""
        response = await authenticated_client.get("/api/game/stats")

        data = response.json()
        expected_xp = 100 * ((test_user.level + 1) ** 2)
        assert data["next_level_xp"] == expected_xp


class TestInventory:
    """Test player inventory endpoint."""

    @pytest.mark.asyncio
    async def test_get_inventory_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting player inventory."""
        response = await authenticated_client.get("/api/game/inventory")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        # Currently returns mock data
        assert len(data) >= 0

    @pytest.mark.asyncio
    async def test_get_inventory_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test getting inventory without authentication fails."""
        response = await async_client.get("/api/game/inventory")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_inventory_item_structure(
        self,
        authenticated_client: AsyncClient
    ):
        """Test inventory items have correct structure."""
        response = await authenticated_client.get("/api/game/inventory")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        if len(data) > 0:
            item = data[0]
            assert "item_id" in item
            assert "name" in item
            assert "quantity" in item
            assert "type" in item
            assert item["quantity"] >= 0


class TestGameState:
    """Test game state endpoint."""

    @pytest.mark.asyncio
    async def test_get_game_state_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test getting game state."""
        response = await authenticated_client.get("/api/game/state")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "position" in data
        assert "health" in data
        assert "energy" in data
        assert "in_combat" in data
        assert 0 <= data["health"] <= 100
        assert 0 <= data["energy"] <= 100

    @pytest.mark.asyncio
    async def test_get_game_state_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test getting game state without authentication fails."""
        response = await async_client.get("/api/game/state")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_game_state_position_structure(
        self,
        authenticated_client: AsyncClient
    ):
        """Test game state position has correct structure."""
        response = await authenticated_client.get("/api/game/state")

        data = response.json()
        position = data["position"]
        assert "x" in position
        assert "y" in position
        assert isinstance(position["x"], (int, float))
        assert isinstance(position["y"], (int, float))


class TestHealAction:
    """Test healing action endpoint."""

    @pytest.mark.asyncio
    async def test_heal_player_success(
        self,
        authenticated_client: AsyncClient
    ):
        """Test healing player."""
        response = await authenticated_client.post("/api/game/action/heal")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "message" in data
        assert "new_health" in data

    @pytest.mark.asyncio
    async def test_heal_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test healing without authentication fails."""
        response = await async_client.post("/api/game/action/heal")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCraftAction:
    """Test crafting action endpoint."""

    @pytest.mark.asyncio
    async def test_craft_item_not_implemented(
        self,
        authenticated_client: AsyncClient
    ):
        """Test crafting returns not implemented."""
        response = await authenticated_client.post(
            "/api/game/action/craft",
            params={"item_id": "test_item"}
        )

        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED

    @pytest.mark.asyncio
    async def test_craft_without_auth(
        self,
        async_client: AsyncClient
    ):
        """Test crafting without authentication fails."""
        response = await async_client.post(
            "/api/game/action/craft",
            params={"item_id": "test_item"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLeaderboard:
    """Test leaderboard endpoint."""

    @pytest.mark.asyncio
    async def test_get_leaderboard_success(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test getting leaderboard."""
        response = await async_client.get("/api/game/leaderboard")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_leaderboard_with_limit(
        self,
        async_client: AsyncClient
    ):
        """Test leaderboard with custom limit."""
        response = await async_client.get(
            "/api/game/leaderboard",
            params={"limit": 10}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) <= 10

    @pytest.mark.asyncio
    async def test_leaderboard_entry_structure(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test leaderboard entries have correct structure."""
        response = await async_client.get("/api/game/leaderboard")

        data = response.json()
        if len(data) > 0:
            entry = data[0]
            assert "rank" in entry
            assert "user_id" in entry
            assert "username" in entry
            assert "display_name" in entry
            assert "level" in entry
            assert "experience" in entry
            assert entry["rank"] >= 1

    @pytest.mark.asyncio
    async def test_leaderboard_ordering(
        self,
        async_client: AsyncClient,
        test_user: User,
        clean_db
    ):
        """Test leaderboard is sorted correctly."""
        # Create additional users with different levels
        from app.core.security import get_password_hash

        users = []
        for i in range(3):
            user = User(
                email=f"user{i}@example.com",
                username=f"user{i}",
                hashed_password=get_password_hash("password"),
                level=10 - i,  # Descending levels: 10, 9, 8
                experience=1000 - (i * 100),
                is_active=True
            )
            await user.insert()
            users.append(user)

        response = await async_client.get("/api/game/leaderboard")

        data = response.json()
        # Verify descending order by level
        for i in range(len(data) - 1):
            assert data[i]["level"] >= data[i + 1]["level"]
            # If same level, check experience
            if data[i]["level"] == data[i + 1]["level"]:
                assert data[i]["experience"] >= data[i + 1]["experience"]

    @pytest.mark.asyncio
    async def test_leaderboard_excludes_inactive_users(
        self,
        async_client: AsyncClient,
        test_user: User
    ):
        """Test leaderboard excludes inactive users."""
        from app.core.security import get_password_hash

        # Create active user
        active_user = User(
            email="active@example.com",
            username="active",
            hashed_password=get_password_hash("password"),
            level=20,
            is_active=True
        )
        await active_user.insert()

        # Create inactive user with higher level
        inactive_user = User(
            email="inactive@example.com",
            username="inactive",
            hashed_password=get_password_hash("password"),
            level=100,
            is_active=False
        )
        await inactive_user.insert()

        response = await async_client.get("/api/game/leaderboard")

        data = response.json()
        user_ids = [entry["user_id"] for entry in data]
        assert str(active_user.id) in user_ids
        assert str(inactive_user.id) not in user_ids


class TestXPCalculation:
    """Test experience points calculation."""

    @pytest.mark.asyncio
    async def test_xp_formula_consistency(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test XP calculation formula is consistent."""
        # Test multiple level transitions
        for level in range(1, 11):
            test_user.level = level
            await test_user.save()

            response = await authenticated_client.get("/api/game/stats")
            data = response.json()

            expected_xp = 100 * ((level + 1) ** 2)
            assert data["next_level_xp"] == expected_xp

    @pytest.mark.asyncio
    async def test_xp_increases_with_level(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test XP requirement increases with level."""
        xp_requirements = []

        for level in range(1, 6):
            test_user.level = level
            await test_user.save()

            response = await authenticated_client.get("/api/game/stats")
            data = response.json()
            xp_requirements.append(data["next_level_xp"])

        # Verify increasing requirements
        for i in range(len(xp_requirements) - 1):
            assert xp_requirements[i] < xp_requirements[i + 1]
