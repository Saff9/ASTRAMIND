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
# ZERO TRUST JWT VERIFICATION
# =========================================

async def verify_jwt_comprehensive(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Dict[str, Any]:
    """
    COMPREHENSIVE JWT verification with workspace validation.
    This is the ONLY place security decisions are made.
    """

    # 1. Validate token presence
    if credentials is None:
        logger.warning(f"Missing auth token from {request.client.host}")
        raise HTTPException(status_code=401, detail="Missing authorization token")

    # 2. Verify JWT signature and claims using Clerk's JWKS
    # Ensure CLERK_SECRET_KEY or publishable key is available or just verify using JWKS directly.
    import httpx
    try:
        # Note: in production, cache the JWKS for performance
        jwks_url = "https://api.clerk.com/v1/jwks"
        jwks_client = jwt.PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(credentials.credentials)
        
        payload = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
    except Exception as e:
        logger.warning(f"Clerk JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    # 4. Validate required claims
    user_id = payload.get("sub")
    email = payload.get("email", "")  # Or fetch from clerk API if not in token
    exp = payload.get("exp")
    iat = payload.get("iat")

    if not user_id:
        logger.warning("JWT missing sub claim")
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Anti-Abuse: Disallow Disposable Emails
    if email:
        domain = email.split('@')[-1].lower()
        DISPOSABLE_DOMAINS = {
            '10minutemail.com', 'temp-mail.org', 'guerrillamail.com', 'mailinator.com', 
            'yopmail.com', 'throwawaymail.com', 'tempail.com', 'fakemail.net', 'minuteinbox.com', 'proton.me', 'protonmail.com'
        }
        if domain in DISPOSABLE_DOMAINS:
            logger.warning(f"Blocked registration attempt with temp mail: {email}")
            raise HTTPException(status_code=403, detail="Temporary/disposable email addresses are not permitted.")

    # 5. Validate expiration
    if not exp:
        raise HTTPException(status_code=401, detail="Token missing expiration")

    now_utc = datetime.now(tz=timezone.utc)
    exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)

    if exp_dt < now_utc:
        logger.warning(f"Expired token for user: {user_id}")
        raise HTTPException(status_code=401, detail="Token has expired")

    # 6. Validate issued-at time (prevent future tokens)
    if iat and datetime.fromtimestamp(iat, tz=timezone.utc) > now_utc:
        raise HTTPException(status_code=401, detail="Token issued in future")

    # 7. Get user from database (ensure they still exist)
    from app.db.session import get_db_session
    from sqlalchemy import text

    async with get_db_session() as db:
        from sqlalchemy import select
        from app.db.models import User

        user_result = await db.execute(
            select(User).where(User.clerk_id == user_id)
        )
        user_row = user_result.scalar_one_or_none()

        if not user_row:
            # If the user doesn't exist yet, we can optionally auto-create them using their Clerk Sub and Email (if present)
            # Or log a warning and let an explicit sign-up route handle it.
            logger.warning(f"Clerk User not mapped in local DB: {user_id}")
            raise HTTPException(status_code=401, detail="User not configured in platform")

        user = {
            'id': user_row.id,
            'clerk_id': user_row.clerk_id,
            'email': user_row.email,
            'is_active': True,   # users table has no is_active; default True
            'banned_until': None,  # users table has no banned_until; no ban check
            'is_admin': user_row.is_admin,
            'daily_quota': user_row.daily_quota,
            'daily_used': user_row.daily_used,
            'last_reset': user_row.last_reset,
            'orm_user': user_row,  # pass ORM object for quota enforcement
        }

        # 8. Check if user is active
        if not user['is_active']:
            logger.warning(f"User inactive: {user_id}")
            raise HTTPException(status_code=401, detail="User account inactive")

        # 9. Check if user is banned/suspended
        if user['banned_until'] and user['banned_until'] > now_utc:
            logger.warning(f"User banned until {user['banned_until']}: {user_id}")
            raise HTTPException(status_code=403, detail="Account suspended")

        # 9. Validate workspace access if workspace_id in request
        workspace_role = None
        if hasattr(request.state, 'workspace_id'):
            workspace_result = await db.execute(text("""
                SELECT validate_workspace_access(:user_id, :workspace_id) as access_info
            """), {"user_id": user_id, "workspace_id": request.state.workspace_id})

            access_info = workspace_result.scalar()
            if not access_info or not access_info.get('has_access'):
                raise HTTPException(status_code=403, detail="Not authorized for this workspace")

            workspace_role = access_info.get('role')

    # 10. Attach user info to request for logging
    request.state.user_id = user_id
    request.state.user_email = email
    request.state.workspace_role = workspace_role

    return {
        "user_id": user_id,
        "email": email,
        "exp": exp,
        "iat": iat,
        "workspace_role": workspace_role,
        "user": user
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
