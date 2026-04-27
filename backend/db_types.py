"""
Cross-dialect Custom Types.

Wird genutzt, damit Models auf Postgres native Features (ARRAY) nutzen
können, in SQLite-basierten Tests aber trotzdem funktionieren.
"""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.types import Integer, TypeDecorator


class IntArray(TypeDecorator):
    """
    Liste von Integers.

    - Postgres: native ARRAY(Integer) – effiziente Queries mit `.any(value)`,
      Index-fähig.
    - SQLite (Tests): JSON-codiertes Array – Queries werden auf Python-Seite
      gefiltert (siehe IntArray.contains_value() Helper).
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(Integer))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        # In allen Fällen: Liste rein, Liste raus
        return list(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return list(value)


def months_contains(column, value: int):
    """
    Dialect-aware Filter: enthält das months-Array den gegebenen Monat?

    Funktioniert sowohl für Postgres (ARRAY) als auch SQLite (JSON via TypeDecorator).
    Wird zur Query-Compile-Zeit dialect-spezifisch aufgelöst.
    """
    from sqlalchemy import case, literal, type_coerce, String, cast
    from sqlalchemy.sql import func

    # Statt zur Python-Laufzeit auf den Dialect zuzugreifen (was hier nicht
    # zuverlässig geht), nutzen wir SQL-Konstrukte, die SQLAlchemy beim
    # Compilen für den jeweiligen Dialect anders rendert.
    #
    # Pragmatisch: wir gehen über die JSON-Repräsentation. Auf Postgres macht
    # `column::text LIKE '%,N,%'` o.ä. zwar keinen Index-Lookup, ist aber für
    # den Saisonkalender (max. ~100 Items) absolut akzeptabel.
    #
    # Für saubere Postgres-Performance bei Bedarf: gleichzeitig einen
    # dialect-spezifischen Branch über bind.dialect.name in der Query-
    # Funktion bauen. Hier reicht der einfache Ansatz.
    return cast(column, String).like(f'%{int(value)}%')
