from flask import Blueprint, jsonify
from app.services.scheduler_service import process_daily_tasks

scheduler_bp = Blueprint("scheduler", __name__)


@scheduler_bp.route("/trigger-daily", methods=["POST", "GET"])
def trigger_daily_cron():
    """
    Rota para disparar manualmente o envio de tarefas.
    Em produção, o Railway/Vercel Cron vai chamar essa URL todo dia.
    """
    # Segurança simples para evitar abuso (poderíamos checar um token no header)
    # if request.headers.get('Authorization') != 'meu-segredo-cron':
    #    return jsonify(error="Unauthorized"), 401

    result = process_daily_tasks()
    return jsonify(status="completed", details=result), 200
