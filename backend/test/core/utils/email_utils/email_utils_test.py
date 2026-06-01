from collections.abc import Callable
from email.message import Message
from unittest.mock import AsyncMock, patch

import pytest
from src.core.config import env
from src.core.utils.email_utils import EmailService


async def _send_and_capture() -> Message:
    """Send a test email and return the captured MIMEMultipart message."""
    with patch("src.core.utils.email_utils.aiosmtplib.send", new=AsyncMock()) as mock_send:
        await EmailService().send_email(
            to="recipient@unc.edu",
            subject="Test Subject",
            body_html="<p>Hello.</p>",
        )
        assert mock_send.await_args is not None
        return mock_send.await_args.args[0]


def _has_plain_text_part(message: Message) -> bool:
    return any(part.get_content_type() == "text/plain" for part in message.walk())


def _has_html_part(message: Message) -> bool:
    return any(part.get_content_type() == "text/html" for part in message.walk())


@pytest.mark.parametrize(
    ("description", "check"),
    [
        ("Reply-To header matches CONTACT_EMAIL", lambda m: m["Reply-To"] == env.CONTACT_EMAIL),
        ("Date header is present", lambda m: bool(m["Date"])),
        ("Message-ID header is present", lambda m: bool(m["Message-ID"])),
        (
            "Message-ID uses EMAIL_FROM domain",
            lambda m: env.EMAIL_FROM.split("@", 1)[-1] in m["Message-ID"],
        ),
        ("Auto-Submitted is auto-generated", lambda m: m["Auto-Submitted"] == "auto-generated"),
        ("From header matches EMAIL_FROM", lambda m: m["From"] == env.EMAIL_FROM),
        (
            "Subject header matches caller-provided subject",
            lambda m: m["Subject"] == "Test Subject",
        ),
        ("text/plain alternative is attached", _has_plain_text_part),
        ("text/html alternative is attached", _has_html_part),
    ],
)
@pytest.mark.asyncio
async def test_send_email_metadata(description: str, check: Callable[[Message], bool]):
    message = await _send_and_capture()
    assert check(message), description
