def digits_only(phone: str) -> str:
    return "".join(filter(str.isdigit, phone))
