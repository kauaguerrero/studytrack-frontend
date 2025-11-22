from flask import Blueprint, render_template

# Blueprint para renderização do dashboard (Jinja2)
dashboard_bp = Blueprint("dashboard", __name__, template_folder="../templates")


@dashboard_bp.route("/dashboard")
def home():
    """GET /dashboard"""

    # TODO: Obter dados do usuário logado (cookie do Supabase)

    # Mock data GENÉRICO para o template
    user_data = {"name": "Usuário Teste", "email": "teste@exemplo.com"}

    tasks_data = [
        {"desc": "Estudar Logaritmos (Propriedades)", "done": True},
        {"desc": "Estudar MRUV (Torricelli)", "done": False},
        {"desc": "Revisar anotações de Redação", "done": False},
    ]

    # Renderiza o template
    return render_template("dashboard.html", user=user_data, tasks=tasks_data)
