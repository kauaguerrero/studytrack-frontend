import requests
import time

BASE_URL = "http://localhost:8080"
API_KEY = "studytrackskey12345"
INSTANCE_NAME = "studytrack-instance"

headers = {"apikey": API_KEY, "Content-Type": "application/json"}


def create_instance():
    print(f"--- Criando instância '{INSTANCE_NAME}' ---")
    url = f"{BASE_URL}/instance/create"
    payload = {
        "instanceName": INSTANCE_NAME,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }

    try:
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 403:
            print("ERRO 403: Acesso negado. Verifique se a API_KEY está correta.")
            return False

        if response.status_code == 201 or response.status_code == 200:
            print("Instância criada (ou já existia).")
            return True

        print(f"Erro ao criar ({response.status_code}): {response.text}")
        return False
    except Exception as e:
        print(f"Erro de conexão: {e}")
        print("Verifique se o Docker está rodando (docker-compose up).")
        return False


def connect_instance():
    print(f"\n--- Buscando QR Code ---")
    url = f"{BASE_URL}/instance/connect/{INSTANCE_NAME}"

    try:
        response = requests.get(url, headers=headers)
        data = response.json()

        if "base64" in data:
            print(
                "\nSUCESSO! Copie o código abaixo e cole no navegador (ex: https://base64.guru/converter/decode/image) para ver o QR Code:\n"
            )
            print(data["base64"])
            print("\n(Dica: Você também pode ver o QR Code nos logs do Docker)")
        elif "instance" in data and data["instance"]["state"] == "open":
            print("Esta instância JÁ ESTÁ conectada! Não precisa de QR Code.")
        else:
            print("Resposta da API:", data)

    except Exception as e:
        print(f"Erro: {e}")


if __name__ == "__main__":
    if create_instance():
        time.sleep(2)
        connect_instance()
