import os
from dotenv import load_dotenv

load_dotenv(override=True)

from app import create_app

config_name = os.getenv("FLASK_ENV", "development")

app = create_app(config_name)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1" or app.config.get("DEBUG", True)
    print(f"🚀 Iniciando servidor em modo: {config_name}")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)