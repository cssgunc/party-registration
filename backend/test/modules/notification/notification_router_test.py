import pytest
from httpx import AsyncClient
from src.modules.notification.notification_model import SubscriptionStatusDto
from src.modules.notification.notification_service import NotificationService


class TestUnsubscribeRouter:
    client: AsyncClient
    notification_service: NotificationService

    @pytest.fixture(autouse=True)
    async def _setup(
        self,
        unauthenticated_client: AsyncClient,
        notification_service: NotificationService,
    ):
        self.client = unauthenticated_client
        self.notification_service = notification_service

    @pytest.mark.asyncio
    async def test_valid_token_returns_204(self):
        token = self.notification_service._make_token("student@unc.edu")
        res = await self.client.post("/api/notifications/unsubscribe", json={"token": token})
        assert res.status_code == 204

    @pytest.mark.asyncio
    async def test_valid_token_adds_to_unsubscribe_list(self):
        token = self.notification_service._make_token("opt-out@unc.edu")
        await self.client.post("/api/notifications/unsubscribe", json={"token": token})
        assert await self.notification_service.is_unsubscribed("opt-out@unc.edu") is True

    @pytest.mark.asyncio
    async def test_invalid_token_returns_400(self):
        res = await self.client.post("/api/notifications/unsubscribe", json={"token": "bad.token"})
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_malformed_token_returns_400(self):
        res = await self.client.post("/api/notifications/unsubscribe", json={"token": "notvalid"})
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_token_field_returns_422(self):
        res = await self.client.post("/api/notifications/unsubscribe", json={})
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_idempotent_double_unsubscribe(self):
        token = self.notification_service._make_token("twice@unc.edu")
        res1 = await self.client.post("/api/notifications/unsubscribe", json={"token": token})
        res2 = await self.client.post("/api/notifications/unsubscribe", json={"token": token})
        assert res1.status_code == 204
        assert res2.status_code == 204


class TestOneClickUnsubscribeRouter:
    client: AsyncClient
    notification_service: NotificationService

    @pytest.fixture(autouse=True)
    async def _setup(
        self,
        unauthenticated_client: AsyncClient,
        notification_service: NotificationService,
    ):
        self.client = unauthenticated_client
        self.notification_service = notification_service

    @pytest.mark.asyncio
    async def test_valid_token_returns_204(self):
        token = self.notification_service._make_token("oneclick@unc.edu")
        res = await self.client.post(f"/api/notifications/unsubscribe/one-click?token={token}")
        assert res.status_code == 204

    @pytest.mark.asyncio
    async def test_adds_to_unsubscribe_list(self):
        token = self.notification_service._make_token("oneclick2@unc.edu")
        await self.client.post(f"/api/notifications/unsubscribe/one-click?token={token}")
        assert await self.notification_service.is_unsubscribed("oneclick2@unc.edu") is True

    @pytest.mark.asyncio
    async def test_invalid_token_returns_400(self):
        res = await self.client.post("/api/notifications/unsubscribe/one-click?token=bad.token")
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_token_returns_422(self):
        res = await self.client.post("/api/notifications/unsubscribe/one-click")
        assert res.status_code == 422

    @pytest.mark.asyncio
    async def test_idempotent(self):
        token = self.notification_service._make_token("oneclick3@unc.edu")
        res1 = await self.client.post(f"/api/notifications/unsubscribe/one-click?token={token}")
        res2 = await self.client.post(f"/api/notifications/unsubscribe/one-click?token={token}")
        assert res1.status_code == 204
        assert res2.status_code == 204


class TestResubscribeRouter:
    client: AsyncClient
    notification_service: NotificationService

    @pytest.fixture(autouse=True)
    async def _setup(
        self,
        unauthenticated_client: AsyncClient,
        notification_service: NotificationService,
    ):
        self.client = unauthenticated_client
        self.notification_service = notification_service

    @pytest.mark.asyncio
    async def test_resubscribe_removes_from_unsubscribe_list(self):
        await self.notification_service.unsubscribe("resub@unc.edu")
        token = self.notification_service._make_token("resub@unc.edu")
        res = await self.client.post("/api/notifications/resubscribe", json={"token": token})
        assert res.status_code == 204
        assert await self.notification_service.is_unsubscribed("resub@unc.edu") is False

    @pytest.mark.asyncio
    async def test_resubscribe_already_subscribed_is_no_op(self):
        token = self.notification_service._make_token("alreadysub@unc.edu")
        res = await self.client.post("/api/notifications/resubscribe", json={"token": token})
        assert res.status_code == 204

    @pytest.mark.asyncio
    async def test_invalid_token_returns_400(self):
        res = await self.client.post("/api/notifications/resubscribe", json={"token": "bad.token"})
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_token_returns_422(self):
        res = await self.client.post("/api/notifications/resubscribe", json={})
        assert res.status_code == 422


class TestSubscriptionStatusRouter:
    client: AsyncClient
    notification_service: NotificationService

    @pytest.fixture(autouse=True)
    async def _setup(
        self,
        unauthenticated_client: AsyncClient,
        notification_service: NotificationService,
    ):
        self.client = unauthenticated_client
        self.notification_service = notification_service

    @pytest.mark.asyncio
    async def test_returns_subscribed_for_new_email(self):
        token = self.notification_service._make_token("new@unc.edu")
        res = await self.client.get(f"/api/notifications/subscription-status?token={token}")
        assert res.status_code == 200
        assert SubscriptionStatusDto(**res.json()).is_subscribed is True

    @pytest.mark.asyncio
    async def test_returns_not_subscribed_after_unsubscribe(self):
        await self.notification_service.unsubscribe("gone@unc.edu")
        token = self.notification_service._make_token("gone@unc.edu")
        res = await self.client.get(f"/api/notifications/subscription-status?token={token}")
        assert res.status_code == 200
        assert SubscriptionStatusDto(**res.json()).is_subscribed is False

    @pytest.mark.asyncio
    async def test_invalid_token_returns_400(self):
        res = await self.client.get("/api/notifications/subscription-status?token=bad.token")
        assert res.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_token_returns_422(self):
        res = await self.client.get("/api/notifications/subscription-status")
        assert res.status_code == 422
