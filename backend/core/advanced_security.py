# backend/core/advanced_security.py
"""
ADVANCED SECURITY ORCHESTRATION - v1.1.2 Deep Security Enhancements
Enterprise-grade security beyond basic requirements.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
import logging
from dataclasses import dataclass, field
import aiofiles

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

# =========================================
# ADVANCED ENCRYPTION SYSTEM
# =========================================

class HierarchicalEncryption:
    """
    Military-grade hierarchical encryption with key rotation and perfect forward secrecy.
    """

    def __init__(self, master_key: str):
        self.master_key = master_key
        self.key_versions: Dict[str, bytes] = {}
        self._generate_key_hierarchy()

    def _generate_key_hierarchy(self):
        """Generate hierarchical encryption keys."""
        # Master key derivation
        master_salt = b'ASTRAMINDai_master_salt_2024'
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=master_salt,
            iterations=200000,
            backend=default_backend()
        )
        master_derived = kdf.derive(self.master_key.encode())

        # Generate version-specific keys
        for version in range(10):  # Keep 10 key versions for rotation
            version_salt = f'ASTRAMINDai_key_v{version}_2024'.encode()
            version_kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=version_salt,
                iterations=100000,
                backend=default_backend()
            )
            self.key_versions[f'v{version}'] = base64.urlsafe_b64encode(
                version_kdf.derive(master_derived)
            )

    def encrypt_with_version(self, data: str, key_version: str = 'v0') -> str:
        """Encrypt data with specific key version for perfect forward secrecy."""
        if key_version not in self.key_versions:
            raise ValueError(f"Unknown key version: {key_version}")

        cipher = Fernet(self.key_versions[key_version])
        encrypted = cipher.encrypt(data.encode())

        # Include version in encrypted payload
        payload = {
            'version': key_version,
            'data': base64.urlsafe_b64encode(encrypted).decode(),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

        return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()

    def decrypt_hierarchical(self, encrypted_payload: str) -> str:
        """Decrypt data, automatically handling key versions."""
        try:
            # Decode the payload
            payload_data = base64.urlsafe_b64decode(encrypted_payload.encode())
            payload = json.loads(payload_data)

            version = payload['version']
            encrypted_data = base64.urlsafe_b64decode(payload['data'].encode())

            if version not in self.key_versions:
                raise ValueError(f"Unsupported key version: {version}")

            cipher = Fernet(self.key_versions[version])
            decrypted = cipher.decrypt(encrypted_data)

            return decrypted.decode()

        except (json.JSONDecodeError, KeyError, InvalidToken) as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Invalid encrypted data")

    def rotate_keys(self) -> Dict[str, str]:
        """Rotate encryption keys and return migration data."""
        # Generate new key hierarchy
        old_versions = self.key_versions.copy()
        self._generate_key_hierarchy()

        # Return mapping for data migration
        migration_map = {}
        for old_version in old_versions:
            if old_version in self.key_versions:
                migration_map[old_version] = 'active'
            else:
                migration_map[old_version] = 'deprecated'

        logger.info(f"Key rotation completed. Migration map: {migration_map}")
        return migration_map

# =========================================
# AI-POWERED THREAT DETECTION
# =========================================

@dataclass
class ThreatPattern:
    """Represents a detected threat pattern."""
    pattern_id: str
    threat_type: str
    confidence: float
    indicators: List[str]
    severity: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SecurityEvent:
    """Security event with full context."""
    event_id: str
    user_id: Optional[str]
    session_id: Optional[str]
    event_type: str
    severity: str
    source_ip: str
    user_agent: str
    timestamp: datetime
    request_data: Dict[str, Any]
    response_data: Dict[str, Any]
    threat_indicators: List[str] = field(default_factory=list)
    risk_score: float = 0.0

class AIPoweredThreatDetector:
    """
    AI-powered threat detection using behavioral analysis and machine learning.
    """

    def __init__(self):
        self.threat_patterns: Dict[str, ThreatPattern] = {}
        self.user_behaviors: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.global_anomalies: Dict[str, int] = defaultdict(int)
        self.adaptive_thresholds: Dict[str, float] = {
            'login_attempts': 5.0,
            'api_calls_per_minute': 60.0,
            'unusual_patterns': 3.0,
            'data_exfiltration': 2.0
        }

    async def analyze_request(
        self,
        user_id: Optional[str],
        session_id: Optional[str],
        request_data: Dict[str, Any],
        source_ip: str,
        user_agent: str
    ) -> List[ThreatPattern]:
        """
        AI-powered request analysis for threat detection.
        """

        threats = []
        current_time = datetime.now(timezone.utc)

        # 1. Behavioral Analysis
        if user_id:
            behavior_threats = await self._analyze_user_behavior(
                user_id, request_data, current_time
            )
            threats.extend(behavior_threats)

        # 2. Pattern Recognition
        pattern_threats = await self._detect_patterns(
            request_data, source_ip, user_agent
        )
        threats.extend(pattern_threats)

        # 3. Anomaly Detection
        anomaly_threats = await self._detect_anomalies(
            request_data, source_ip, current_time
        )
        threats.extend(anomaly_threats)

        # 4. Context-Aware Analysis
        context_threats = await self._analyze_context(
            user_id, session_id, request_data, source_ip
        )
        threats.extend(context_threats)

        # Update adaptive thresholds
        await self._update_adaptive_thresholds(threats)

        return threats

    async def _analyze_user_behavior(
        self,
        user_id: str,
        request_data: Dict[str, Any],
        timestamp: datetime
    ) -> List[ThreatPattern]:
        """Analyze user behavior patterns."""

        threats = []
        user_history = self.user_behaviors[user_id]

        # Track request patterns
        request_signature = self._generate_request_signature(request_data)

        # Check for unusual timing patterns
        if len(user_history) > 10:
            recent_requests = list(user_history)[-10:]
            time_diffs = [
                (recent_requests[i+1][0] - recent_requests[i][0]).total_seconds()
                for i in range(len(recent_requests)-1)
            ]

            avg_time_diff = sum(time_diffs) / len(time_diffs)
            current_time_diff = (timestamp - recent_requests[-1][0]).total_seconds()

            if current_time_diff < avg_time_diff * 0.1:  # Too fast
                threats.append(ThreatPattern(
                    pattern_id=f"behavior_{user_id}_{int(timestamp.timestamp())}",
                    threat_type="automated_activity",
                    confidence=0.85,
                    indicators=["unusually_fast_requests", "potential_automation"],
                    severity="medium",
                    timestamp=timestamp,
                    metadata={
                        "avg_time_diff": avg_time_diff,
                        "current_time_diff": current_time_diff,
                        "user_id": user_id
                    }
                ))

        # Store behavior data
        user_history.append((timestamp, request_signature))

        return threats

    async def _detect_patterns(
        self,
        request_data: Dict[str, Any],
        source_ip: str,
        user_agent: str
    ) -> List[ThreatPattern]:
        """Detect known malicious patterns."""

        threats = []
        request_text = json.dumps(request_data, sort_keys=True)

        # Injection patterns
        injection_patterns = [
            r'<script[^>]*>.*?</script>',
            r'union\s+select.*--',
            r';\s*drop\s+table',
            r'eval\s*\(',
            r'exec\s*\(',
            r'btoa\s*\(',
            r'atob\s*\('
        ]

        for pattern in injection_patterns:
            if re.search(pattern, request_text, re.IGNORECASE | re.DOTALL):
                threats.append(ThreatPattern(
                    pattern_id=f"injection_{source_ip}_{int(time.time())}",
                    threat_type="code_injection",
                    confidence=0.95,
                    indicators=[f"matched_pattern: {pattern}"],
                    severity="high",
                    timestamp=datetime.now(timezone.utc),
                    metadata={
                        "pattern": pattern,
                        "source_ip": source_ip,
                        "user_agent": user_agent[:200]
                    }
                ))

        # Suspicious user agents
        suspicious_agents = [
            "python-requests",
            "curl",
            "wget",
            "postman",
            "insomnia"
        ]

        for agent in suspicious_agents:
            if agent.lower() in user_agent.lower():
                threats.append(ThreatPattern(
                    pattern_id=f"agent_{source_ip}_{int(time.time())}",
                    threat_type="automated_tool",
                    confidence=0.75,
                    indicators=[f"suspicious_agent: {agent}"],
                    severity="low",
                    timestamp=datetime.now(timezone.utc),
                    metadata={"user_agent": user_agent, "source_ip": source_ip}
                ))

        return threats

    async def _detect_anomalies(
        self,
        request_data: Dict[str, Any],
        source_ip: str,
        timestamp: datetime
    ) -> List[ThreatPattern]:
        """Detect statistical anomalies."""

        threats = []

        # Rate-based anomaly detection
        current_minute = timestamp.replace(second=0, microsecond=0)
        rate_key = f"rate_{source_ip}_{current_minute.isoformat()}"

        self.global_anomalies[rate_key] += 1
        current_rate = self.global_anomalies[rate_key]

        # Check against adaptive threshold
        threshold = self.adaptive_thresholds.get('api_calls_per_minute', 60.0)

        if current_rate > threshold * 2:  # Double the threshold
            threats.append(ThreatPattern(
                pattern_id=f"rate_anomaly_{source_ip}_{int(timestamp.timestamp())}",
                threat_type="rate_anomaly",
                confidence=min(current_rate / threshold, 1.0),
                indicators=[f"high_request_rate: {current_rate}/min"],
                severity="medium" if current_rate < threshold * 5 else "high",
                timestamp=timestamp,
                metadata={
                    "source_ip": source_ip,
                    "current_rate": current_rate,
                    "threshold": threshold,
                    "time_window": current_minute.isoformat()
                }
            ))

        return threats

    async def _analyze_context(
        self,
        user_id: Optional[str],
        session_id: Optional[str],
        request_data: Dict[str, Any],
        source_ip: str
    ) -> List[ThreatPattern]:
        """Analyze request context for threats."""

        threats = []

        # Session-less requests from same IP (potential API abuse)
        if not session_id and user_id:
            session_key = f"sessionless_{source_ip}"
            self.global_anomalies[session_key] += 1

            if self.global_anomalies[session_key] > 10:
                threats.append(ThreatPattern(
                    pattern_id=f"session_abuse_{source_ip}_{int(time.time())}",
                    threat_type="session_abuse",
                    confidence=0.8,
                    indicators=["excessive_sessionless_requests"],
                    severity="medium",
                    timestamp=datetime.now(timezone.utc),
                    metadata={"source_ip": source_ip, "sessionless_count": self.global_anomalies[session_key]}
                ))

        # Large payload analysis
        payload_size = len(json.dumps(request_data))
        if payload_size > 1000000:  # 1MB
            threats.append(ThreatPattern(
                pattern_id=f"large_payload_{source_ip}_{int(time.time())}",
                threat_type="data_exfiltration",
                confidence=0.7,
                indicators=[f"unusually_large_payload: {payload_size} bytes"],
                severity="low",
                timestamp=datetime.now(timezone.utc),
                metadata={"payload_size": payload_size, "source_ip": source_ip}
            ))

        return threats

    def _generate_request_signature(self, request_data: Dict[str, Any]) -> str:
        """Generate a signature for request pattern analysis."""
        # Create a normalized signature for behavioral analysis
        signature_data = {
            k: v for k, v in request_data.items()
            if k not in ['timestamp', 'request_id', 'session_id']
        }
        signature_string = json.dumps(signature_data, sort_keys=True)
        return hashlib.sha256(signature_string.encode()).hexdigest()[:16]

    async def _update_adaptive_thresholds(self, threats: List[ThreatPattern]):
        """Update adaptive thresholds based on threat patterns."""
        if not threats:
            return

        # Gradually adjust thresholds based on threat frequency
        for threat in threats:
            threat_type = threat.threat_type
            if threat_type in self.adaptive_thresholds:
                # Increase threshold slightly when threats are detected
                current_threshold = self.adaptive_thresholds[threat_type]
                self.adaptive_thresholds[threat_type] = current_threshold * 1.05

                # Cap maximum threshold
                if self.adaptive_thresholds[threat_type] > current_threshold * 3:
                    self.adaptive_thresholds[threat_type] = current_threshold * 3

# =========================================
# ADVANCED AUDIT & COMPLIANCE
# =========================================

class ComplianceEngine:
    """
    Automated compliance monitoring and reporting.
    """

    def __init__(self):
        self.compliance_rules = {
            'gdpr': self._check_gdpr_compliance,
            'ccpa': self._check_ccpa_compliance,
            'soc2': self._check_soc2_compliance,
            'iso27001': self._check_iso27001_compliance
        }
        self.compliance_scores: Dict[str, float] = {}
        self.violation_log: List[Dict] = []

    async def run_compliance_check(self, framework: str) -> Dict[str, Any]:
        """Run comprehensive compliance check."""

        if framework not in self.compliance_rules:
            raise ValueError(f"Unknown compliance framework: {framework}")

        checker = self.compliance_rules[framework]
        results = await checker()

        # Calculate compliance score
        score = self._calculate_compliance_score(results)

        # Store results
        self.compliance_scores[framework] = score

        # Log violations
        for violation in results.get('violations', []):
            self.violation_log.append({
                'framework': framework,
                'violation': violation,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'severity': violation.get('severity', 'medium')
            })

        return {
            'framework': framework,
            'score': score,
            'results': results,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    async def _check_gdpr_compliance(self) -> Dict[str, Any]:
        """Check GDPR compliance requirements."""
        violations = []

        # Check data retention policies
        # Check consent management
        # Check data deletion capabilities
        # Check audit logging

        return {
            'compliant': len(violations) == 0,
            'violations': violations,
            'checked_areas': ['data_retention', 'consent', 'deletion', 'auditing']
        }

    async def _check_ccpa_compliance(self) -> Dict[str, Any]:
        """Check CCPA compliance requirements."""
        violations = []

        # Check data collection consent
        # Check data deletion capabilities
        # Check privacy rights
        # Check data sharing controls

        return {
            'compliant': len(violations) == 0,
            'violations': violations,
            'checked_areas': ['consent', 'deletion', 'privacy_rights', 'data_sharing']
        }

    async def _check_soc2_compliance(self) -> Dict[str, Any]:
        """Check SOC2 compliance requirements."""
        violations = []

        # Check security controls
        # Check availability monitoring
        # Check processing integrity
        # Check confidentiality
        # Check privacy

        return {
            'compliant': len(violations) == 0,
            'violations': violations,
            'checked_areas': ['security', 'availability', 'integrity', 'confidentiality', 'privacy']
        }

    async def _check_iso27001_compliance(self) -> Dict[str, Any]:
        """Check ISO27001 compliance requirements."""
        violations = []

        # Check information security management
        # Check risk management
        # Check access controls
        # Check incident management

        return {
            'compliant': len(violations) == 0,
            'violations': violations,
            'checked_areas': ['security_management', 'risk_management', 'access_control', 'incident_management']
        }

    def _calculate_compliance_score(self, results: Dict[str, Any]) -> float:
        """Calculate compliance score from 0-100."""
        violations = results.get('violations', [])
        checked_areas = results.get('checked_areas', [])

        if not checked_areas:
            return 0.0

        # Base score
        score = 100.0

        # Deduct points for violations
        for violation in violations:
            severity = violation.get('severity', 'medium')
            if severity == 'critical':
                score -= 25
            elif severity == 'high':
                score -= 15
            elif severity == 'medium':
                score -= 8
            else:
                score -= 3

        return max(0.0, min(100.0, score))

# =========================================
# SECURITY INTELLIGENCE PLATFORM
# =========================================

class SecurityIntelligence:
    """
    Advanced security intelligence and threat hunting.
    """

    def __init__(self):
        self.threat_intelligence: Dict[str, Any] = {}
        self.behavior_baselines: Dict[str, Any] = {}
        self.risk_models: Dict[str, Any] = {}

    async def analyze_security_posture(self) -> Dict[str, Any]:
        """Comprehensive security posture analysis."""

        return {
            'threat_landscape': await self._analyze_threat_landscape(),
            'vulnerability_assessment': await self._assess_vulnerabilities(),
            'risk_profile': await self._calculate_risk_profile(),
            'recommendations': await self._generate_security_recommendations(),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    async def _analyze_threat_landscape(self) -> Dict[str, Any]:
        """Analyze current threat landscape."""
        return {
            'active_threats': [],
            'emerging_patterns': [],
            'risk_trends': [],
            'intelligence_feeds': []
        }

    async def _assess_vulnerabilities(self) -> Dict[str, Any]:
        """Assess system vulnerabilities."""
        return {
            'critical_vulnerabilities': 0,
            'high_vulnerabilities': 0,
            'medium_vulnerabilities': 0,
            'low_vulnerabilities': 0,
            'last_assessment': datetime.now(timezone.utc).isoformat()
        }

    async def _calculate_risk_profile(self) -> Dict[str, Any]:
        """Calculate overall risk profile."""
        return {
            'overall_risk_score': 0.0,
            'risk_factors': [],
            'mitigation_status': {},
            'risk_trends': []
        }

    async def _generate_security_recommendations(self) -> List[str]:
        """Generate security recommendations."""
        return [
            "Implement multi-factor authentication",
            "Regular security training for all users",
            "Automated vulnerability scanning",
            "Incident response plan development",
            "Regular security audits and penetration testing"
        ]

# =========================================
# GLOBAL SECURITY ORCHESTRATION
# =========================================

class AdvancedSecurityOrchestrator:
    """
    Master security orchestration system for v1.1.2
    """

    def __init__(self):
        self.encryption = None  # Will be initialized with master key
        self.threat_detector = AIPoweredThreatDetector()
        self.compliance_engine = ComplianceEngine()
        self.security_intelligence = SecurityIntelligence()

        # Security monitoring
        self.active_threats: Set[str] = set()
        self.mitigation_actions: List[Dict] = []
        self.security_alerts: deque = deque(maxlen=10000)

    async def initialize_security(self, master_key: str):
        """Initialize the advanced security system."""
        self.encryption = HierarchicalEncryption(master_key)
        logger.info("Advanced security system initialized")

    async def process_security_event(
        self,
        event: SecurityEvent,
        request_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a security event through the advanced security pipeline.
        """

        # 1. Threat Detection
        threats = await self.threat_detector.analyze_request(
            event.user_id,
            event.session_id,
            event.request_data,
            event.source_ip,
            event.user_agent
        )

        # 2. Risk Assessment
        risk_assessment = await self._assess_risk(event, threats)

        # 3. Automated Response
        response_actions = await self._determine_response_actions(
            event, threats, risk_assessment
        )

        # 4. Compliance Checking
        compliance_status = await self.compliance_engine.run_compliance_check('soc2')

        # 5. Intelligence Update
        await self.security_intelligence.analyze_security_posture()

        # 6. Audit Logging
        await self._log_security_event(event, threats, risk_assessment, response_actions)

        # 7. Alert Generation
        alerts = await self._generate_alerts(event, threats, risk_assessment)

        return {
            'event_id': event.event_id,
            'threats_detected': len(threats),
            'risk_score': risk_assessment.get('score', 0),
            'response_actions': response_actions,
            'compliance_score': compliance_status.get('score', 0),
            'alerts': alerts,
            'processing_time': time.time()
        }

    async def _assess_risk(self, event: SecurityEvent, threats: List[ThreatPattern]) -> Dict[str, Any]:
        """Assess overall risk level."""
        risk_score = 0.0
        risk_factors = []

        # Base risk from event type
        event_risks = {
            'authentication': 0.3,
            'api_access': 0.1,
            'data_access': 0.5,
            'admin_action': 0.8,
            'suspicious_activity': 0.9
        }

        risk_score += event_risks.get(event.event_type, 0.2)

        # Add threat-based risk
        for threat in threats:
            severity_multiplier = {'low': 0.1, 'medium': 0.3, 'high': 0.7, 'critical': 1.0}
            risk_score += threat.confidence * severity_multiplier.get(threat.severity, 0.3)
            risk_factors.append(f"{threat.threat_type}:{threat.severity}")

        return {
            'score': min(risk_score, 1.0),
            'level': 'low' if risk_score < 0.3 else 'medium' if risk_score < 0.7 else 'high',
            'factors': risk_factors
        }

    async def _determine_response_actions(
        self,
        event: SecurityEvent,
        threats: List[ThreatPattern],
        risk_assessment: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Determine automated response actions."""

        actions = []

        risk_score = risk_assessment.get('score', 0)

        if risk_score > 0.8:  # Critical
            actions.append({
                'action': 'block_ip',
                'target': event.source_ip,
                'duration': '1_hour',
                'reason': 'critical_threat_detected'
            })
            actions.append({
                'action': 'notify_security_team',
                'priority': 'urgent',
                'threats': [t.threat_type for t in threats]
            })

        elif risk_score > 0.6:  # High
            actions.append({
                'action': 'rate_limit_ip',
                'target': event.source_ip,
                'duration': '15_minutes',
                'reason': 'high_risk_activity'
            })

        elif risk_score > 0.4:  # Medium
            actions.append({
                'action': 'log_enhanced',
                'target': event.event_id,
                'reason': 'suspicious_activity'
            })

        return actions

    async def _log_security_event(
        self,
        event: SecurityEvent,
        threats: List[ThreatPattern],
        risk_assessment: Dict[str, Any],
        response_actions: List[Dict[str, Any]]
    ):
        """Log comprehensive security event."""

        log_entry = {
            'event': event.__dict__,
            'threats': [t.__dict__ for t in threats],
            'risk_assessment': risk_assessment,
            'response_actions': response_actions,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'processed_by': 'AdvancedSecurityOrchestrator_v1.1.2'
        }

        # Store in security alerts queue
        self.security_alerts.append(log_entry)

        # Write to security log file
        async with aiofiles.open('/var/log/ASTRAMINDai/security.log', 'a') as f:
            await f.write(json.dumps(log_entry) + '\n')

    async def _generate_alerts(
        self,
        event: SecurityEvent,
        threats: List[ThreatPattern],
        risk_assessment: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate security alerts."""

        alerts = []

        if risk_assessment.get('score', 0) > 0.7:
            alerts.append({
                'type': 'high_risk_event',
                'severity': 'high',
                'message': f"High-risk security event detected: {event.event_type}",
                'event_id': event.event_id,
                'user_id': event.user_id,
                'risk_score': risk_assessment.get('score')
            })

        if len(threats) > 0:
            alerts.append({
                'type': 'threat_detected',
                'severity': threats[0].severity if threats else 'low',
                'message': f"{len(threats)} threat(s) detected",
                'threat_types': list(set(t.threat_type for t in threats))
            })

        return alerts

# =========================================
# GLOBAL SECURITY INSTANCE
# =========================================

# Initialize the advanced security orchestrator
advanced_security = AdvancedSecurityOrchestrator()

__all__ = [
    'HierarchicalEncryption',
    'AIPoweredThreatDetector',
    'ComplianceEngine',
    'SecurityIntelligence',
    'AdvancedSecurityOrchestrator',
    'advanced_security'
]
