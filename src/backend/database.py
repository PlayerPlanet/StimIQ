from supabase import create_client, Client

from config import get_settings

_supabase_client: Client = None


def initialize_supabase() -> Client:
    global _supabase_client
    
    settings = get_settings()
    
    try:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to initialize Supabase client. SUPABASE_URL={settings.supabase_url!r}"
        ) from exc
    print(f"✅ Supabase client initialized: {settings.supabase_url}")
    
    return _supabase_client


def get_supabase() -> Client:
    if _supabase_client is None:
        raise RuntimeError("Supabase client not initialized. Call initialize_supabase() first.")
    return _supabase_client
