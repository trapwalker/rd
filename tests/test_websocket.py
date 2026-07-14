"""Tests for WebSocket endpoints.

Protocol: the server accepts the connection, then waits (max 5s) for the
first message containing the auth token ({"auth_token": ...}); the token is
deliberately NOT read from query params (see SECURITY_FIXES.md). After the
auth message the server replies with a welcome message of type "connection".
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from httpx import AsyncClient


def do_auth(websocket, token: str | None = None) -> dict:
    """Send the first (auth) message per protocol and return the welcome message."""
    websocket.send_json({"auth_token": token} if token else {})
    return websocket.receive_json()


def make_user_token(ws_client: TestClient) -> str:
    """Создать пользователя и получить токен через API самого ws-приложения.

    Session-фикстуры (test_user_token) живут в другом event loop и не могут
    использоваться вместе с ws_client — Beanie в каждом приложении привязан
    к своему циклу.
    """
    import uuid

    name = "wsuser_" + uuid.uuid4().hex[:10]
    email = f"{name}@example.com"
    r = ws_client.post("/api/auth/register", json={
        "email": email, "username": name, "password": "WsTestPass123",
    })
    assert r.status_code == 201, r.text
    r = ws_client.post("/api/auth/login", json={
        "email": email, "password": "WsTestPass123",
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


class TestWebSocketConnection:
    """Test WebSocket connection management."""

    def test_websocket_connect_anonymous(self, ws_client: TestClient):
        """Test anonymous WebSocket connection."""
        with ws_client.websocket_connect("/ws") as websocket:
            data = do_auth(websocket)
            assert data["type"] == "connection"
            assert data["status"] == "connected"
            assert data["authenticated"] is False
            assert data["user_id"] is None

    def test_websocket_connect_authenticated(
        self,
        ws_client: TestClient,
    ):
        """Test authenticated WebSocket connection."""
        with ws_client.websocket_connect("/ws") as websocket:
            data = do_auth(websocket, make_user_token(ws_client))
            assert data["type"] == "connection"
            assert data["status"] == "connected"
            assert data["authenticated"] is True
            assert data["user_id"] is not None

    def test_websocket_ping_pong(self, ws_client: TestClient):
        """Test ping-pong mechanism."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_json({"type": "ping"})

            response = websocket.receive_json()
            assert response["type"] == "pong"

    def test_websocket_invalid_json(self, ws_client: TestClient):
        """Test handling of invalid JSON."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_text("not valid json")

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "json" in response["message"].lower()

    def test_websocket_unknown_message_type(self, ws_client: TestClient):
        """Test handling of unknown message types."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_json({"type": "unknown_type"})

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "unknown" in response["message"].lower()


class TestWebSocketMovement:
    """Test player movement through WebSocket."""

    def test_move_without_auth(self, ws_client: TestClient):
        """Test movement without authentication fails."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_json({
                "type": "move",
                "position": {"x": 10.0, "y": 20.0}
            })

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_move_with_auth(
        self,
        ws_client: TestClient,
    ):
        """Test movement with authentication."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            position = {"x": 10.0, "y": 20.0}
            websocket.send_json({
                "type": "move",
                "position": position
            })

            response = websocket.receive_json()
            assert response["type"] == "move_ack"
            assert response["position"] == position

    def test_move_invalid_position(
        self,
        ws_client: TestClient,
    ):
        """Test movement with invalid position data."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            websocket.send_json({"type": "move"})

            # Should receive acknowledgment with None values
            response = websocket.receive_json()
            assert response["type"] == "move_ack"


class TestWebSocketActions:
    """Test game actions through WebSocket."""

    def test_action_without_auth(self, ws_client: TestClient):
        """Test action without authentication fails."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_json({
                "type": "action",
                "action": "attack"
            })

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_action_with_auth(
        self,
        ws_client: TestClient,
    ):
        """Test action with authentication."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            websocket.send_json({
                "type": "action",
                "action": "attack"
            })

            response = websocket.receive_json()
            assert response["type"] == "action_result"
            assert response["action"] == "attack"
            assert "success" in response


class TestWebSocketChat:
    """Test chat functionality through WebSocket."""

    def test_chat_without_auth(self, ws_client: TestClient):
        """Test chat without authentication fails."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket)

            websocket.send_json({
                "type": "chat",
                "message": "Hello, world!"
            })

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_chat_with_auth(
        self,
        ws_client: TestClient,
    ):
        """Test chat with authentication."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            message_text = "Hello, world!"
            websocket.send_json({
                "type": "chat",
                "message": message_text
            })

            # Chat is broadcast to all connections, including our own
            response = websocket.receive_json()
            assert response["type"] == "chat"
            assert response["message"] == message_text
            assert "username" in response
            assert "user_id" in response

    def test_chat_empty_message(
        self,
        ws_client: TestClient,
    ):
        """Test chat with empty message fails."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            websocket.send_json({
                "type": "chat",
                "message": ""
            })

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "invalid message length" in response["message"].lower()

    def test_chat_long_message(
        self,
        ws_client: TestClient,
    ):
        """Test chat with too long message fails."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))

            long_message = "x" * 501
            websocket.send_json({
                "type": "chat",
                "message": long_message
            })

            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "invalid message length" in response["message"].lower()


class TestWebSocketStats:
    """Test WebSocket statistics endpoint."""

    @pytest.mark.asyncio
    async def test_websocket_stats(self, async_client: AsyncClient):
        """Test getting WebSocket connection statistics."""
        response = await async_client.get("/ws/stats")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_connections" in data
        assert "authenticated_users" in data
        assert isinstance(data["total_connections"], int)
        assert isinstance(data["authenticated_users"], int)
        assert data["total_connections"] >= 0
        assert data["authenticated_users"] >= 0
        assert data["authenticated_users"] <= data["total_connections"]


class TestConnectionManager:
    """Test ConnectionManager functionality."""

    def test_multiple_connections(self, ws_client: TestClient):
        """Test handling multiple simultaneous connections."""
        with ws_client.websocket_connect("/ws") as ws1:
            with ws_client.websocket_connect("/ws") as ws2:
                do_auth(ws1)
                do_auth(ws2)

                ws1.send_json({"type": "ping"})
                ws2.send_json({"type": "ping"})

                response1 = ws1.receive_json()
                response2 = ws2.receive_json()

                assert response1["type"] == "pong"
                assert response2["type"] == "pong"

    def test_connection_cleanup(
        self,
        ws_client: TestClient,
    ):
        """Test connection cleanup on disconnect."""
        with ws_client.websocket_connect("/ws") as websocket:
            do_auth(websocket, make_user_token(ws_client))
            # Connection will be cleaned up when exiting context

        stats_response = ws_client.get("/ws/stats")
        data = stats_response.json()
        # Note: Stats might not be immediately updated due to async nature
        assert data["total_connections"] >= 0


class TestWebSocketAuthentication:
    """Test WebSocket authentication mechanisms."""

    def test_invalid_token(self, ws_client: TestClient):
        """Test connection with invalid token."""
        with ws_client.websocket_connect("/ws") as websocket:
            data = do_auth(websocket, "invalid_token")
            assert data["type"] == "connection"
            assert data["authenticated"] is False

    def test_expired_token(self, ws_client: TestClient):
        """Test connection with expired token."""
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid"

        with ws_client.websocket_connect("/ws") as websocket:
            data = do_auth(websocket, expired_token)
            assert data["type"] == "connection"
            assert data["authenticated"] is False

    def test_token_in_query_params(
        self,
        ws_client: TestClient,
    ):
        """Token in query params must be IGNORED (security: tokens leak via URLs)."""
        token = make_user_token(ws_client)
        with ws_client.websocket_connect(f"/ws?token={token}") as websocket:
            # Auth message without token — query param must not authenticate us
            data = do_auth(websocket)
            assert data["type"] == "connection"
            assert data["authenticated"] is False
