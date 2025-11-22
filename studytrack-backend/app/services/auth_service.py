from app.utils.supabase_client import get_supabase
from app.services.whatsapp_service import send_welcome_message
from supabase import PostgrestAPIResponse


def complete_onboarding(user_id: str, phone: str) -> tuple:
    """Lógica de negócio do Onboarding Gated"""

    supabase = get_supabase()

    try:
        # 1. Atualiza 'profiles' com o whatsapp_phone
        response = (
            supabase.table("profiles")
            .update({"whatsapp_phone": phone})
            .eq("id", user_id)
            .execute()
        )

        # Verificação de segurança caso a resposta venha vazia
        if not response.data:
            return None, "Usuário não encontrado ou falha ao atualizar."

        user_profile = response.data[0]
        user_name = user_profile.get("full_name", "Estudante")

        # 2. Dispara o bot de boas-vindas
        send_welcome_message(phone, user_name)

        return user_profile, None

    except Exception as e:
        print(f"[auth_service] Erro: {e}")
        return None, str(e)
