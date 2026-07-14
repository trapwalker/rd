"""WebSocket handler for real-time game communication."""

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.websockets import WebSocketState

from app.core.security import decode_access_token
from app.models.user import User
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.user_connections: dict[str, str] = {}  # user_id -> connection_id

    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        user: User | None = None
    ) -> None:
        """Register new connection.

        Соединение уже должно быть принято (websocket.accept) вызывающей
        стороной — эндпоинт принимает его до фазы аутентификации.
        """
        self.active_connections[connection_id] = websocket

        if user:
            self.user_connections[str(user.id)] = connection_id

        logger.info(
            f"WebSocket connected: {connection_id}"
            + (f" (user: {user.id})" if user else " (anonymous)")
        )

    def disconnect(self, connection_id: str) -> None:
        """Remove connection."""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        # Remove from user connections
        user_id = next(
            (uid for uid, cid in self.user_connections.items() if cid == connection_id),
            None
        )
        if user_id:
            del self.user_connections[user_id]

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal_message(
        self,
        message: dict[str, Any],
        connection_id: str
    ) -> None:
        """Send message to specific connection."""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)

    async def send_to_user(self, message: dict[str, Any], user_id: str) -> None:
        """Send message to specific user."""
        connection_id = self.user_connections.get(user_id)
        if connection_id:
            await self.send_personal_message(message, connection_id)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast message to all connections."""
        disconnected = []

        for connection_id, websocket in self.active_connections.items():
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                disconnected.append(connection_id)

        # Clean up disconnected
        for connection_id in disconnected:
            self.disconnect(connection_id)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws")
@migration_target("sublayers_server.handlers.client_connector.AgentSocketHandler")
async def websocket_endpoint(websocket: WebSocket):
    """
    Secure WebSocket endpoint for real-time game communication.

    Security:
    - Token passed in first message (NOT in URL)
    - 5-second auth timeout
    - Connection ID uses UUID (not predictable)
    - Message size limit (8KB)

    Handles:
    - Player movement
    - Game actions (attack, interact, etc.)
    - Real-time updates
    - Chat messages
    """
    import asyncio
    from uuid import uuid4

    connection_id = str(uuid4())  # Use UUID instead of id(websocket)
    user: User | None = None

    try:
        # Accept connection first
        await websocket.accept()

        # Wait for authentication message (5 second timeout)
        try:
            auth_msg = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0
            )
        except asyncio.TimeoutError:
            await websocket.close(code=4408, reason="Auth timeout")
            logger.warning("WebSocket auth timeout")
            return

        # Extract token from first message
        token = auth_msg.get("auth_token") or auth_msg.get("token")

        if token:
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    user = await User.get(user_id)
                    if not user or not user.is_active:
                        await websocket.close(code=4403, reason="User inactive")
                        return

        # Register connection
        await manager.connect(websocket, connection_id, user)

        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "authenticated": user is not None,
            "user_id": str(user.id) if user else None,
            "connection_id": connection_id,
            "max_message_size": 8192,
        })

        # Message loop with size limit
        async for message in websocket.iter_text():
            try:
                # Check message size (8KB limit)
                if len(message) > 8192:
                    await websocket.send_json({
                        "type": "error",
                        "error": "Message too large (max 8KB)"
                    })
                    continue

                data = json.loads(message)
                message_type = data.get("type")

                match message_type:
                    case "ping":
                        # Respond to ping
                        await websocket.send_json({"type": "pong"})

                    case "move":
                        # Handle player movement
                        await handle_movement(websocket, user, data)

                    case "action":
                        # Handle game action
                        await handle_action(websocket, user, data)

                    case "chat":
                        # Handle chat message
                        await handle_chat(websocket, user, data)

                    case _:
                        logger.warning(f"Unknown message type: {message_type}")
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Unknown message type: {message_type}"
                        })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Internal server error"
                })

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(connection_id)


async def handle_movement(
    websocket: WebSocket,
    user: User | None,
    data: dict[str, Any]
) -> None:
    """Handle player movement."""
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication required"
        })
        return

    position = data.get("position", {})
    x, y = position.get("x"), position.get("y")

    # TODO: Validate and apply movement
    # TODO: Broadcast to nearby players

    await websocket.send_json({
        "type": "move_ack",
        "position": {"x": x, "y": y}
    })


async def handle_action(
    websocket: WebSocket,
    user: User | None,
    data: dict[str, Any]
) -> None:
    """Handle game action."""
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication required"
        })
        return

    action = data.get("action")

    # TODO: Process game action based on type

    await websocket.send_json({
        "type": "action_result",
        "action": action,
        "success": True
    })


async def handle_chat(
    websocket: WebSocket,
    user: User | None,
    data: dict[str, Any]
) -> None:
    """Handle chat message."""
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication required"
        })
        return

    message_text = data.get("message", "")

    if not message_text or len(message_text) > 500:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid message length"
        })
        return

    # Broadcast chat message
    await manager.broadcast({
        "type": "chat",
        "user_id": str(user.id),
        "username": user.display_name or user.username,
        "message": message_text
    })


@router.get("/ws/stats")
async def websocket_stats() -> dict[str, Any]:
    """Get WebSocket connection statistics."""
    return {
        "total_connections": len(manager.active_connections),
        "authenticated_users": len(manager.user_connections),
    }
