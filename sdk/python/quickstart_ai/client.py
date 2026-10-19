from __future__ import annotations

import json
import os
from typing import Any, AsyncGenerator, Generator, Optional
import httpx
from .webhook import verify_webhook_signature


class QuickStartError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        request_id: Optional[str] = None,
    ):
        super().__init__(f"[{status_code}] {code}: {message}")
        self.status_code = status_code
        self.code = code
        self.message = message
        self.request_id = request_id


class _BaseClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: Optional[str] = None,
        workspace_id: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = (base_url or os.getenv("QUICKSTART_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")
        self.api_key = api_key or os.getenv("QUICKSTART_API_KEY")
        self.access_token = access_token
        self.workspace_id = workspace_id
        self.timeout = timeout

    def _headers(self, extra: Optional[dict[str, str]] = None) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        elif self.access_token:
            headers["authorization"] = f"Bearer {self.access_token}"
        if extra:
            headers.update(extra)
        return headers

    def _require_workspace(self, explicit: Optional[str]) -> str:
        ws_id = explicit or self.workspace_id
        if not ws_id:
            raise QuickStartError(400, "WORKSPACE_ID_REQUIRED", "workspace_id is required")
        return ws_id


class QuickStart(_BaseClient):
    """Synchronous Python client for QuickStart AI Platform."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: Optional[str] = None,
        workspace_id: Optional[str] = None,
        timeout: float = 30.0,
    ):
        super().__init__(api_key, access_token, base_url, workspace_id, timeout)
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)

    def __enter__(self) -> QuickStart:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = self._headers(kwargs.pop("headers", None))
        res = self._client.request(method, path, headers=headers, **kwargs)
        if not res.is_success:
            self._handle_error(res)
        return res.json()

    def _handle_error(self, res: httpx.Response) -> None:
        try:
            body = res.json()
            err = body.get("error", {})
            code = err.get("code", f"HTTP_{res.status_code}")
            message = err.get("message", res.text)
        except Exception:
            code = f"HTTP_{res.status_code}"
            message = res.text
        req_id = res.headers.get("x-request-id")
        raise QuickStartError(res.status_code, code, message, req_id)

    @property
    def webhooks(self):
        client = self

        class _Webhooks:
            verify_signature = staticmethod(verify_webhook_signature)

            def list(self, workspace_id: Optional[str] = None) -> list[dict[str, Any]]:
                ws = client._require_workspace(workspace_id)
                return client._request("GET", f"/v1/workspaces/{ws}/webhooks").get("webhooks", [])

            def create(self, url: str, events: list[str], workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("POST", f"/v1/workspaces/{ws}/webhooks", json={"url": url, "events": events}).get("webhook", {})

        return _Webhooks()

    @property
    def agents(self):
        client = self

        class _Agents:
            def list(self, workspace_id: Optional[str] = None) -> list[dict[str, Any]]:
                ws = client._require_workspace(workspace_id)
                return client._request("GET", f"/v1/workspaces/{ws}/agents").get("agents", [])

            def get(self, agent_id: str, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("GET", f"/v1/workspaces/{ws}/agents/{agent_id}").get("agent", {})

            def create(self, name: str, system_prompt: str, model: str = "gpt-4o", workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("POST", f"/v1/workspaces/{ws}/agents", json={"name": name, "system_prompt": system_prompt, "model": model}).get("agent", {})

        return _Agents()

    @property
    def conversations(self):
        client = self

        class _Conversations:
            def create(self, agent_id: str, metadata: Optional[dict[str, Any]] = None, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("POST", f"/v1/workspaces/{ws}/conversations", json={"agent_id": agent_id, "metadata": metadata or {}}).get("conversation", {})

            def send_turn(self, conversation_id: str, content: str, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("POST", f"/v1/workspaces/{ws}/conversations/{conversation_id}/turns", json={"content": content, "stream": False}).get("turn", {})

            def stream_turn(self, conversation_id: str, content: str, workspace_id: Optional[str] = None) -> Generator[str, None, None]:
                ws = client._require_workspace(workspace_id)
                headers = client._headers({"accept": "text/event-stream"})
                with client._client.stream("POST", f"/v1/workspaces/{ws}/conversations/{conversation_id}/turns", headers=headers, json={"content": content, "stream": True}) as response:
                    if not response.is_success:
                        client._handle_error(response)
                    for line in response.iter_lines():
                        if line.startswith("data:"):
                            yield line[5:].strip()

        return _Conversations()

    @property
    def telephony(self):
        client = self

        class _Telephony:
            def list_numbers(self, workspace_id: Optional[str] = None) -> list[dict[str, Any]]:
                ws = client._require_workspace(workspace_id)
                return client._request("GET", f"/v1/workspaces/{ws}/telephony/numbers").get("numbers", [])

            def dial(self, conversation_id: str, to_e164: str, from_e164: Optional[str] = None, agent_id: Optional[str] = None, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                return client._request("POST", f"/v1/workspaces/{ws}/telephony/dial", json={"conversation_id": conversation_id, "to_e164": to_e164, "from_e164": from_e164, "agent_id": agent_id})

        return _Telephony()


class AsyncQuickStart(_BaseClient):
    """Asynchronous Python client for QuickStart AI Platform."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: Optional[str] = None,
        workspace_id: Optional[str] = None,
        timeout: float = 30.0,
    ):
        super().__init__(api_key, access_token, base_url, workspace_id, timeout)
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)

    async def __aenter__(self) -> AsyncQuickStart:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = self._headers(kwargs.pop("headers", None))
        res = await self._client.request(method, path, headers=headers, **kwargs)
        if not res.is_success:
            self._handle_error(res)
        return res.json()

    def _handle_error(self, res: httpx.Response) -> None:
        try:
            body = res.json()
            err = body.get("error", {})
            code = err.get("code", f"HTTP_{res.status_code}")
            message = err.get("message", res.text)
        except Exception:
            code = f"HTTP_{res.status_code}"
            message = res.text
        req_id = res.headers.get("x-request-id")
        raise QuickStartError(res.status_code, code, message, req_id)

    @property
    def webhooks(self):
        client = self

        class _AsyncWebhooks:
            verify_signature = staticmethod(verify_webhook_signature)

            async def list(self, workspace_id: Optional[str] = None) -> list[dict[str, Any]]:
                ws = client._require_workspace(workspace_id)
                res = await client._request("GET", f"/v1/workspaces/{ws}/webhooks")
                return res.get("webhooks", [])

            async def create(self, url: str, events: list[str], workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                res = await client._request("POST", f"/v1/workspaces/{ws}/webhooks", json={"url": url, "events": events})
                return res.get("webhook", {})

        return _AsyncWebhooks()

    @property
    def conversations(self):
        client = self

        class _AsyncConversations:
            async def create(self, agent_id: str, metadata: Optional[dict[str, Any]] = None, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                res = await client._request("POST", f"/v1/workspaces/{ws}/conversations", json={"agent_id": agent_id, "metadata": metadata or {}})
                return res.get("conversation", {})

            async def send_turn(self, conversation_id: str, content: str, workspace_id: Optional[str] = None) -> dict[str, Any]:
                ws = client._require_workspace(workspace_id)
                res = await client._request("POST", f"/v1/workspaces/{ws}/conversations/{conversation_id}/turns", json={"content": content, "stream": False})
                return res.get("turn", {})

            async def stream_turn(self, conversation_id: str, content: str, workspace_id: Optional[str] = None) -> AsyncGenerator[str, None]:
                ws = client._require_workspace(workspace_id)
                headers = client._headers({"accept": "text/event-stream"})
                async with client._client.stream("POST", f"/v1/workspaces/{ws}/conversations/{conversation_id}/turns", headers=headers, json={"content": content, "stream": True}) as response:
                    if not response.is_success:
                        client._handle_error(response)
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            yield line[5:].strip()

        return _AsyncConversations()
