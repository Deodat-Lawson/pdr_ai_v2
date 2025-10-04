def chunk(text: str, max_chars=5000, overlap=300):
    out, i, n = [], 0, len(text)
    while i < n:
        out.append({"heading": None, "text": text[i:i+max_chars]})
        i += max(1, max_chars - overlap)
    return out

