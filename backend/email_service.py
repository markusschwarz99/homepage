import resend
import os

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
