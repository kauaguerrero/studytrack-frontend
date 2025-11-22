from supabase import create_client, Client

# Instância global do cliente Supabase
supabase_client: Client = None


def init_supabase(url: str, key: str):
    """init_supabase: Inicializa o cliente global"""
    global supabase_client
    if not url or not key:
        raise ValueError("Supabase URL e Key são obrigatórios no .env")
    supabase_client = create_client(url, key)


def get_supabase() -> Client:
    """get_supabase: Retorna o cliente inicializado"""
    global supabase_client
    if supabase_client is None:
        raise Exception("Cliente Supabase não inicializado.")
    return supabase_client
