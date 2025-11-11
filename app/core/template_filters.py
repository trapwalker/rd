"""Custom Jinja2 filters for template rendering with XSS protection."""

import html
import re
from datetime import datetime
from typing import Any


def escape_html(text: str | None) -> str:
    """
    Escape HTML entities to prevent XSS.

    Args:
        text: Text to escape

    Returns:
        HTML-escaped text
    """
    if text is None:
        return ""
    return html.escape(str(text))


def escape_js(text: str | None) -> str:
    """
    Escape text for safe use in JavaScript strings.

    Args:
        text: Text to escape

    Returns:
        JavaScript-escaped text
    """
    if text is None:
        return ""

    text = str(text)

    # Escape special JavaScript characters
    replacements = {
        '\\': '\\\\',
        '"': '\\"',
        "'": "\\'",
        '\n': '\\n',
        '\r': '\\r',
        '\t': '\\t',
        '<': '\\x3C',  # Prevent </script> injection
        '>': '\\x3E',
        '&': '\\x26',
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text


def escape_url(url: str | None) -> str:
    """
    Validate and escape URL to prevent JavaScript injection.

    Args:
        url: URL to validate

    Returns:
        Safe URL or empty string if invalid
    """
    if url is None:
        return ""

    url = str(url).strip()

    # Block dangerous protocols
    dangerous_protocols = ['javascript:', 'data:', 'vbscript:', 'file:']
    url_lower = url.lower()

    for protocol in dangerous_protocols:
        if url_lower.startswith(protocol):
            return ""  # Return empty string for dangerous URLs

    # Only allow http, https, mailto, and relative URLs
    if not (url.startswith(('http://', 'https://', 'mailto:', '/', '#'))):
        return ""

    return html.escape(url)


def safe_json(data: Any) -> str:
    """
    Safely convert data to JSON for embedding in HTML.

    Args:
        data: Data to convert to JSON

    Returns:
        Safe JSON string
    """
    import json

    json_str = json.dumps(data)

    # Escape </script> to prevent breaking out of script tags
    json_str = json_str.replace('</', '<\\/')

    return json_str


def truncate_safe(text: str | None, length: int = 100, suffix: str = "...") -> str:
    """
    Truncate text safely without breaking HTML entities.

    Args:
        text: Text to truncate
        length: Maximum length
        suffix: Suffix to add when truncated

    Returns:
        Truncated text
    """
    if text is None:
        return ""

    text = str(text)

    if len(text) <= length:
        return text

    return text[:length - len(suffix)] + suffix


def format_datetime(dt: datetime | None, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format datetime safely.

    Args:
        dt: Datetime to format
        format_str: Format string

    Returns:
        Formatted datetime string
    """
    if dt is None:
        return ""

    try:
        return dt.strftime(format_str)
    except Exception:
        return ""


def sanitize_username(username: str | None) -> str:
    """
    Sanitize username for display (remove non-alphanumeric except _ and -).

    Args:
        username: Username to sanitize

    Returns:
        Sanitized username
    """
    if username is None:
        return ""

    username = str(username)

    # Only allow alphanumeric, underscore, and dash
    return re.sub(r'[^a-zA-Z0-9_-]', '', username)


def format_number(value: int | float | None, decimals: int = 0) -> str:
    """
    Format number with thousands separator.

    Args:
        value: Number to format
        decimals: Number of decimal places

    Returns:
        Formatted number string
    """
    if value is None:
        return "0"

    try:
        value = float(value)
        if decimals > 0:
            return f"{value:,.{decimals}f}"
        else:
            return f"{int(value):,}"
    except (ValueError, TypeError):
        return "0"


# Dictionary of all filters to register
TEMPLATE_FILTERS = {
    'escape_html': escape_html,
    'escape_js': escape_js,
    'escape_url': escape_url,
    'safe_json': safe_json,
    'truncate_safe': truncate_safe,
    'format_datetime': format_datetime,
    'sanitize_username': sanitize_username,
    'format_number': format_number,
}
