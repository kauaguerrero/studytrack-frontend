from flask import Flask, jsonify
from config import config_by_name
from .utils.supabase_client import init_supabase


def create_app(config_name: str = "development") -> Flask:
    """Application Factory"""

    app = Flask(__name__)

    app.config.from_object(config_by_name[config_name])

    # (Supabase)
    init_supabase(app.config["SUPABASE_URL"], app.config["SUPABASE_SERVICE_KEY"])

    # Auth (Onboarding)
    from .blueprints.auth import auth_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # Dashboard
    from .blueprints.dashboard import dashboard_bp

    app.register_blueprint(dashboard_bp)  # Raiz '/'

    # Webhooks (WhatsApp)
    from .blueprints.webhook import webhook_bp

    app.register_blueprint(webhook_bp, url_prefix="/api/webhook")

    # Rota de Health Check
    @app.route("/health")
    def health_check():
        return jsonify(status="ok", environment=config_name), 200

    # Scheduler (Cron Jobs)
    from .blueprints.scheduler import scheduler_bp

    app.register_blueprint(scheduler_bp, url_prefix="/api/cron")

    return app
