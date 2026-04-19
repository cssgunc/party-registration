from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from src.core.config import env


class EmailService:
    async def send_email(self, to: str, subject: str, html: str) -> None:
        message = MIMEMultipart("alternative")
        message["From"] = env.EMAIL_FROM
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(html, "html"))

        await aiosmtplib.send(
            message,
            hostname=env.SMTP_HOST,
            port=env.SMTP_PORT,
            username=env.SMTP_USER or None,
            password=env.SMTP_PASSWORD or None,
            use_tls=env.SMTP_TLS,
        )
