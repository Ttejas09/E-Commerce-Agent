import asyncio
import time
from typing import Dict, Optional


class AgentSession:
    def __init__(self, agent, request_id: str):
        self.agent = agent
        self.request_id = request_id
        self.lock = asyncio.Lock()
        self.last_active = time.time()
        self.last_word_index = 0
        self.finished = False


class SessionManager:
    def __init__(self, ttl_seconds: int = 600):
        self.sessions: Dict[str, AgentSession] = {}
        self.ttl = ttl_seconds

    def create(self, request_id: str, agent) -> AgentSession:
        """Create new session. Raises if already exists."""
        if request_id in self.sessions:
            raise ValueError(f"Session '{request_id}' already exists")
        session = AgentSession(agent=agent, request_id=request_id)
        self.sessions[request_id] = session
        return session

    def get(self, request_id: str) -> Optional[AgentSession]:
        """Get session, update last_active. Returns None if not found."""
        session = self.sessions.get(request_id)
        if session is not None:
            session.last_active = time.time()
        return session

    def remove(self, request_id: str) -> None:
        """Remove a session by request_id."""
        self.sessions.pop(request_id, None)

    def cleanup(self) -> None:
        """Remove sessions older than TTL."""
        now = time.time()
        expired = [
            rid for rid, s in self.sessions.items()
            if now - s.last_active > self.ttl
        ]
        for rid in expired:
            del self.sessions[rid]
