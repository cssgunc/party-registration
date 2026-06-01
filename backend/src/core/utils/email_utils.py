import html as html_lib
import re
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from pathlib import Path

import aiosmtplib
from src.core.config import env

_LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "partysmart_logo.png"
_LOGO_CID = "partysmart_logo"


_FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
_BODY_STYLE = (
    f"margin:0;padding:0;background-color:#f4f4f7;font-family:{_FONT_STACK};color:#333333;"
)
_PREHEADER_STYLE = (
    "display:none!important;visibility:hidden;opacity:0;color:transparent;"
    "height:0;width:0;overflow:hidden;mso-hide:all;"
)


def _render_html(subject: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{subject}</title>
</head>
<body style="{_BODY_STYLE}">
  <span style="{_PREHEADER_STYLE}">{subject}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background-color:#ffffff;
                      border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:24px 24px 20px 24px;border-bottom:1px solid #e5e7eb;">
              <img src="cid:{_LOGO_CID}" alt="PartySmart by OCSL" width="120" height="120"
                   style="display:block;margin:0 auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:14px;line-height:1.5;color:#333333;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;
                       text-align:center;">
              <a href="{str(env.OCSL_WEBSITE_URL).rstrip("/")}" style="color:#6b7280;">
                UNC Off-Campus Student Life
              </a>
              &nbsp;&nbsp;
              Questions? <a href="mailto:{env.CONTACT_EMAIL}"
                            style="color:#6b7280;">{env.CONTACT_EMAIL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _html_to_plain(body_html: str) -> str:
    """Convert the inner body HTML to a readable plain-text version."""
    text = body_html
    # <a href="X">Y</a> -> Y (X)
    text = re.sub(
        r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        lambda m: f"{re.sub(r'<[^>]+>', '', m.group(2)).strip()} ({m.group(1)})",
        text,
        flags=re.DOTALL,
    )
    # Lists: <li>X</li> -> "- X\n"
    text = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", text, flags=re.DOTALL)
    # Block-ish breaks
    text = re.sub(r"</?(p|div|ul|ol|br\s*/?)\s*[^>]*>", "\n", text, flags=re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode entities, normalize whitespace
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _render_plain(body_html: str) -> str:
    body = _html_to_plain(body_html)
    return (
        "PartySmart by OCSL\n"
        "==================\n\n"
        f"{body}\n\n"
        "---\n"
        f"UNC Off-Campus Student Life — {str(env.OCSL_WEBSITE_URL).rstrip('/')}\n"
        f"Questions? Contact {env.CONTACT_EMAIL}\n"
    )


class EmailService:
    async def send_email(
        self,
        to: str,
        subject: str,
        body_html: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        """Send an email. The body_html is wrapped in the shared PartySmart template."""
        rendered_html = _render_html(subject, body_html)
        rendered_text = _render_plain(body_html)

        message = MIMEMultipart("related")
        message["From"] = env.EMAIL_FROM
        message["To"] = to
        message["Subject"] = subject
        message["Reply-To"] = env.CONTACT_EMAIL
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid(domain=env.EMAIL_FROM.split("@", 1)[-1])
        message["Auto-Submitted"] = "auto-generated"
        if headers:
            for key, value in headers.items():
                message[key] = value

        alternative = MIMEMultipart("alternative")
        alternative.attach(MIMEText(rendered_text, "plain"))
        alternative.attach(MIMEText(rendered_html, "html"))
        message.attach(alternative)

        with open(_LOGO_PATH, "rb") as f:
            logo = MIMEImage(f.read(), _subtype="png")
        logo.add_header("Content-ID", f"<{_LOGO_CID}>")
        logo.add_header("Content-Disposition", "inline", filename="partysmart_logo.png")
        message.attach(logo)

        await aiosmtplib.send(
            message,
            hostname=env.SMTP_HOST,
            port=env.SMTP_PORT,
            username=env.SMTP_USER or None,
            password=env.SMTP_PASSWORD or None,
            use_tls=env.SMTP_TLS,
        )
