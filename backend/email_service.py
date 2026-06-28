import resend
import os
import html

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@markus-schwarz.cc")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://markus-schwarz.cc")

def send_verification_email(to_email: str, name: str, token: str):
    verify_url = f"{FRONTEND_URL}/verify?token={token}"
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Bitte bestätige deine Email-Adresse",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 500; margin-bottom: 16px;">Hallo {name}!</h1>
            <p style="color: #666; margin-bottom: 32px;">
                Vielen Dank für deine Registrierung. Bitte bestätige deine Email-Adresse um fortzufahren.
            </p>
            <a href="{verify_url}"
               style="background: #0D0D0D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                Email bestätigen
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
                Falls du dich nicht registriert hast, kannst du diese Email ignorieren.
            </p>
        </div>
        """
    })

def send_approved_email(to_email: str, name: str):
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Dein Account wurde freigegeben!",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 500; margin-bottom: 16px;">Willkommen, {name}!</h1>
            <p style="color: #666; margin-bottom: 32px;">
                Dein Account wurde von einem Administrator freigegeben. 
                Du kannst dich jetzt einloggen und alle Inhalte sehen.
            </p>
            <a href="{FRONTEND_URL}/login"
               style="background: #0D0D0D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                Jetzt einloggen
            </a>
        </div>
        """
    })

def send_password_reset_email(to_email: str, name: str, token: str):
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Passwort zurücksetzen",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 500; margin-bottom: 16px;">Hallo {name}!</h1>
            <p style="color: #666; margin-bottom: 32px;">
                Du hast das Zurücksetzen deines Passworts angefordert. Klicke auf den Button unten, um ein neues Passwort zu vergeben. Der Link ist eine Stunde lang gültig.
            </p>
            <a href="{reset_url}"
               style="background: #0D0D0D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                Passwort zurücksetzen
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
                Falls du diese Anfrage nicht gestellt hast, kannst du diese Email ignorieren. Dein Passwort bleibt unverändert.
            </p>
        </div>
        """
    })

def _render_shopping_items(items: list[dict]) -> str:
    """Rendert eine Artikel-Liste als HTML-<ul>. User-Input wird escaped."""
    if not items:
        return '<p style="color: #999; font-size: 14px; margin: 0;">Keine Artikel.</p>'
    rows = ""
    for it in items:
        name = html.escape(it["name"])
        quantity = html.escape(it["quantity"])
        desc = it.get("description")
        desc_html = (
            f' <span style="color: #999;">– {html.escape(desc)}</span>' if desc else ""
        )
        rows += (
            '<li style="padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">'
            f'<strong>{name}</strong> '
            f'<span style="color: #666;">({quantity})</span>'
            f'{desc_html}'
            '</li>'
        )
    return f'<ul style="list-style: none; padding: 0; margin: 0;">{rows}</ul>'

def send_shopping_list_digest(to_email: str, name: str, new_items: list[dict], all_items: list[dict]):
    """
    Sammel-Mail über neu hinzugefügte Einkaufslisten-Artikel.
    new_items / all_items sind Listen von {name, quantity, description}-Dicts.
    """
    shopping_url = f"{FRONTEND_URL}/einkaufsliste"
    count = len(new_items)
    intro = (
        f"{count} {'neuer Artikel wurde' if count == 1 else 'neue Artikel wurden'} "
        "zur Einkaufsliste hinzugefügt:"
    )
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": f"Neue Artikel auf der Einkaufsliste ({count})",
        "html": f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 500; margin-bottom: 16px;">Hallo {html.escape(name)}!</h1>
            <p style="color: #666; margin-bottom: 24px;">{intro}</p>
            <h2 style="font-size: 16px; font-weight: 500; margin: 0 0 8px;">Neu</h2>
            {_render_shopping_items(new_items)}
            <h2 style="font-size: 16px; font-weight: 500; margin: 32px 0 8px;">Aktuelle Einkaufsliste</h2>
            {_render_shopping_items(all_items)}
            <a href="{shopping_url}"
               style="display: inline-block; margin-top: 32px; background: #0D0D0D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                Zur Einkaufsliste
            </a>
        </div>
        """
    })
