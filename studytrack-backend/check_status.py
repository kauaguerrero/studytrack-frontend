import requests
import os
from dotenv import load_dotenv

# Carrega o que o seu projeto "acha" que é verdade
load_dotenv()

BASE_URL = os.getenv("EVOLUTION_BASE_URL", "http://localhost:8080")
API_KEY = os.getenv("EVOLUTION_API_KEY")
EXPECTED_INSTANCE = os.getenv("EVOLUTION_INSTANCE_NAME")

print(f"--- DIAGNÓSTICO EVOLUTION API ---")
print(f"1. Configuração do .env:")
print(f"   URL: {BASE_URL}")
print(f"   API KEY: {API_KEY}")
print(f"   Instância Esperada: {EXPECTED_INSTANCE}")

headers = {"apikey": API_KEY}

try:
    # Tenta listar TODAS as instâncias que a Evolution conhece
    url = f"{BASE_URL}/instance/fetchInstances"
    print(f"\n2. Consultando a Evolution ({url})...")

    response = requests.get(url, headers=headers)

    if response.status_code == 403:
        print("❌ ERRO FATAL: Sua API KEY está incorreta ou a Evolution rejeitou.")
        exit()

    if response.status_code != 200:
        print(f"❌ ERRO: A Evolution retornou código {response.status_code}")
        print(response.text)
        exit()

    instances = response.json()

    # Se a resposta for uma lista (comum na v2) ou um objeto
    if isinstance(instances, list):
        data_list = instances
    else:
        # As vezes vem dentro de um wrapper, dependendo da versao
        data_list = instances if isinstance(instances, list) else []

    print(f"✅ Sucesso! A Evolution respondeu.")

    found = False
    print("\n--- INSTÂNCIAS ENCONTRADAS ---")
    for inst in data_list:
        # Tenta pegar o nome de várias formas possíveis (estrutura muda entre versões)
        name = inst.get("name") or inst.get("instance") or inst.get("instanceName")
        status = inst.get("status") or inst.get("connectionStatus")

        print(f" > Nome: '{name}' | Status: {status}")

        if name == EXPECTED_INSTANCE:
            found = True
            if status != "open":
                print(
                    f"   ⚠️ ALERTA: A instância '{name}' existe, mas NÃO ESTÁ CONECTADA (Status: {status})."
                )
                print("   -> Rode o setup novamente e leia o QR Code.")
            else:
                print(
                    f"   ✅ SUCESSO: A instância '{name}' existe e está CONECTADA ('open')."
                )

    if not found:
        print(
            f"\n❌ ERRO CRÍTICO: A instância '{EXPECTED_INSTANCE}' (do seu .env) NÃO EXISTE na Evolution."
        )
        print(
            "   -> Você precisa criar uma instância com ESSE EXATO NOME ou mudar seu .env."
        )

except Exception as e:
    print(f"\n❌ ERRO DE CONEXÃO: Não foi possível falar com a Evolution.")
    print(f"   Detalhe: {e}")
    print("   -> Verifique se o Docker está rodando (docker-compose up).")
