"""Game API routes."""

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.deps import CurrentActiveUser
from app.models.user import User
from app.utils.deprecation import migration_target

router = APIRouter()


# ==================== Schemas ====================


class PlayerStats(BaseModel):
    """Player statistics."""

    level: int
    experience: int
    next_level_xp: int
    coins: int


class InventoryItem(BaseModel):
    """Inventory item."""

    item_id: str
    name: str
    quantity: int
    type: str


class GameState(BaseModel):
    """Current game state for player."""

    position: dict[str, float] = Field(default={"x": 0.0, "y": 0.0})
    health: int = Field(default=100, ge=0, le=100)
    energy: int = Field(default=100, ge=0, le=100)
    in_combat: bool = False


# ==================== Endpoints ====================


@router.get("/stats", response_model=PlayerStats)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoHandler")
async def get_player_stats(current_user: CurrentActiveUser) -> dict[str, Any]:
    """
    Get player statistics.

    Returns current level, experience, and coins.
    """
    # Calculate XP needed for next level
    next_level_xp = calculate_next_level_xp(current_user.level)

    return {
        "level": current_user.level,
        "experience": current_user.experience,
        "next_level_xp": next_level_xp,
        "coins": current_user.coins,
    }


@router.get("/inventory", response_model=list[InventoryItem])
@migration_target("sublayers_server.handlers.main_menu_inventory.MainInventoryHandler")
async def get_inventory(current_user: CurrentActiveUser) -> list[dict[str, Any]]:
    """
    Get player inventory.

    Returns list of items owned by the player.
    """
    # TODO: Implement actual inventory system
    # For now, return mock data
    return [
        {
            "item_id": "weapon_001",
            "name": "Basic Rifle",
            "quantity": 1,
            "type": "weapon"
        },
        {
            "item_id": "ammo_001",
            "name": "Rifle Ammo",
            "quantity": 50,
            "type": "ammunition"
        },
    ]


@router.get("/state", response_model=GameState)
async def get_game_state(current_user: CurrentActiveUser) -> dict[str, Any]:
    """
    Get current game state for player.

    Returns position, health, energy, and combat status.
    """
    # TODO: Get actual game state from database/cache
    return {
        "position": {"x": 0.0, "y": 0.0},
        "health": 100,
        "energy": 100,
        "in_combat": False,
    }


@router.post("/action/heal")
async def heal_player(current_user: CurrentActiveUser) -> dict[str, Any]:
    """
    Heal player.

    Consumes resources to restore health.
    """
    # TODO: Implement healing logic
    return {
        "success": True,
        "message": "Healed successfully",
        "new_health": 100
    }


@router.post("/action/craft")
async def craft_item(
    current_user: CurrentActiveUser,
    item_id: str
) -> dict[str, Any]:
    """
    Craft an item.

    Requires resources and crafting recipe.
    """
    # TODO: Implement crafting system
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Crafting system not yet implemented"
    )


@router.get("/leaderboard")
@migration_target("sublayers_server.handlers.statistics.ServerStatForSite")
async def get_leaderboard(limit: int = 100) -> list[dict[str, Any]]:
    """
    Get top players leaderboard.

    Returns top players by level and experience.
    """
    from app.core.validators import validate_pagination
    from app.core.exceptions import DatabaseException

    # Validate pagination
    _, limit = validate_pagination(skip=0, limit=limit, max_limit=500)

    try:
        # Get top users
        users = await User.find(
            User.is_active == True
        ).sort(-User.level, -User.experience).limit(limit).to_list()

        return [
            {
                "rank": idx + 1,
                "user_id": str(user.id),
                "username": user.username,
                "display_name": user.display_name or user.username,
                "level": user.level,
                "experience": user.experience,
            }
            for idx, user in enumerate(users)
        ]

    except Exception as e:
        raise DatabaseException("Failed to fetch leaderboard", original_error=e)


# ==================== Helper Functions ====================


def calculate_next_level_xp(current_level: int) -> int:
    """
    Calculate experience needed for next level.

    Formula: 100 * level^2
    """
    next_level = current_level + 1
    return 100 * (next_level ** 2)
