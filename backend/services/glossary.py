def apply_pre_glossary(text: str, glossary: list[dict] | None = None) -> str:
    if not text or not glossary:
        return text

    active = [g for g in glossary if g.get("enabled", True) and g.get("source_term") and g.get("target_term")]
    if not active:
        return text

    active.sort(key=lambda g: len(g["source_term"]), reverse=True)

    result = text
    for item in active:
        result = result.replace(item["source_term"], item["target_term"])

    return result
