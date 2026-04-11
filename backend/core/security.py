"""
Production-Grade Security Module
Comprehensive security implementation with OWASP Top 10 protections.
"""

import re
import secrets
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from functools import wraps
import jwt
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
from starlette.responses import JSONResponse
import time
from collections import defaultdict, deque

from core.config import settings

logger = logging.getLogger(__name__)

# Security configuration
class SecurityConfig:
    """Security configuration constants."""
    
    # JWT Configuration
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    JWT_REFRESH_EXPIRATION_DAYS = 7
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_WINDOW = 60  # seconds
    RATE_LIMIT_BURST = 10
    
    # Password Security
    MIN_PASSWORD_LENGTH = 12
    MAX_PASSWORD_LENGTH = 128
    
    # Input Validation
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_QUERY_LENGTH = 2000
    MAX_BODY_LENGTH = 100000
    
    # Security Headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    }
    
    # Allowed Content Types
    ALLOWED_CONTENT_TYPES = [
        "application/json",
        "text/plain",
        "text/html",
        "application/x-www-form-urlencoded",
    ]


class SecurityManager:
    """Central security management with rate limiting and monitoring."""
    
    def __init__(self):
        self.rate_limits = defaultdict(lambda: deque())
        self.blocked_ips = set()
        self.suspicious_activity = defaultdict(list)
        self.failed_logins = defaultdict(list)
        
    def is_rate_limited(self, identifier: str, window_seconds: int = 60, max_requests: int = 100) -> bool:
        """Check if identifier is rate limited."""
        now = time.time()
        window_start = now - (window_seconds or 60)
        
        # Clean old entries
        while self.rate_limits[identifier] and self.rate_limits[identifier][0] < window_start:
            self.rate_limits[identifier].popleft()
        
        # Check limit
        if len(self.rate_limits[identifier]) >= (max_requests or 100):
            return True
            
        self.rate_limits[identifier].append(now)
        return False
    
    def block_ip(self, ip: str, reason: str, duration_hours: int = 24):
        """Block an IP address."""
        self.blocked_ips.add(ip)
        logger.warning(f"IP blocked: {ip} - Reason: {reason}")
    
    def log_suspicious_activity(self, ip: str, activity: str, details: Dict = None):
        """Log suspicious activity."""
        self.suspicious_activity[ip].append({
            "timestamp": datetime.utcnow(),
            "activity": activity,
            "details": details or {}
        })
        
        # Auto-block after 5 suspicious activities in 1 hour
        recent_activities = [
            act for act in self.suspicious_activity[ip]
            if datetime.utcnow() - act["timestamp"] < timedelta(hours=1)
        ]
        
        if len(recent_activities) >= 5:
            self.block_ip(ip, "Multiple suspicious activities", 24)


# Global security manager instance
security_manager = SecurityManager()


# NOTE: Header security is handled by backend/app/middleware/security.py.
# This module focuses on auth, validation, and rate limiting.

class SecurityMiddleware:
    """Minimal security gate for rate limiting and IP blocking (header handling elsewhere)."""

    async def __call__(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)

        if client_ip in security_manager.blocked_ips:
            return JSONResponse(status_code=403, content={"error": "Access denied", "code": "IP_BLOCKED"})

        if security_manager.is_rate_limited(client_ip, 60, 100):
            return JSONResponse(status_code=429, content={"error": "Rate limit exceeded", "retry_after": 60})

        response = await call_next(request)
        return response

    def get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        if request.client and request.client.host:
            return request.client.host
        return "unknown"


class InputValidator:
    """Comprehensive input validation and sanitization."""
    
    # Dangerous patterns
    DANGEROUS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"on\w+\s*=",  # inline event handlers
        r"javascript:\s*",
        r"vbscript:\s*",
        r"data:\s*",
        r"(\.|%2e){2}(/|\\)"  # directory traversal
    ]
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 10000) -> str:
        """Sanitize string input."""
        if not isinstance(value, str):
            value = str(value)
        
        # Truncate if too long
        if len(value) > max_length:
            value = value[:max_length]
        
        # Remove dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            value = re.sub(pattern, '', value, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove control characters except whitespace
        value = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', value)
        
        return value.strip()
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @classmethod
    def validate_password(cls, password: str) -> Dict[str, Any]:
        """Validate password strength."""
        errors = []
        
        if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters long")
        
        if len(password) > SecurityConfig.MAX_PASSWORD_LENGTH:
            errors.append(f"Password must be no more than {SecurityConfig.MAX_PASSWORD_LENGTH} characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Check for common patterns
        common_patterns = [
            r'password', r'123456', r'qwerty', r'admin', r'user', r'test'
        ]
        
        for pattern in common_patterns:
            if re.search(pattern, password, re.IGNORECASE):
                errors.append("Password contains common patterns and is not secure")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    @classmethod
    def validate_url(cls, url: str) -> bool:
        """Validate URL format and safety."""
        try:
            # Basic URL format validation
            if not re.match(r'^https?://', url):
                return False
            
            # Check for dangerous protocols
            dangerous_protocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'ftp:']
            for protocol in dangerous_protocols:
                if url.lower().startswith(protocol):
                    return False
            
            # Check for directory traversal
            if '../' in url or '..\\' in url:
                return False
            
            return True
        except:
            return False


class AuthenticationManager:
    """JWT-based authentication with refresh tokens."""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
    
    def create_access_token(self, user_data: Dict[str, Any], expires_hours: int = None) -> str:
        """Create JWT access token."""
        if expires_hours is None:
            expires_hours = SecurityConfig.JWT_EXPIRATION_HOURS
        
        payload = {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "is_admin": user_data.get("is_admin", False),
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=expires_hours),
            "type": "access"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=SecurityConfig.JWT_ALGORITHM)
    
    def create_refresh_token(self, user_data: Dict[str, Any]) -> str:
        """Create JWT refresh token."""
        payload = {
            "user_id": user_data["user_id"],
            "email": user_data["email"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=SecurityConfig.JWT_REFRESH_EXPIRATION_DAYS),
            "type": "refresh",
            "jti": secrets.token_urlsafe(32)  # Unique token ID
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=SecurityConfig.JWT_ALGORITHM)
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify JWT token and type. PyJWT enforces exp by default."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[SecurityConfig.JWT_ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# Header middleware is defined in backend/app/middleware/security.py; avoid duplication here.


# Dependency for authentication
security = HTTPBearer(auto_error=False)
security_required = HTTPBearer(auto_error=True)


def create_access_token(*, subject: str, email: str, expires_hours: int | None = None) -> str:
    """
    Create a JWT access token compatible with backend API expectations.

    Claims:
    - sub: user id (string)
    - email: user email
    - iat/exp: issued-at and expiry
    """
    if not settings.JWT_SECRET:
        raise RuntimeError("JWT_SECRET not configured")

    if expires_hours is None:
        expires_hours = settings.JWT_EXPIRATION_HOURS

    now = datetime.utcnow()
    payload = {
        "sub": str(subject),
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=int(expires_hours)),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security_required),
) -> Dict[str, Any]:
    """FastAPI dependency to verify JWT bearer token and return its payload."""
    if not settings.JWT_SECRET:
        logger.error("JWT_SECRET not configured")
        raise HTTPException(status_code=500, detail="Server configuration error")

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not payload.get("sub") or not payload.get("email"):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return payload


_DEV_JWT_SECRET = "dev-" + secrets.token_hex(32)  # stable for process lifetime


def _effective_jwt_secret() -> str:
    # Provide a stable dev secret if none configured; do not mutate settings
    return settings.JWT_SECRET or _DEV_JWT_SECRET

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_manager: AuthenticationManager = Depends(lambda: AuthenticationManager(_effective_jwt_secret()))
) -> Optional[Dict[str, Any]]:
    """Get current authenticated user."""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = auth_manager.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


# Prefer FastAPI's dependency system in routes instead of decorators.
def require_auth(f):
    @wraps(f)
    async def decorated(request: Request, *args, **kwargs):
        user = await get_current_user(request)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return await f(request, user, *args, **kwargs)
    return decorated


def require_admin(f):
    """Decorator to require admin privileges."""
    @wraps(f)
    async def decorated(request: Request, *args, **kwargs):
        user = await get_current_user(request)
        if not user or not user.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        return await f(request, user, *args, **kwargs)
    return decorated
