import re


def validate_password_strength(password: str):
    """
    Enforces:
    - at least 8 characters
    - uppercase
    - lowercase
    - digit
    - special character
    """
    errors = []
    if not password or len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password or ""):
        errors.append("Password must include an uppercase letter.")
    if not re.search(r"[a-z]", password or ""):
        errors.append("Password must include a lowercase letter.")
    if not re.search(r"[0-9]", password or ""):
        errors.append("Password must include a number.")
    if not re.search(r"[^A-Za-z0-9]", password or ""):
        errors.append("Password must include a special character.")
    if errors:
        raise ValueError(" ".join(errors))
