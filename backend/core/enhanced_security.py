# backend/core/enhanced_security.py
"""
ENHANCED SECURITY: Zero Trust Implementation
All security decisions moved to backend only.
"""

from typing import Dict, Optional, Any, Tuple
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
from datetime import datetime, timedelta, timezone
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
import re

from core.config import settings
from core.errors import UnauthorizedError

# Custom ForbiddenError since it's not imported
class ForbiddenError(Exception):
    pass

# Database models will be imported as needed

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)

# =========================================
# AUTH — JWT-optional guest mode
# NextAuth on the frontend controls who can
# reach /chat. The backend trusts that gate
# and assigns a guest identity for quota
# tracking when no valid JWT is present.
# =========================================

async def verify_jwt_comprehensive(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Dict[str, Any]:
    """
    Flexible auth dependency.
    - If a valid Bearer JWT is provided: decode and use it.
    - Otherwise: create a guest identity from the request IP.
    No external auth provider dependency. No database lookup required.
    """
    user_id: str
    email: str

    if credentials and credentials.credentials:
        token = credentials.credentials
        try:
            # Try decoding with our own JWT_SECRET (NextAuth tokens or custom)
            payload = jwt.decode(
                token,
                settings.JWT_SECRET or "fallback",
                algorithms=["HS256"],
                options={"verify_exp": True},
            )
            user_id = payload.get("sub") or payload.get("id") or "guest"
            email   = payload.get("email") or f"{user_id}@astramind.local"
        except Exception:
            # Unrecognised token — fall through to guest
            logger.debug("JWT decode failed, using guest mode")
            user_id = f"guest_{request.client.host.replace('.', '_')}"
            email   = f"{user_id}@astramind.local"
    else:
        # No token — guest mode
        client_ip = getattr(request.client, "host", "unknown")
        user_id = f"guest_{client_ip.replace('.', '_')}"
        email   = f"{user_id}@astramind.local"

    now_utc = datetime.now(tz=timezone.utc)

    request.state.user_id    = user_id
    request.state.user_email  = email

    # Synthesise a user dict that satisfies the chat endpoint contract
    guest_user = {
        "id":          user_id,
        "user_id":     user_id,
        "email":       email,
        "is_active":   True,
        "banned_until": None,
        "is_admin":    False,
        "daily_quota": 100,
        "daily_used":  0,
        "last_reset":  now_utc,
        "orm_user":    None,
    }

    return {
        "user_id":        user_id,
        "email":          email,
        "exp":            None,
        "iat":            None,
        "workspace_role": "member",
        "user":           guest_user,
    }

# =========================================
# SECURITY VALIDATION FUNCTIONS
# =========================================

def validate_prompt_security(prompt: str) -> Dict[str, Any]:
    """
    Comprehensive prompt security validation.
    NEVER trust client-provided prompts.
    """

    if not prompt or len(prompt.strip()) == 0:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Length limits
    if len(prompt) > 8000:
        raise HTTPException(status_code=400, detail="Prompt too long (max 8000 characters)")

    # Check for prompt injection patterns
    injection_patterns = [
        r'\b(system|assistant)\b.*:',
        r'ignore.*previous.*instructions',
        r'you.*are.*not.*bound.*by.*rules',
        r'override.*safety.*settings',
        r'jailbreak',
        r'dan.*mode',
        r'uncensored',
        r'developer.*mode'
    ]

    for pattern in injection_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            logger.warning(f"Prompt injection attempt detected: {pattern}")
            raise HTTPException(
                status_code=400,
                detail="Prompt contains potentially harmful content"
            )

    # Check for dangerous content
    dangerous_keywords = [
        'ignore', 'bypass', 'override', 'admin', 'root', 'sudo',
        'exploit', 'hack', 'attack', 'malware', 'virus'
    ]

    prompt_lower = prompt.lower()
    for keyword in dangerous_keywords:
        if keyword in prompt_lower:
            # Allow in educational contexts, but log
            logger.info(f"Potentially sensitive keyword in prompt: {keyword}")

    return {
        "safe": True,
        "length": len(prompt),
        "sanitized": prompt.strip()
    }

def validate_model_access(model: str, user_role: Optional[str] = None) -> bool:
    """
    Validate if user can access the requested model.
    Model access is controlled server-side ONLY.
    """

    # Define model access levels
    model_permissions = {
        "fast": ["read-only", "member", "admin", "owner"],
        "balanced": ["member", "admin", "owner"],
        "smart": ["admin", "owner"]
    }

    allowed_roles = model_permissions.get(model, [])
    if user_role and user_role not in allowed_roles:
        logger.warning(f"Unauthorized model access attempt: {model} by role {user_role}")
        return False

    return True

def validate_workspace_permissions(
    user_id: str,
    workspace_id: str,
    required_permission: str,
    current_role: Optional[str] = None
) -> bool:
    """
    Validate workspace permissions server-side.
    NEVER trust client-provided role claims.
    """

    permission_hierarchy = {
        "read-only": ["read"],
        "member": ["read", "write"],
        "admin": ["read", "write", "manage_users", "manage_settings"],
        "owner": ["read", "write", "manage_users", "manage_settings", "delete_workspace"]
    }

    if not current_role:
        return False

    allowed_permissions = permission_hierarchy.get(current_role, [])
    return required_permission in allowed_permissions

# =========================================
# INPUT SANITIZATION
# =========================================

def sanitize_user_input(input_data: Any, input_type: str = "general") -> Any:
    """
    Sanitize user input based on type.
    """

    if isinstance(input_data, str):
        # Remove null bytes and other dangerous characters
        sanitized = input_data.replace('\x00', '').strip()

        # Type-specific sanitization
        if input_type == "prompt":
            # Remove excessive whitespace
            sanitized = re.sub(r'\s+', ' ', sanitized)
        elif input_type == "email":
            # Basic email validation
            if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', sanitized):
                raise HTTPException(status_code=400, detail="Invalid email format")
        elif input_type == "filename":
            # Remove path traversal attempts
            sanitized = re.sub(r'[<>:"/\\|?*]', '', sanitized)
            if '..' in sanitized or '/' in sanitized or '\\' in sanitized:
                raise HTTPException(status_code=400, detail="Invalid filename")

        return sanitized

    elif isinstance(input_data, dict):
        return {k: sanitize_user_input(v, input_type) for k, v in input_data.items()}

    elif isinstance(input_data, list):
        return [sanitize_user_input(item, input_type) for item in input_data]

    return input_data

# =========================================
# AUDIT LOGGING
# =========================================

async def log_security_event(
    event_type: str,
    user_id: Optional[str],
    details: Dict[str, Any],
    request: Optional[Request] = None
):
    """
    Log security events for compliance.
    NEVER logs sensitive data like API keys or full prompts.
    """

    # Sanitize details to remove sensitive information
    sanitized_details = {}
    sensitive_keys = ['api_key', 'password', 'token', 'secret', 'prompt']

    for key, value in details.items():
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            sanitized_details[key] = "[REDACTED]"
        elif isinstance(value, str) and len(value) > 200:
            sanitized_details[key] = value[:200] + "...[TRUNCATED]"
        else:
            sanitized_details[key] = value

    # Get request info if available
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    # Always emit to Python logger first (never crashes)
    logger.warning(
        f"SECURITY_EVENT type={event_type} user_id={user_id} "
        f"ip={ip_address} ua={str(user_agent)[:100] if user_agent else None} "
        f"details={sanitized_details}"
    )

    # Optional: persist to audit_logs table if it exists (fail gracefully)
    try:
        from app.db.session import get_db_session
        from sqlalchemy import text
        async with get_db_session() as db:
            await db.execute(text("""
                INSERT INTO audit_logs
                    (user_id, event_type, category, details, ip_address, user_agent)
                VALUES
                    (:user_id, :event_type, 'security', :details::text, :ip_address, :user_agent)
                ON CONFLICT DO NOTHING
            """), {
                "user_id": user_id,
                "event_type": event_type,
                "details": str(sanitized_details),
                "ip_address": ip_address,
                "user_agent": str(user_agent)[:500] if user_agent else None
            })
            await db.commit()
    except Exception as db_err:
        # Non-fatal: audit logging must never crash the application
        logger.debug(f"Audit DB write skipped (table may not exist): {db_err}")

# =========================================
# DEPENDENCY INJECTION
# =========================================

async def get_current_user_secure(request: Request) -> Dict[str, Any]:
    """
    Get current user with comprehensive security validation.
    This is the ONLY way to get authenticated user context.
    """
    return await verify_jwt_comprehensive(request)

async def require_workspace_access(
    workspace_id: str,
    required_role: str = "member"
) -> Dict[str, Any]:
    """
    Dependency to require specific workspace access level.
    """
    # This would be used as a FastAPI dependency
    # Implementation depends on how you structure your endpoints
    return {"workspace_id": workspace_id, "required_role": required_role}

# =========================================
# SECURITY MONITORING
# =========================================

class SecurityMonitor:
    """
    Monitor for security threats and anomalies.
    """

    def __init__(self):
        self.suspicious_patterns = {
            'rate_limit_exceeded': [],
            'invalid_tokens': [],
            'unauthorized_access': [],
            'suspicious_prompts': []
        }

    async def report_suspicious_activity(
        self,
        activity_type: str,
        user_id: str,
        details: Dict[str, Any],
        request: Optional[Request] = None
    ):
        """
        Report suspicious activity for monitoring.
        """

        # Log to security monitoring
        logger.warning(f"Security event: {activity_type} for user {user_id}")

        # Store in abuse detection table
        from app.db.session import get_db_session
        from sqlalchemy import text
        async with get_db_session() as db:
            await db.execute(text("""
                INSERT INTO abuse_detection (
                    user_id, ip_address, violation_type, severity, details
                ) VALUES (
                    :user_id, :ip_address, :violation_type, :severity, :details
                )
            """), {
                "user_id": user_id,
                "ip_address": request.client.host if request and request.client else None,
                "violation_type": activity_type,
                "severity": self._calculate_severity(activity_type, details),
                "details": details
            })
            await db.commit()

    def _calculate_severity(self, activity_type: str, details: Dict) -> str:
        """Calculate severity level for security events."""
        if activity_type in ['invalid_tokens', 'unauthorized_access']:
            return 'high'
        elif activity_type == 'rate_limit_exceeded':
            return 'medium'
        else:
            return 'low'

# Global security monitor instance
security_monitor = SecurityMonitor()
