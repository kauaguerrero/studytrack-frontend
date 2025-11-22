import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuração base"""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = False

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

    # Configuração Evolution API
    EVOLUTION_BASE_URL = os.getenv("EVOLUTION_BASE_URL", "http://localhost:8080")
    EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY")
    EVOLUTION_INSTANCE_NAME = os.getenv(
        "EVOLUTION_INSTANCE_NAME", "studytrack-instance"
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
