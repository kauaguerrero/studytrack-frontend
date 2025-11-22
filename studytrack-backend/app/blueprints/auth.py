from flask import Blueprint, request, jsonify
from app.services.auth_service import complete_onboarding

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/onboarding/complete", methods=["POST"])
def handle_onboarding():
    """POST /api/auth/onboarding/complete"""

    data = request.get_json()
    phone = data.get("whatsapp_phone")

    # TODO: Obter user_id do token JWT (Supabase Auth)
    # user_id = request.user.id
    user_id_simulado = "df5150c7-d19c-4b67-acb5-1158ffc673c8"  # Simulação para testes

    if not phone:
        return jsonify(error="whatsapp_phone é obrigatório"), 400

    # Delega a lógica para o service layer
    result, error = complete_onboarding(user_id_simulado, phone)

    if error:
        return jsonify(error=error), 500

    return jsonify(success=True, data=result), 200
