import hmac
import hashlib
import time
from typing import Union


def verify_webhook_signature(
    signature_header: str | None,
    raw_payload: Union[str, bytes],
    signing_secret: str,
    tolerance_seconds: int = 300,
) -> bool:
    """
    Verifies the X-QuickStart-Signature header against the raw webhook body payload.

    Args:
        signature_header: The header string (e.g. "t=1710000000,v1=abcdef...")
        raw_payload: The raw JSON string or bytes received from the request
        signing_secret: The webhook endpoint's shared signing secret
        tolerance_seconds: Maximum clock drift in seconds (default 300 / 5 minutes)

    Returns:
        bool: True if signature is valid and within tolerance, False otherwise
    """
    if not signature_header or not signing_secret:
        return False

    payload_str = (
        raw_payload.decode("utf-8") if isinstance(raw_payload, bytes) else raw_payload
    )

    parts = signature_header.split(",")
    timestamp_str = ""
    signature_hex = ""

    for part in parts:
        if "=" in part:
            k, v = part.split("=", 1)
            if k.strip() == "t":
                timestamp_str = v.strip()
            elif k.strip() == "v1":
                signature_hex = v.strip()

    if not timestamp_str or not signature_hex:
        return False

    try:
        timestamp = int(timestamp_str)
    except ValueError:
        return False

    # Prevent replay attacks
    if tolerance_seconds > 0:
        now = int(time.time())
        if abs(now - timestamp) > tolerance_seconds:
            return False

    signed_payload = f"{timestamp}.{payload_str}".encode("utf-8")
    expected = hmac.new(
        signing_secret.encode("utf-8"), signed_payload, hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature_hex)
