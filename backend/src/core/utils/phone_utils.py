def digits_only(phone: str) -> str:
    return "".join(filter(str.isdigit, phone))


def format_phone(phone: str | None) -> str:
    """Format 10-digit numbers as (XXX) XXX-XXXX; pass through anything else unchanged."""
    if not phone:
        return ""
    digits = "".join(filter(str.isdigit, phone))
    if digits and len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return phone
