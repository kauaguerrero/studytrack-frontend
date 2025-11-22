from datetime import date
from app.utils.supabase_client import get_supabase
from app.services.whatsapp_service import send_message


def process_daily_tasks():
    """
    Lógica Principal do Cron Job (Roda todo dia às 08:00)
    1. Busca tarefas agendadas para HOJE.
    2. Faz o Join com o perfil (para pegar o telefone) e o conteúdo (para pegar o link).
    3. Envia a mensagem.
    """
    supabase = get_supabase()
    today = date.today().isoformat()  # Formato YYYY-MM-DD

    print(f"--- Iniciando Cron Job Diário: {today} ---")

    try:

        # 1. Busca tarefas de hoje que não foram completadas
        response = (
            supabase.table("plan_tasks")
            .select(
                "*, profiles(full_name, whatsapp_phone), content_repository(title, url, content_type)"
            )
            .eq("scheduled_date", today)
            .eq("status", "pending")
            .execute()
        )

        tasks = response.data

        if not tasks:
            print("Nenhuma tarefa encontrada para hoje.")
            return "Sem tarefas"

        print(f"Encontradas {len(tasks)} tarefas para processar.")

        count_sent = 0

        for task in tasks:
            user = task.get("profiles")
            content = task.get("content_repository")

            if not user or not user.get("whatsapp_phone"):
                print(f"Pular tarefa {task['id']}: Usuário sem telefone.")
                continue

            # Monta a mensagem
            phone = user["whatsapp_phone"]
            name = user.get("full_name", "Estudante").split(" ")[0]  # Primeiro nome
            task_desc = task["task_description"]

            # Cabeçalho da mensagem
            msg = (
                f"Bom dia, {name}! ☀️\n\n"
                f"Sua meta de hoje na StudyTrack é:\n"
                f"🎯 *{task_desc}*\n\n"
            )

            # Adiciona link se houver conteúdo curado
            if content:
                icon = "🎥" if content["content_type"] == "video" else "📄"
                msg += (
                    f"Material Recomendado:\n"
                    f"{icon} {content['title']}\n"
                    f"{content['url']}\n\n"
                )
            else:
                msg += "Sem material específico hoje. Use suas anotações!\n\n"

            msg += "Responda 'FEITO' quando terminar para manter seu Streak! 🔥"

            # Envia (usa a Evolution configurada)
            sent = send_message(phone, msg)
            if sent:
                count_sent += 1

        return f"Processado. Enviadas: {count_sent}/{len(tasks)}"

    except Exception as e:
        print(f"Erro Crítico no Scheduler: {e}")
        return str(e)
