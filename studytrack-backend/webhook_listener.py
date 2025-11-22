from flask import Flask, request, json
import os

app = Flask(__name__)

VERIFY_TOKEN = "kaua2112"  # Token de verificação


@app.route("/webhook", methods=["GET"])
def webhook_verify():
    print("Recebendo requisição GET de verificação...")

    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        print(f"Webhook verificado! Retornando challenge: {challenge}")
        return challenge, 200
    else:
        print("Falha na verificação do Webhook.")
        return "Falha na verificação", 403


@app.route("/webhook", methods=["POST"])
def webhook_receive():
    """
    É AQUI que o relatório de erro (ou sucesso) vai chegar.
    """
    print("\n" + "=" * 50)
    print("!!! NOTIFICAÇÃO DE WEBHOOK RECEBIDA (POST) !!!")

    data = request.get_json()
    print(json.dumps(data, indent=2))  # Printa o JSON completo!

    # Você DEVE retornar 200 OK para a Meta, senão ela acha que falhou.
    return "Evento recebido", 200


if __name__ == "__main__":
    print("Iniciando servidor Flask para escutar o webhook...")
    app.run(port=5000, debug=True)
