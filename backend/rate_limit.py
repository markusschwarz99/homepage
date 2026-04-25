"""Zentraler Rate-Limiter. Nutzt CF-Connecting-IP hinter Cloudflare Tunnel."""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_client_ip(request: Request) -> str:
    # Cloudflare setzt die echte Client-IP hier
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip
    # Fallback: X-Forwarded-For (erstes Element)
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)

# In Test-Umgebung deaktivieren — sonst rennen E2E-Tests in Login-Rate-Limits
if os.getenv("ENVIRONMENT") == "test":
    limiter.enabled = False
