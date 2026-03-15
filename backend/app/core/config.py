import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import urllib.parse

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Job Genie API"
    API_V1_STR: str = "/api/v1"
    
    # Database
    # Encode password to handle special chars like '@'
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "uniglobe@123"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "jobgenie"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        encoded_pwd = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{encoded_pwd}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Security
    SECRET_KEY: str = "supersecretkey" # TODO: Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Email / SMTP
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "no-reply@jobgenie.local")
    EMAILS_FROM_NAME: str = os.getenv("EMAILS_FROM_NAME", "Job Genie")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
