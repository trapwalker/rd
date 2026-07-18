"""Inventory management routes."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.deps import CurrentUnbannedUser
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Jinja2 templates
try:
    templates = Jinja2Templates(directory="templates")
except Exception as e:
    logger.warning(f"Templates directory not found: {e}")
    templates = None


@router.get("/inventory", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_inventory.MainInventoryHandler")
async def main_inventory_handler(
    request: Request,
    current_user: CurrentUnbannedUser,
) -> HTMLResponse:
    """
    Open car inventory window.

    Requires:
    - Authenticated user
    - User must have an agent (game character)
    - Agent must have a car

    Migration from: sublayers_server.handlers.main_menu_inventory.MainInventoryHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get agent for current user
    # agent = await get_agent_for_user(current_user)
    # if not agent or not agent.car:
    #     logger.warning(f"User {current_user.username} accessing inventory without car")
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # For now, return mock response
    logger.info(f"User {current_user.username} opening inventory")

    return templates.TemplateResponse(
        request,
        "inventory/main.html",
        {
            "request": request,
            "user": current_user,
            "car_id": "mock_car_id",  # TODO: Get from agent.car.uid
        }
    )


@router.get("/inventory/container", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_inventory.ContainerInventoryHandler")
async def container_inventory_handler(
    request: Request,
    container_id: str,
    current_user: CurrentUnbannedUser,
) -> HTMLResponse:
    """
    Open container inventory window for looting.

    Requires:
    - Authenticated user
    - Valid container_id
    - Container must be available to the agent

    Migration from: sublayers_server.handlers.main_menu_inventory.ContainerInventoryHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get agent and validate container access
    # agent = await get_agent_for_user(current_user)
    # container = await get_container(container_id)
    # if not container or not container.is_available(agent, time):
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    logger.info(f"User {current_user.username} opening container {container_id}")

    return templates.TemplateResponse(
        request,
        "inventory/container.html",
        {
            "request": request,
            "user": current_user,
            "car_id": "mock_car_id",  # TODO: Get from agent.car.uid
            "container_id": container_id,
        }
    )


@router.get("/inventory/barter", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.main_menu_inventory.BarterInventoryHandler")
async def barter_inventory_handler(
    request: Request,
    barter_id: int,
    current_user: CurrentUnbannedUser,
) -> HTMLResponse:
    """
    Open barter/trade window between two players.

    Requires:
    - Authenticated user
    - Valid barter_id
    - User must be either initiator or recipient of the barter

    Migration from: sublayers_server.handlers.main_menu_inventory.BarterInventoryHandler
    """
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Templates not configured"
        )

    # TODO: Get agent and barter
    # agent = await get_agent_for_user(current_user)
    # barter = await Barter.get_barter(barter_id, agent)
    # if not barter or (agent not in [barter.initiator, barter.recipient]):
    #     logger.warning(f"User {current_user.username} has no access to barter {barter_id}")
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Determine which side of the trade the user is on
    # is_initiator = (agent == barter.initiator)
    # my_table_id = barter.initiator_table_obj.uid if is_initiator else barter.recipient_table_obj.uid
    # other_table_id = barter.recipient_table_obj.uid if is_initiator else barter.initiator_table_obj.uid
    # inv_id = barter.initiator_inv.owner.uid if is_initiator else barter.recipient_inv.owner.uid

    logger.info(f"User {current_user.username} opening barter {barter_id}")

    return templates.TemplateResponse(
        request,
        "inventory/barter.html",
        {
            "request": request,
            "user": current_user,
            "barter_id": barter_id,
            "inv_id": "mock_inv_id",  # TODO: Get from barter
            "my_table_id": "mock_my_table",  # TODO: Get from barter
            "other_table_id": "mock_other_table",  # TODO: Get from barter
            "barter_name": "Player1 <=> Player2",  # TODO: Get from barter
            "in_location": False,  # TODO: Check agent.current_location
        }
    )


# API Endpoints for inventory operations

@router.post("/inventory/move-item")
@migration_target("sublayers_server RPC: move_item")
async def move_item(
    from_container_id: str,
    to_container_id: str,
    item_id: str,
    quantity: int = 1,
    current_user: CurrentUnbannedUser = None,
) -> dict[str, Any]:
    """
    Move item between containers/inventory.

    Args:
        from_container_id: Source container ID
        to_container_id: Destination container ID
        item_id: Item to move
        quantity: Amount to move
        current_user: Authenticated user

    Returns:
        Success status and updated inventory state
    """
    from app.core.validators import validate_container_id, validate_item_id, validate_quantity
    from app.core.exceptions import GameException

    # Validate input
    from_container_id = validate_container_id(from_container_id)
    to_container_id = validate_container_id(to_container_id)
    item_id = validate_item_id(item_id)
    quantity = validate_quantity(quantity, min_val=1, max_val=1000)

    if from_container_id == to_container_id:
        raise GameException("Source and destination containers must be different")

    # TODO: Implement item movement logic
    # - Validate user has access to both containers
    # - Check if item exists and has sufficient quantity
    # - Perform the transfer
    # - Update both containers
    # - Broadcast update to client

    logger.info(
        f"User {current_user.username} moving {quantity}x {item_id} "
        f"from {from_container_id} to {to_container_id}"
    )

    return {
        "success": True,
        "message": "Item moved successfully",
        "from_container": from_container_id,
        "to_container": to_container_id,
        "item_id": item_id,
        "quantity": quantity,
    }


@router.post("/inventory/use-item")
@migration_target("sublayers_server RPC: use_item")
async def use_item(
    item_id: str,
    current_user: CurrentUnbannedUser,
) -> dict[str, Any]:
    """
    Use an item from inventory.

    Args:
        item_id: Item to use
        current_user: Authenticated user

    Returns:
        Result of using the item
    """
    from app.core.validators import validate_item_id
    from app.core.exceptions import ItemNotFoundException

    # Validate input
    item_id = validate_item_id(item_id)

    # TODO: Implement item usage logic
    # - Validate user owns the item
    # - Execute item effect (heal, boost, etc.)
    # - Update item quantity or remove if consumed
    # - Apply effects to agent

    logger.info(f"User {current_user.username} using item {item_id}")

    return {
        "success": True,
        "message": "Item used successfully",
        "item_id": item_id,
        "effect": "Item effect applied",
    }


@router.post("/inventory/drop-item")
@migration_target("sublayers_server RPC: drop_item")
async def drop_item(
    item_id: str,
    quantity: int = 1,
    current_user: CurrentUnbannedUser = None,
) -> dict[str, Any]:
    """
    Drop item from inventory to ground.

    Args:
        item_id: Item to drop
        quantity: Amount to drop
        current_user: Authenticated user

    Returns:
        Success status
    """
    from app.core.validators import validate_item_id, validate_quantity

    # Validate input
    item_id = validate_item_id(item_id)
    quantity = validate_quantity(quantity, min_val=1, max_val=1000)

    # TODO: Implement item dropping logic
    # - Remove from inventory
    # - Create loot container at player position
    # - Broadcast to nearby players

    logger.info(f"User {current_user.username} dropping {quantity}x {item_id}")

    return {
        "success": True,
        "message": "Item dropped",
        "item_id": item_id,
        "quantity": quantity,
    }


@router.get("/inventory/details/{item_id}")
@migration_target("sublayers_server RPC: get_item_details")
async def get_item_details(
    item_id: str,
    current_user: CurrentUnbannedUser,
) -> dict[str, Any]:
    """
    Get detailed information about an item.

    Args:
        item_id: Item to get details for
        current_user: Authenticated user

    Returns:
        Item details including stats, description, etc.
    """
    from app.core.validators import validate_item_id

    # Validate input
    item_id = validate_item_id(item_id)

    # TODO: Load item from registry or database

    logger.info(f"User {current_user.username} requesting details for {item_id}")

    return {
        "item_id": item_id,
        "name": "Mock Item",
        "description": "This is a placeholder item",
        "type": "weapon",
        "weight": 5.0,
        "value": 100,
        "stats": {
            "damage": 50,
            "durability": 100,
        },
    }
