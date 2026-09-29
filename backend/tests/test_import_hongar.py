"""Tests für scripts/import_hongar.py – mit synthetischem HTML im Aufbau der alten Seite."""

import sys
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import import_hongar as imp  # noqa: E402
import models  # noqa: E402

BASE = imp.BASE_URL


def _page(title: str, body: str, sidebar: str = "", bottom: str = "") -> str:
    return f"""<html><head><title>Alte Seite</title></head><body>
    <nav class="tm-navbar"><a href="/index.php">Start</a></nav>
    <main class="tm-content"><article class="uk-article">
      <h1 class="uk-article-title">{title}</h1>
      <div class="tm-article-content">{body}</div>
    </article></main>
    <aside class="tm-sidebar-a uk-width-medium-3-10">{sidebar}</aside>
    <div class="tm-bottom tm-block">{bottom}</div>
    <footer><a href="https://www.facebook.com/beispielalm">Facebook</a></footer>
    </body></html>"""


CLOAK = """<span id="cloakabc123">Diese E-Mail-Adresse ist vor Spambots geschützt!</span><script type='text/javascript'>
 //<!--
 document.getElementById('cloakabc123').innerHTML = '';
 var prefix = '&#109;a' + 'i&#108;' + '&#116;o';
 var path = 'hr' + 'ef' + '=';
 var addyabc123 = 'gast' + '&#64;';
 addyabc123 = addyabc123 + 'beispiel' + '&#46;' + 'at';
 var addy_textabc123 = 'gast' + '&#64;' + 'beispiel' + '&#46;' + 'at';document.getElementById('cloakabc123').innerHTML += '<a ' + path + '\\'' + prefix + ':' + addyabc123 + '\\'>'+addy_textabc123+'<\\/a>';
 //-->
 </script>"""


def _jpeg(width: int = 800, height: int = 600) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (width, height), "green").save(buf, format="JPEG")
    return buf.getvalue()


def _png() -> bytes:
    buf = BytesIO()
    Image.new("RGBA", (800, 400), (200, 0, 0, 128)).save(buf, format="PNG")
    return buf.getvalue()


# ---------- HTML-Hilfen ----------

class TestExtraction:
    def test_article_title_and_body(self):
        html = _page("Unsere Hütte", "<p>Erster Absatz<p>Zweiter <strong>fett</strong></p><div>Zeile</div>",
                     sidebar='<div class="uk-panel"><h3 class="uk-panel-title">Seitenleiste</h3></div>')
        title, body = imp.extract_article(html)
        assert title == "Unsere Hütte"
        assert "Zweiter <strong>fett</strong>" in body
        assert "Zeile" in body
        assert "Seitenleiste" not in body

    def test_missing_article(self):
        with pytest.raises(ValueError):
            imp.extract_article("<html><body><p>nichts</p></body></html>")

    def test_panels(self):
        sidebar = (
            '<div class="uk-panel uk-panel-box"><h3 class="uk-panel-title">Öffnungszeiten</h3><p>Mo–So</p></div>'
            '<div class="uk-panel"><p><a href="/index.php/webcam"><img src="/images/cam.jpg"></a></p></div>'
        )
        panels = imp.extract_panels(_page("T", "", sidebar=sidebar))
        assert panels[0][0] == "Öffnungszeiten"
        assert "Mo–So" in panels[0][1] and "uk-panel-title" not in panels[0][1]
        assert panels[1][0] == ""

    def test_decloak_email(self):
        warnings = []
        html = imp.decloak_emails(f"<p>Mail: {CLOAK}</p>", warnings)
        assert '<a href="mailto:gast@beispiel.at">gast@beispiel.at</a>' in html
        assert "Spambots" not in html
        assert warnings == []

    def test_decloak_broken_email(self):
        warnings = []
        broken = '<span id="cloakx1">geschützt</span><script>var addyx1 = \'kaputt\';</script>'
        assert "[E-Mail-Adresse ergänzen]" in imp.decloak_emails(broken, warnings)
        assert len(warnings) == 1

    def test_collect_images(self):
        body = (
            '<ul class="uk-thumbnav"><li><a href="/images/galerie/a.jpg"><img src="/images/galerie/thumbs/a.jpg"></a></li>'
            '<li><a href="/images/galerie/b.JPG"><img src="/images/galerie/thumbs/b.jpg"></a></li></ul>'
            '<p><img src="/images/haus.jpg"> <img src="https://static.xx.fbcdn.net/emoji.png" alt="🎉">'
            '<img src="/images/logo.svg"><img src="/images/yootheme/demo/deko.jpg"></p>'
            '<p><a href="https://example.com/buchen"><img src="/images/verlinkt.png"></a></p>'
            '<p><a href="/images/galerie/a.jpg">nochmal a</a></p>'
        )
        assert imp.collect_images(body) == [
            f"{BASE}/images/galerie/a.jpg",
            f"{BASE}/images/galerie/b.JPG",
            f"{BASE}/images/haus.jpg",
            f"{BASE}/images/verlinkt.png",
        ]


class TestCleanContent:
    def setup_method(self):
        self.links = imp.build_link_map()

    def test_cleans_old_markup(self):
        body = (
            '<p style="color: red">Hallo <img src="https://static.xx.fbcdn.net/e.png" alt="🎉"></p>'
            '<ul class="uk-thumbnav"><li><a href="/images/galerie/a.jpg"><img src="/images/galerie/t.jpg"></a></li></ul>'
            '<h2></h2><p>&nbsp;</p><div>Zeile 1</div><div>Zeile 2</div>'
            '<p><a href="/index.php/aktivitaeten/wandern">Wandern</a> '
            '<a href="https://www.hongar.at/index.php">Start</a> '
            '<a href="/images/plan.pdf">Plan</a> <a href="https://example.com">Extern</a></p>'
            '<script>alert(1)</script>'
            '<table><tr><td>Mo</td><td>10 Uhr</td></tr><tr><td></td><td>&nbsp;</td></tr></table>'
            '<iframe src="https://www.google.com/maps/embed?pb=123"></iframe>'
        )
        html = imp.clean_content(body, self.links)
        assert "<p>Hallo 🎉</p>" in html
        assert "<img" not in html and "thumbnav" not in html
        assert "<h2>" not in html and "&nbsp;" not in html
        assert "Zeile 1<br>Zeile 2" in html
        assert 'href="/wandern"' in html
        assert 'href="/"' in html
        assert f'href="{BASE}/images/plan.pdf"' in html
        assert 'href="https://example.com"' in html
        assert "alert" not in html
        assert "<p>Mo – 10 Uhr</p>" in html
        assert '<a href="https://www.google.com/maps/embed?pb=123"' in html and "Karte öffnen" in html
        assert "color" not in html

    def test_flatten_layout(self):
        bottom = ('<ul class="uk-grid"><li><div class="uk-panel"><h2 class="uk-panel-title">Telefon</h2>'
                  '<p>01234 5678</p></div></li></ul>')
        html = imp.clean_content(bottom, self.links, flatten_layout=True)
        assert "<strong>Telefon</strong>" in html
        assert "01234 5678" in html
        assert "<ul" not in html and "<li" not in html

    def test_decorative_image_keeps_word_gap(self):
        html = imp.clean_content('<p>Guten<img src="/images/deko.svg" alt="Deko">Appetit</p>', self.links)
        assert html == "<p>Guten Appetit</p>"

    def test_http_iframe_becomes_https_link(self):
        html = imp.clean_content('<iframe src="http://maps.example.com/embed?x=1"></iframe>', self.links)
        assert '<a href="https://maps.example.com/embed?x=1"' in html
        assert "Karte öffnen" in html

    def test_single_quoted_iframe_src(self):
        html = imp.clean_content("<iframe class=\"x\" src='https://maps.example.com/embed'></iframe>", self.links)
        assert '<a href="https://maps.example.com/embed"' in html


# ---------- Gesamtablauf ----------

@pytest.fixture
def old_site():
    home_body = (
        '<p>Willkommen auf der Alm.</p>'
        '<ul class="uk-thumbnav"><li><a href="/images/galerie/a.jpg"><img src="/images/galerie/t-a.jpg"></a></li>'
        '<li><a href="/images/galerie/b.jpg"><img src="/images/galerie/t-b.jpg"></a></li></ul>'
        '<p>Unsere <a href="/index.php/almgasthof/lieferanten">Lieferanten</a>.</p>'
    )
    sidebar = (
        '<div class="uk-panel uk-panel-box"><h3 class="uk-panel-title">Öffnungszeiten</h3>'
        '<div><span>Mi–So 10–20 Uhr</span></div><div><span>Mo+Di Ruhetag</span></div></div>'
        '<div class="uk-panel"><p><a href="/index.php/webcam"><img src="/images/cam.jpg"></a></p></div>'
        '<div class="uk-panel uk-panel-box"><h3 class="uk-panel-title">Info</h3><p>Betriebsurlaub im März.</p></div>'
    )
    bottom = '<ul><li><h2 class="uk-panel-title">Telefon</h2><p>01234 5678</p></li></ul>'
    pages = {spec.path: _page(spec.slug.title(), "<p>Text der Seite.</p>") for spec in imp.PAGES}
    pages["/index.php"] = _page("Willkommen am Berg", home_body, sidebar=sidebar, bottom=bottom)
    pages["/index.php/ferienhaus"] = _page(
        "Ferienhaus",
        '<p><a href="http://www.urlaubambauernhof.at/beispiel">Buchen</a> <img src="/images/haus.jpg"></p>',
    )
    pages["/index.php/kontakt"] = _page("Kontakt", f"<p>{CLOAK}</p>")
    pages["/index.php/aktivitaeten/rodeln"] = _page("Rodeln", '<p><img src="/images/mini.jpg"></p>')
    # wiederholt ein Foto der Startseite + ein eigenes
    pages["/index.php/veranstaltungen/volksmusikantentreffen"] = _page(
        "Treffen",
        '<ul class="uk-thumbnav"><li><a href="/images/galerie/a.jpg"></a></li>'
        '<li><a href="/images/galerie/c.jpg"></a></li></ul>',
    )
    pages["/index.php/aktivitaeten/spielplatz"] = _page("Spielplatz", '<p><img src="/images/grafik.png"></p>')
    pages[imp.WEBCAM_PATH] = _page("Webcam", '<img src="/webcam1/crop_proxy.php"><a href="/webcam1/current.jpg">groß</a>')
    del pages["/index.php/veranstaltungen/bergmesse"]  # simuliert 404

    site = {BASE + path: html.encode() for path, html in pages.items()}
    for name in ("galerie/a.jpg", "galerie/b.jpg", "galerie/c.jpg", "haus.jpg"):
        site[f"{BASE}/images/{name}"] = _jpeg()
    site[f"{BASE}/images/mini.jpg"] = _jpeg(40, 40)
    site[f"{BASE}/images/grafik.png"] = _png()
    return site


def _fetcher(site):
    def fetch(url):
        if url not in site:
            raise OSError("HTTP 404")
        return site[url]
    return fetch


def _settings(db_session):
    rows = db_session.query(models.SiteSetting).filter(models.SiteSetting.key.like("hongar_%")).all()
    return {r.key[len("hongar_"):]: r.value for r in rows}


class TestRunImport:
    def test_dry_run_writes_nothing(self, db_session, old_site, tmp_path):
        report = imp.run_import(db_session, _fetcher(old_site), dry_run=True, upload_dir=str(tmp_path), delay=0)
        assert db_session.query(models.HongarPage).count() == 0
        assert _settings(db_session) == {}
        assert list(tmp_path.iterdir()) == []
        assert len([line for line in report.pages if line.startswith("+")]) == len(imp.PAGES) - 1
        assert any("geschichte" in line and "unter almgasthof" in line for line in report.pages)
        assert any("volksmusikantentreffen" in line and "+1 schon auf anderer Seite" in line for line in report.pages)
        assert any("bergmesse" in w for w in report.warnings)

    def test_import(self, db_session, old_site, tmp_path):
        report = imp.run_import(db_session, _fetcher(old_site), upload_dir=str(tmp_path), delay=0)
        pages = {p.slug: p for p in db_session.query(models.HongarPage).all()}

        assert set(pages) == {spec.slug for spec in imp.PAGES} - {"bergmesse"}
        assert all(not p.is_published for p in pages.values())

        start = pages["start"]
        assert start.title == "Willkommen am Berg"
        assert start.cover_image and start.cover_image.startswith("hongar_")
        assert len(start.images) == 1
        assert 'href="/lieferanten"' in start.content_html
        assert "thumbnav" not in start.content_html

        assert pages["almgasthof"].title == "Almgasthof" and pages["almgasthof"].content_html == ""
        assert pages["geschichte"].parent_id == pages["almgasthof"].id
        assert pages["impressum"].show_in_nav is False and pages["impressum"].parent_id is None
        assert "mailto:gast@beispiel.at" in pages["kontakt"].content_html
        assert pages["ferienhaus"].cover_image is not None
        assert pages["rodeln"].cover_image is None
        assert any("zu klein" in w for w in report.warnings)
        treffen = pages["volksmusikantentreffen"]
        assert treffen.cover_image not in (None, start.cover_image)  # nur das eigene Foto c
        assert treffen.images == []  # a steht schon auf der Startseite
        spielplatz = pages["spielplatz"]
        assert spielplatz.cover_image is None  # PNG-Grafik wird kein Titelbild …
        assert len(spielplatz.images) == 1  # … sondern Galeriebild
        assert len(list(tmp_path.iterdir())) == 5  # a, b, c, haus, grafik – mini ist zu klein

        settings = _settings(db_session)
        assert "Mi–So 10–20 Uhr<br>Mo+Di Ruhetag" in settings["opening_hours"]
        assert "<strong>Info</strong>" in settings["news"] and "Betriebsurlaub" in settings["news"]
        assert "<strong>Telefon</strong>" in settings["contact"]
        assert settings["facebook_url"] == "https://www.facebook.com/beispielalm"
        assert settings["booking_url"] == "https://www.urlaubambauernhof.at/beispiel"
        assert settings["webcam_urls"] == f"{BASE}/webcam1/crop_proxy.php"

    def test_rerun_keeps_edits(self, db_session, old_site, tmp_path):
        db_session.add(models.HongarPage(slug="kontakt", title="Eigene Kontaktseite", position=0))
        db_session.add(models.SiteSetting(key="hongar_news", value="<p>Eigener Text</p>"))
        db_session.commit()

        imp.run_import(db_session, _fetcher(old_site), upload_dir=str(tmp_path), delay=0)
        count = db_session.query(models.HongarPage).count()
        report = imp.run_import(db_session, _fetcher(old_site), upload_dir=str(tmp_path), delay=0)

        assert db_session.query(models.HongarPage).count() == count
        assert all(line.startswith("=") for line in report.pages)
        kontakt = db_session.query(models.HongarPage).filter_by(slug="kontakt").one()
        assert kontakt.title == "Eigene Kontaktseite"
        assert _settings(db_session)["news"] == "<p>Eigener Text</p>"
        assert any(line.startswith("= news") for line in report.settings)
