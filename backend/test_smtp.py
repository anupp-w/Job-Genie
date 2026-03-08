import smtplib
from email.message import EmailMessage

import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAILS_FROM_EMAIL = os.getenv("EMAILS_FROM_EMAIL")

def test_email():
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Missing credentials in .env")
        return

    msg = EmailMessage()
    msg.set_content("This is a test email from the Job Genie SMTP tester.")
    msg["Subject"] = "Test Email Delivery - Job Genie"
    msg["From"] = EMAILS_FROM_EMAIL
    msg["To"] = "anupwagle181@gmail.com"  # The target user email 

    try:
        print(f"Attempting to log into {SMTP_SERVER}:{SMTP_PORT} as {SMTP_USER}...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.set_debuglevel(1)  # Enable debug output to trace connection
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            print("Successfully sent email!")
    except Exception as e:
        print(f"Failed to send: {e}")

if __name__ == "__main__":
    test_email()
