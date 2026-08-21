import bleach

ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a"]
ALLOWED_ATTRIBUTES = {"a": ["href", "target", "rel"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_rich_text(value: str | None) -> str | None:
    """Neteja l'HTML de la descripció d'un slot abans de desar-lo (editor richtext del frontend)."""
    if not value:
        return None

    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )

    if not bleach.clean(cleaned, tags=[], strip=True).strip():
        return None

    return cleaned
