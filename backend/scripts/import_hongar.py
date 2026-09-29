"""
hongar-Website: Inhalte der alten Seite hongar.at (Joomla/YOOtheme) übernehmen.

Legt pro alter Seite eine CMS-Seite als ENTWURF an (Titel, gesäuberter Text,
Titelbild + Galerie) und füllt leere globale Texte vor (Öffnungszeiten,
Aktuelles, Kontakt, Facebook-/Buchungs-Link, Webcam-Bilder).

Die Inhalte selbst stehen bewusst NICHT in diesem Skript (öffentliches Repo) –
es enthält nur die Zuordnung alter Adressen zu neuen Kürzeln und holt Texte
und Bilder beim Lauf direkt von hongar.at.

Aufruf (im Backend-Container):
  python scripts/import_hongar.py --dry-run
  python scripts/import_hongar.py

Idempotent: Seiten, deren Kürzel schon existiert, werden übersprungen (keine
Änderungen der Redaktion werden überschrieben); globale Texte werden nur
gesetzt, solange sie leer sind.
"""

import argparse
import html
import re
import sys
import time
import urllib.request
from dataclasses import dataclass, field
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from typing import Callable, Optional
from urllib.parse import urljoin, urlparse

# Damit der Container-Import-Pfad passt: /app im sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import nh3  # noqa: E402
from PIL import Image, ImageOps  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

import models  # noqa: E402
from routers.hongar import SETTING_PREFIX, UPLOAD_DIR, sanitize_html  # noqa: E402
from upload_utils import save_image  # noqa: E402

BASE_URL = "https://hongar.at"
OLD_HOSTS = {"hongar.at", "www.hongar.at"}
USER_AGENT = "hongar-import (markus-schwarz.cc)"


@dataclass(frozen=True)
class PageSpec:
    path: str  # alter Pfad auf hongar.at
    slug: str  # neues Kürzel
    parent: Optional[str] = None
    show_in_nav: bool = True
    with_content: bool = True  # False: nur (leere) Elternseite anlegen


PAGES = [
    PageSpec("/index.php", "start"),
    # /index.php/almgasthof zeigt denselben Artikel wie die Startseite -> nur Elternseite
    PageSpec("/index.php/almgasthof", "almgasthof", with_content=False),
    PageSpec("/index.php/almgasthof/geschichte", "geschichte", "almgasthof"),
    PageSpec("/index.php/almgasthof/speisen-getraenke", "speisen-getraenke", "almgasthof"),
    PageSpec("/index.php/almgasthof/lieferanten", "lieferanten", "almgasthof"),
    PageSpec("/index.php/veranstaltungen", "veranstaltungen"),
    PageSpec("/index.php/veranstaltungen/volksmusikantentreffen", "volksmusikantentreffen", "veranstaltungen"),
    PageSpec("/index.php/veranstaltungen/bergmesse", "bergmesse", "veranstaltungen"),
    PageSpec("/index.php/ferienhaus", "ferienhaus"),
    PageSpec("/index.php/aktivitaeten", "aktivitaeten"),
    PageSpec("/index.php/aktivitaeten/spielplatz", "spielplatz", "aktivitaeten"),
    PageSpec("/index.php/aktivitaeten/wandern", "wandern", "aktivitaeten"),
    PageSpec("/index.php/aktivitaeten/mountainbike", "mountainbike", "aktivitaeten"),
    PageSpec("/index.php/aktivitaeten/rodeln", "rodeln", "aktivitaeten"),
    PageSpec("/index.php/kontakt", "kontakt"),
    PageSpec("/index.php/kontakt/impressum", "impressum", show_in_nav=False),
    PageSpec("/index.php/30-datenschutzerklaerung", "datenschutz", show_in_nav=False),
]
WEBCAM_PATH = "/index.php/webcam"


def build_link_map() -> dict[str, str]:
    """Alte Pfade -> neue Pfade (für Links im Text)."""
    links = {spec.path: "/" if spec.slug == "start" else f"/{spec.slug}" for spec in PAGES}
    links[WEBCAM_PATH] = "/webcam"
    links["/"] = "/"
    return links


# ---------- HTML-Hilfen (nur Standardbibliothek + nh3) ----------

VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
}
RAW_TAGS = {"script", "style"}


class _Capture(HTMLParser):
    """Sammelt das innere HTML aller (äußersten) Elemente, auf die `match` zutrifft.

    Robust gegen nicht geschlossene Tags: ein schließendes Tag schließt alle
    darin noch offenen Elemente mit.
    """

    def __init__(self, match: Callable[[str, dict], bool]):
        super().__init__(convert_charrefs=True)
        self.match = match
        self.results: list[tuple[dict, str]] = []
        self._stack: list[str] = []
        self._buf: list[str] = []
        self._attrs: dict = {}

    def handle_starttag(self, tag, attrs):
        if self._stack:
            self._buf.append(self.get_starttag_text() or "")
            if tag not in VOID_TAGS:
                self._stack.append(tag)
        elif tag not in VOID_TAGS and self.match(tag, dict(attrs)):
            self._attrs = dict(attrs)
            self._stack = [tag]
            self._buf = []

    def handle_startendtag(self, tag, attrs):
        if self._stack:
            self._buf.append(self.get_starttag_text() or "")

    def handle_endtag(self, tag):
        if not self._stack or tag not in self._stack:
            return
        while self._stack:
            open_tag = self._stack.pop()
            if not self._stack:
                self.results.append((self._attrs, "".join(self._buf)))
                return
            self._buf.append(f"</{open_tag}>")
            if open_tag == tag:
                return

    def handle_data(self, data):
        if self._stack:
            raw = self._stack[-1] in RAW_TAGS
            self._buf.append(data if raw else html.escape(data, quote=False))


def capture(fragment: str, match: Callable[[str, dict], bool]) -> list[tuple[dict, str]]:
    parser = _Capture(match)
    parser.feed(fragment)
    parser.close()
    return parser.results


def has_class(attrs: dict, name: str) -> bool:
    return name in (attrs.get("class") or "").split()


def text_of(fragment: str) -> str:
    text = html.unescape(nh3.clean(fragment, tags=set()))
    return " ".join(text.split())


def absolute(url: str) -> str:
    return urljoin(BASE_URL + "/", html.unescape(url.strip()))


def is_old_site(url: str) -> bool:
    return (urlparse(url).hostname or "") in OLD_HOSTS


# ---------- Extraktion ----------

def extract_article(page_html: str) -> tuple[str, str]:
    """Titel (h1) und Inhalt (div.tm-article-content) des Joomla-Artikels."""
    articles = capture(page_html, lambda t, a: t == "article" and has_class(a, "uk-article"))
    if not articles:
        raise ValueError("kein Artikel gefunden")
    inner = articles[0][1]
    heads = capture(inner, lambda t, a: t == "h1")
    bodies = capture(inner, lambda t, a: has_class(a, "tm-article-content"))
    return (text_of(heads[0][1]) if heads else ""), (bodies[0][1] if bodies else "")


def extract_panels(page_html: str) -> list[tuple[str, str]]:
    """Seitenleisten-Kästen als (Überschrift, Inhalt ohne Überschrift)."""
    asides = capture(page_html, lambda t, a: t == "aside")
    if not asides:
        return []
    panels = []
    for _, inner in capture(asides[0][1], lambda t, a: t == "div" and has_class(a, "uk-panel")):
        heads = capture(inner, lambda t, a: t == "h3" and has_class(a, "uk-panel-title"))
        title = text_of(heads[0][1]) if heads else ""
        body = re.sub(r"<h3\b[^>]*uk-panel-title[^>]*>.*?</h3>", "", inner, count=1, flags=re.S)
        panels.append((title, body))
    return panels


def extract_bottom(page_html: str) -> str:
    """Block unter dem Inhalt (Kontaktdaten)."""
    blocks = capture(page_html, lambda t, a: has_class(a, "tm-bottom"))
    return blocks[0][1] if blocks else ""


_CLOAK_RE = re.compile(
    r'<span id="cloak(?P<id>\w+)">.*?</span>\s*<script\b[^>]*>(?P<js>.*?)</script>', re.S
)
_JS_STRING_RE = re.compile(r"'((?:[^'\\]|\\.)*)'")
# Rechte Seite einer JS-Zuweisung bis zum ";" – Strichpunkte in Strings (z.B. '&#64;') zählen nicht
_JS_RHS = r"((?:'(?:[^'\\]|\\.)*'|[^';])*);"
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def decloak_emails(page_html: str, warnings: list[str]) -> str:
    """Joomla-3-Spamschutz (E-Mail per JavaScript zusammengesetzt) -> mailto-Link."""

    def js_strings(statements: list[str]) -> str:
        parts = [s for stmt in statements for s in _JS_STRING_RE.findall(stmt)]
        return html.unescape("".join(parts).replace("\\'", "'"))

    def repl(m: re.Match) -> str:
        ident, js = m.group("id"), m.group("js")
        address = js_strings(re.findall(rf"\baddy{ident}\s*=\s*" + _JS_RHS, js))
        label = js_strings(re.findall(rf"\baddy_text{ident}\s*=\s*" + _JS_RHS, js))
        if not _EMAIL_RE.match(address):
            warnings.append("E-Mail-Adresse konnte nicht entschlüsselt werden – bitte von Hand ergänzen")
            return "[E-Mail-Adresse ergänzen]"
        return f'<a href="mailto:{html.escape(address)}">{html.escape(text_of(label) or address)}</a>'

    return _CLOAK_RE.sub(repl, page_html)


_IMAGE_PATH_RE = re.compile(r"\.(jpe?g|png|webp)$", re.I)
_LINK_OR_IMG_RE = re.compile(
    r'<a\b[^>]*?\bhref="(?P<href>[^"]+)"[^>]*>(?P<inner>.*?)</a>|<img\b[^>]*?\bsrc="(?P<src>[^"]+)"[^>]*>',
    re.S | re.I,
)


def _importable_image(url: str) -> bool:
    path = urlparse(url).path
    return (
        is_old_site(url)
        and bool(_IMAGE_PATH_RE.search(path))
        and "/yootheme/" not in path
        and "logo" not in path.lower()
    )


def collect_images(fragment: str) -> list[str]:
    """Bild-URLs in Dokument-Reihenfolge. Bei Galerie-Links zählt das große Bild
    (href), das Vorschaubild darin wird ignoriert."""
    found: list[str] = []

    def add(url: str):
        url = absolute(url)
        if _importable_image(url) and url not in found:
            found.append(url)

    for m in _LINK_OR_IMG_RE.finditer(fragment):
        if m.group("src"):
            add(m.group("src"))
        elif _importable_image(absolute(m.group("href"))):
            add(m.group("href"))
        else:
            for inner in re.finditer(r'<img\b[^>]*?\bsrc="([^"]+)"', m.group("inner"), re.I):
                add(inner.group(1))
    return found


# ---------- Säubern ----------

def _replace_img(m: re.Match) -> str:
    # Bilder wandern in Titelbild/Galerie. Emoji-Grafiken (z.B. aus Facebook
    # kopiert) werden durch ihr Zeichen ersetzt, alle anderen durch ein
    # Leerzeichen, damit die Wörter links und rechts nicht zusammenkleben.
    alt = re.search(r'\balt="([^"]*)"', m.group(0))
    text = html.unescape(alt.group(1)).strip() if alt else ""
    is_emoji = 0 < len(text) <= 4 and not any(ch.isalnum() for ch in text)
    return html.escape(text) if is_emoji else " "


def _flatten_table(m: re.Match) -> str:
    # Tabellen kann der Editor nicht -> jede Zeile wird ein Absatz.
    rows = []
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", m.group(0), re.S | re.I):
        cells = [c.strip() for c in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row, re.S | re.I)]
        cells = [c for c in cells if text_of(c)]
        if cells:
            rows.append("<p>" + " – ".join(cells) + "</p>")
    return "".join(rows)


def _iframe_to_link(m: re.Match) -> str:
    # Eingebettete Inhalte (z.B. Google-Karte) blockiert die CSP -> als Link übernehmen.
    src = re.search(r"""\b(?:data-)?src=(["'])(.+?)\1""", m.group(0))
    if not src:
        return ""
    url = absolute(src.group(2))
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    if not url.startswith("https://"):
        return ""
    label = "Karte öffnen" if "map" in url.lower() else "Eingebetteten Inhalt öffnen"
    return f'<p><a href="{html.escape(url)}">{label}</a></p>'


def rewrite_links(fragment: str, link_map: dict[str, str]) -> str:
    """Interne Links auf neue Kürzel, alles andere absolut auf hongar.at."""

    def repl(m: re.Match) -> str:
        href = html.unescape(m.group(1)).strip()
        if href.startswith(("mailto:", "tel:", "#")):
            return m.group(0)
        url = absolute(href)
        if is_old_site(url):
            path = urlparse(url).path.rstrip("/") or "/"
            if path in link_map:
                return f'href="{link_map[path]}"'
        return f'href="{html.escape(url)}"'

    return re.sub(r'href="([^"]*)"', repl, fragment)


BLOCK_TAGS = "p|h2|h3|h4|ul|ol|li|blockquote"


def normalize(fragment: str) -> str:
    fragment = re.sub(r"(<br>\s*){2,}", "<br>", fragment)
    fragment = re.sub(r"<(p|h2|h3|h4|li)\b[^>]*>(\s|&nbsp;|<br>)*</\1>", "", fragment)
    fragment = re.sub(rf"<br>\s*(?=</?(?:{BLOCK_TAGS})\b)", "", fragment)
    fragment = re.sub(rf"(<(?:{BLOCK_TAGS})\b[^>]*>|</(?:{BLOCK_TAGS})>)\s*<br>", r"\1", fragment)
    fragment = re.sub(r"^(\s|<br>)+|(\s|<br>)+$", "", fragment)
    return fragment.strip()


def clean_content(fragment: str, link_map: dict[str, str], flatten_layout: bool = False) -> str:
    fragment = re.sub(r"<ul\b[^>]*uk-thumbnav[^>]*>.*?</ul>", "", fragment, flags=re.S | re.I)
    fragment = re.sub(
        r'<a\b[^>]*href="[^"]+\.(?:jpe?g|png|webp)"[^>]*>.*?</a>', "", fragment, flags=re.S | re.I
    )
    fragment = re.sub(r"<img\b[^>]*>", _replace_img, fragment, flags=re.I)
    fragment = re.sub(r"<table\b.*?</table>", _flatten_table, fragment, flags=re.S | re.I)
    fragment = re.sub(r"<iframe\b[^>]*>.*?</iframe>", _iframe_to_link, fragment, flags=re.S | re.I)
    fragment = re.sub(r"<h1\b[^>]*>(.*?)</h1>", r"<h2>\1</h2>", fragment, flags=re.S | re.I)
    if flatten_layout:
        # Layout-Block (z.B. Kontakt in der Fußzeile): Überschriften fett, Listen als Zeilen
        fragment = re.sub(r"<h[1-6]\b[^>]*>(.*?)</h[1-6]>", r"<p><strong>\1</strong></p>", fragment, flags=re.S | re.I)
        fragment = re.sub(r"</?(?:ul|ol)\b[^>]*>", "", fragment, flags=re.I)
        fragment = re.sub(r"<li\b[^>]*>", "", fragment, flags=re.I)
        fragment = re.sub(r"</li>", "<br>", fragment, flags=re.I)
    # Layout-Container (div) sind im Editor nicht erlaubt -> Zeilenumbrüche
    fragment = re.sub(r"<div\b[^>]*>", "", fragment, flags=re.I)
    fragment = re.sub(r"</div>", "<br>", fragment, flags=re.I)
    fragment = rewrite_links(fragment, link_map)
    return normalize(sanitize_html(fragment))


# ---------- Bilder ----------

MIN_EDGE = 300  # kleiner = Icon/Deko, nicht übernehmen
MAX_EDGE = 2400
MAX_BYTES = 4 * 1024 * 1024


def store_image(data: bytes, upload_dir: str) -> Optional[str]:
    """Bild prüfen, ggf. verkleinern und wie ein normaler Upload speichern."""
    img = Image.open(BytesIO(data))
    img.load()
    if max(img.size) < MIN_EDGE:
        return None
    rotated = img.getexif().get(0x0112, 1) != 1  # EXIF-Orientierung
    if rotated or max(img.size) > MAX_EDGE or len(data) > MAX_BYTES:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((MAX_EDGE, MAX_EDGE))
        buf = BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=85, optimize=True)
        data = buf.getvalue()
    return save_image(SimpleNamespace(file=BytesIO(data)), upload_dir, prefix="hongar_")


# ---------- Ablauf ----------

@dataclass
class PageData:
    spec: PageSpec
    title: str
    content_html: str = ""
    image_urls: list[str] = field(default_factory=list)


@dataclass
class Report:
    pages: list[str] = field(default_factory=list)
    settings: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def default_fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def _fallback_title(slug: str) -> str:
    return slug.replace("-", " ").title()


def _extract_settings(pages_html: dict[str, str], link_map: dict[str, str]) -> dict[str, str]:
    home = pages_html.get("/index.php", "")
    settings: dict[str, str] = {}

    news = []
    for title, body in extract_panels(home):
        cleaned = clean_content(body, link_map)
        if not title or not text_of(cleaned):
            continue
        if "öffnungszeit" in title.lower():
            settings.setdefault("opening_hours", cleaned)
        else:
            news.append(f"<p><strong>{html.escape(title)}</strong></p>{cleaned}")
    if news:
        settings["news"] = "".join(news)

    contact = clean_content(extract_bottom(home), link_map, flatten_layout=True)
    if text_of(contact):
        settings["contact"] = contact

    facebook = re.search(r'href="(https?://(?:www\.)?facebook\.com/[^"]+)"', home)
    if facebook:
        settings["facebook_url"] = html.unescape(facebook.group(1)).replace("http://", "https://", 1)

    booking = re.search(r'href="(https?://[^"]*urlaubambauernhof[^"]*)"', pages_html.get("/index.php/ferienhaus", ""))
    if booking:
        settings["booking_url"] = html.unescape(booking.group(1)).replace("http://", "https://", 1)

    webcams = []
    for src in re.findall(r'<img\b[^>]*?\bsrc="([^"]*webcam\d[^"]*)"', pages_html.get(WEBCAM_PATH, "")):
        url = absolute(src)
        if url not in webcams:
            webcams.append(url)
    if webcams:
        settings["webcam_urls"] = "\n".join(webcams)
    return settings


def run_import(
    db: Session,
    fetch: Callable[[str], bytes] = default_fetch,
    dry_run: bool = False,
    upload_dir: str = UPLOAD_DIR,
    delay: float = 0.3,
) -> Report:
    report = Report()
    link_map = build_link_map()

    # 1. Alle alten Seiten laden
    pages_html: dict[str, str] = {}
    for path in [spec.path for spec in PAGES if spec.with_content] + [WEBCAM_PATH]:
        try:
            pages_html[path] = decloak_emails(fetch(BASE_URL + path).decode("utf-8", "replace"), report.warnings)
        except Exception as exc:
            report.warnings.append(f"{path}: nicht ladbar ({exc})")
        time.sleep(delay)

    # 2. Seiten anlegen
    existing = {p.slug: p for p in db.query(models.HongarPage).all()}
    last = db.query(models.HongarPage).order_by(models.HongarPage.position.desc()).first()
    position = (last.position + 1) if last else 0
    seen_images: set[str] = set()  # Bild-URLs, die schon eine frühere Seite übernommen hat

    for spec in PAGES:
        if spec.slug in existing:
            report.pages.append(f"= {spec.slug:<24} existiert schon – übersprungen")
            continue
        raw = pages_html.get(spec.path)
        if raw is None and spec.with_content:
            continue
        data = PageData(spec, _fallback_title(spec.slug))
        if spec.with_content:
            try:
                title, body = extract_article(raw)
            except ValueError as exc:
                report.warnings.append(f"{spec.path}: {exc}")
                continue
            data.title = title or data.title
            data.content_html = clean_content(body, link_map)
            data.image_urls = collect_images(body)

        parent = existing.get(spec.parent) if spec.parent else None
        if spec.parent and parent is None:
            report.warnings.append(f"{spec.slug}: Elternseite '{spec.parent}' fehlt – als Hauptseite angelegt")

        # Jedes Foto nur bei der ersten Seite, auf der es vorkommt: die alte Seite
        # zeigt dieselbe Galerie auf vielen Unterseiten.
        image_urls = [u for u in data.image_urls if u not in seen_images]
        repeated = len(data.image_urls) - len(image_urls)
        seen_images.update(image_urls)

        report.pages.append(
            f"+ {spec.slug:<24} „{data.title}“"
            + (f" unter {spec.parent}" if parent is not None else "")
            + f" – Text: {len(text_of(data.content_html))} Zeichen, Bilder: {len(image_urls)}"
            + (f" (+{repeated} schon auf anderer Seite)" if repeated else "")
            + ("" if spec.show_in_nav else " (nicht im Menü)")
        )
        if dry_run:
            existing[spec.slug] = SimpleNamespace(id=None)  # für Eltern-Zuordnung im Probelauf
            continue

        stored = []  # (URL, Dateiname)
        for url in image_urls:
            try:
                name = store_image(fetch(url), upload_dir)
            except Exception as exc:
                report.warnings.append(f"{spec.slug}: Bild {url} übersprungen ({exc})")
                continue
            finally:
                time.sleep(delay)
            if name:
                stored.append((url, name))
            else:
                report.warnings.append(f"{spec.slug}: Bild {url} zu klein – übersprungen")
        # Titelbild nur aus Fotos – PNGs sind auf der alten Seite Grafiken/Logos
        cover = next((name for url, name in stored if not url.lower().endswith(".png")), None)
        gallery = [name for _, name in stored if name != cover]

        page = models.HongarPage(
            slug=spec.slug,
            title=data.title[:200],
            parent_id=parent.id if parent is not None else None,
            position=position,
            content_html=data.content_html,
            cover_image=cover,
            is_published=False,
            show_in_nav=spec.show_in_nav,
        )
        position += 1
        for index, name in enumerate(gallery):
            page.images.append(models.HongarPageImage(filename=name, position=index))
        db.add(page)
        db.flush()
        existing[spec.slug] = page

    # 3. Globale Texte (nur wenn noch leer)
    for key, value in _extract_settings(pages_html, link_map).items():
        setting = db.query(models.SiteSetting).filter(models.SiteSetting.key == SETTING_PREFIX + key).first()
        if setting and setting.value.strip():
            report.settings.append(f"= {key:<14} schon befüllt – nicht überschrieben")
            continue
        report.settings.append(f"+ {key:<14} {len(text_of(value))} Zeichen")
        if dry_run:
            continue
        if setting:
            setting.value = value
        else:
            db.add(models.SiteSetting(key=SETTING_PREFIX + key, value=value))

    if dry_run:
        db.rollback()
    else:
        db.commit()
    return report


def main():  # pragma: no cover - Einstiegspunkt für den Container
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="nur anzeigen, nichts speichern")
    args = parser.parse_args()

    from database import engine

    db = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        report = run_import(db, dry_run=args.dry_run)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("PROBELAUF – nichts gespeichert\n" if args.dry_run else "Import abgeschlossen\n")
    print("Seiten (alle als Entwurf):")
    print("\n".join(f"  {line}" for line in report.pages) or "  –")
    print("\nAllgemeine Texte:")
    print("\n".join(f"  {line}" for line in report.settings) or "  –")
    if report.warnings:
        print("\nHinweise:")
        print("\n".join(f"  ! {w}" for w in report.warnings))


if __name__ == "__main__":
    main()
