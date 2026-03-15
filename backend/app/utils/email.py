import smtplib
from email.message import EmailMessage
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_reset_code_email(email_to: str, reset_code: str):
    subject = "Your Password Reset Code - Job Genie"
    body = f"""
    Hello,

    We received a request to reset your password. 
    Your password reset code is: {reset_code}
    
    This code will expire in 15 minutes.
    
    If you did not request a password reset, please ignore this email.
    
    Thanks,
    Job Genie
    """

    # If SMTP is not configured, just print to console (useful for local testing)
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP credentials not set. Would have sent code {reset_code} to {email_to}")
        print(f"MOCK EMAIL: To: {email_to} | Code: {reset_code}")
        return

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = email_to

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            logger.info(f"Password reset email sent to {email_to}")
    except Exception as e:
        logger.error(f"Failed to send email to {email_to}: {e}")
        # Re-raise or handle as needed, but for now we log it.
