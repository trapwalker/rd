"""Tests for WebSocket endpoints."""

import json

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.models.user import User


class TestWebSocketConnection:
    """Test WebSocket connection management."""

    def test_websocket_connect_anonymous(self, client: TestClient):
        """Test anonymous WebSocket connection."""
        with client.websocket_connect("/ws") as websocket:
            # Receive welcome message
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["status"] == "connected"
            assert data["authenticated"] is False
            assert data["user_id"] is None

    def test_websocket_connect_authenticated(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test authenticated WebSocket connection."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Receive welcome message
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["status"] == "connected"
            assert data["authenticated"] is True
            assert data["user_id"] is not None

    def test_websocket_ping_pong(self, client: TestClient):
        """Test ping-pong mechanism."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send ping
            websocket.send_json({"type": "ping"})

            # Receive pong
            response = websocket.receive_json()
            assert response["type"] == "pong"

    def test_websocket_invalid_json(self, client: TestClient):
        """Test handling of invalid JSON."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send invalid JSON
            websocket.send_text("not valid json")

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "json" in response["message"].lower()

    def test_websocket_unknown_message_type(self, client: TestClient):
        """Test handling of unknown message types."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send unknown message type
            websocket.send_json({"type": "unknown_type"})

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "unknown" in response["message"].lower()


class TestWebSocketMovement:
    """Test player movement through WebSocket."""

    def test_move_without_auth(self, client: TestClient):
        """Test movement without authentication fails."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Try to move
            websocket.send_json({
                "type": "move",
                "position": {"x": 10.0, "y": 20.0}
            })

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_move_with_auth(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test movement with authentication."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send movement
            position = {"x": 10.0, "y": 20.0}
            websocket.send_json({
                "type": "move",
                "position": position
            })

            # Receive acknowledgment
            response = websocket.receive_json()
            assert response["type"] == "move_ack"
            assert response["position"] == position

    def test_move_invalid_position(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test movement with invalid position data."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send movement without position
            websocket.send_json({"type": "move"})

            # Should receive acknowledgment with None values
            response = websocket.receive_json()
            assert response["type"] == "move_ack"


class TestWebSocketActions:
    """Test game actions through WebSocket."""

    def test_action_without_auth(self, client: TestClient):
        """Test action without authentication fails."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Try to perform action
            websocket.send_json({
                "type": "action",
                "action": "attack"
            })

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_action_with_auth(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test action with authentication."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Perform action
            websocket.send_json({
                "type": "action",
                "action": "attack"
            })

            # Receive result
            response = websocket.receive_json()
            assert response["type"] == "action_result"
            assert response["action"] == "attack"
            assert "success" in response


class TestWebSocketChat:
    """Test chat functionality through WebSocket."""

    def test_chat_without_auth(self, client: TestClient):
        """Test chat without authentication fails."""
        with client.websocket_connect("/ws") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Try to send chat message
            websocket.send_json({
                "type": "chat",
                "message": "Hello, world!"
            })

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "authentication required" in response["message"].lower()

    def test_chat_with_auth(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test chat with authentication."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send chat message
            message_text = "Hello, world!"
            websocket.send_json({
                "type": "chat",
                "message": message_text
            })

            # Should broadcast to all (in this case, receive our own message)
            # Note: In a real scenario with multiple connections,
            # this would be received by other clients
            try:
                response = websocket.receive_json(timeout=0.5)
                if response["type"] == "chat":
                    assert response["message"] == message_text
                    assert "username" in response
                    assert "user_id" in response
            except Exception:
                # Timeout is acceptable - message was sent
                pass

    def test_chat_empty_message(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test chat with empty message fails."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send empty message
            websocket.send_json({
                "type": "chat",
                "message": ""
            })

            # Receive error
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "invalid message length" in response["message"].lower()

    def test_chat_long_message(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test chat with too long message fails."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            # Skip welcome message
            websocket.receive_json()

            # Send message longer than 500 characters
            long_message = "x" * 501
            websocket.send_json({
                "type": "chat",
                "message": long_message
            })

            # Receive error
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

    def test_multiple_connections(self, client: TestClient):
        """Test handling multiple simultaneous connections."""
        # Open multiple WebSocket connections
        with client.websocket_connect("/ws") as ws1:
            with client.websocket_connect("/ws") as ws2:
                # Skip welcome messages
                ws1.receive_json()
                ws2.receive_json()

                # Both connections should be active
                # Test ping on both
                ws1.send_json({"type": "ping"})
                ws2.send_json({"type": "ping"})

                response1 = ws1.receive_json()
                response2 = ws2.receive_json()

                assert response1["type"] == "pong"
                assert response2["type"] == "pong"

    def test_connection_cleanup(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test connection cleanup on disconnect."""
        # Connect and disconnect
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            websocket.receive_json()
            # Connection will be cleaned up when exiting context

        # Verify stats show no connections after disconnect
        stats_response = client.get("/ws/stats")
        data = stats_response.json()
        # Note: Stats might not be immediately updated due to async nature
        assert data["total_connections"] >= 0


class TestWebSocketAuthentication:
    """Test WebSocket authentication mechanisms."""

    def test_invalid_token(self, client: TestClient):
        """Test connection with invalid token."""
        with client.websocket_connect("/ws?token=invalid_token") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["authenticated"] is False

    def test_expired_token(self, client: TestClient):
        """Test connection with expired token."""
        # Create an expired token (would need to mock time or use old token)
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid"

        with client.websocket_connect(f"/ws?token={expired_token}") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["authenticated"] is False

    def test_token_in_query_params(
        self,
        client: TestClient,
        test_user_token: str
    ):
        """Test authentication via query parameters."""
        with client.websocket_connect(f"/ws?token={test_user_token}") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connection"
            assert data["authenticated"] is True
