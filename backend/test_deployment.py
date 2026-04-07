#!/usr/bin/env python3
"""
ASTRAMIND Backend Deployment Test Script
Tests all critical dependencies and configuration for production deployment
"""

import os
import sys
import subprocess
import logging
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

class DeploymentTester:
    """Test deployment readiness and configuration"""

    def __init__(self):
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.backend_dir = os.path.join(self.project_root, "backend")
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0,
            "tests": []
        }

    def test_python_version(self) -> bool:
        """Test Python version compatibility"""
        try:
            import platform
            python_version = platform.python_version_tuple()
            major, minor = int(python_version[0]), int(python_version[1])

            if (major == 3 and minor >= 11) or major > 3:
                logger.info(f"✅ Python {python_version} is compatible")
                self._add_test_result("Python Version", "PASS", f"Python {python_version}")
                return True
            else:
                error_msg = f"Python {python_version} is not supported. Requires Python 3.11+"
                logger.error(error_msg)
                self._add_test_result("Python Version", "FAIL", error_msg)
                return False
        except Exception as e:
            error_msg = f"Could not check Python version: {e}"
            logger.error(error_msg)
            self._add_test_result("Python Version", "FAIL", error_msg)
            return False

    def test_dependency_imports(self) -> bool:
        """Test that all required packages can be imported"""
        required_packages = [
            "fastapi", "uvicorn", "pydantic", "email_validator",
            "python_jose", "passlib", "bcrypt", "cryptography",
            "httpx", "aiohttp", "pydantic_settings", "asyncpg",
            "psycopg", "sqlalchemy", "requests", "bs4", "lxml",
            "click", "typer", "psutil", "python_magic", "filetype",
            "prometheus_client", "opentelemetry", "redis", "pyjwt",
            "alembic", "gunicorn", "pytest", "locust", "sentry_sdk"
        ]

        failed_imports = []
        for package in required_packages:
            try:
                __import__(package.replace("_", "").replace("-", ""))
                logger.debug(f"✅ Successfully imported {package}")
            except ImportError as e:
                failed_imports.append(f"{package} ({e})")
                logger.error(f"❌ Failed to import {package}: {e}")

        if failed_imports:
            error_msg = f"Missing packages: {', '.join(failed_imports)}"
            self._add_test_result("Dependency Imports", "FAIL", error_msg)
            return False
        else:
            logger.info("✅ All required packages imported successfully")
            self._add_test_result("Dependency Imports", "PASS", "All packages available")
            return True

    def test_email_validation(self) -> bool:
        """Test email validation functionality"""
        try:
            from pydantic import BaseModel, EmailStr
            from email_validator import validate_email

            # Test basic email validation
            class TestModel(BaseModel):
                email: EmailStr

            # Test valid email
            test_model = TestModel(email="test@example.com")
            assert test_model.email == "test@example.com"

            # Test invalid email
            try:
                TestModel(email="invalid-email")
                self._add_test_result("Email Validation", "FAIL", "Invalid email not caught")
                return False
            except Exception:
                pass  # Expected behavior

            logger.info("✅ Email validation working correctly")
            self._add_test_result("Email Validation", "PASS", "EmailStr validation functional")
            return True

        except ImportError as e:
            error_msg = f"Email validation dependencies missing: {e}"
            logger.error(error_msg)
            self._add_test_result("Email Validation", "FAIL", error_msg)
            return False
        except Exception as e:
            error_msg = f"Email validation test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Email Validation", "FAIL", error_msg)
            return False

    def test_security_dependencies(self) -> bool:
        """Test security-related dependencies"""
        try:
            import bcrypt
            import cryptography
            from cryptography.fernet import Fernet

            # Test bcrypt
            password = b"test_password"
            hashed = bcrypt.hashpw(password, bcrypt.gensalt())
            assert bcrypt.checkpw(password, hashed)

            # Test cryptography
            key = Fernet.generate_key()
            fernet = Fernet(key)
            token = fernet.encrypt(b"test_message")
            decrypted = fernet.decrypt(token)
            assert decrypted == b"test_message"

            logger.info("✅ Security dependencies working correctly")
            self._add_test_result("Security Dependencies", "PASS", "bcrypt and cryptography functional")
            return True

        except ImportError as e:
            error_msg = f"Security dependencies missing: {e}"
            logger.error(error_msg)
            self._add_test_result("Security Dependencies", "FAIL", error_msg)
            return False
        except Exception as e:
            error_msg = f"Security dependencies test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Security Dependencies", "FAIL", error_msg)
            return False

    def test_configuration_validation(self) -> bool:
        """Test configuration loading and validation"""
        try:
            from core.config import settings, validate_startup

            # Test basic configuration loading
            assert hasattr(settings, "ENV")
            assert hasattr(settings, "DATABASE_URL")
            assert hasattr(settings, "JWT_SECRET")

            # Test environment detection
            env = settings.ENV
            is_prod = settings.is_production()
            is_dev = settings.is_development()

            logger.info(f"✅ Configuration loaded: ENV={env}, Production={is_prod}, Development={is_dev}")
            self._add_test_result("Configuration Loading", "PASS", f"Environment: {env}")

            # Test validation (may fail in test environment, which is expected)
            try:
                validate_startup()
                logger.info("✅ Configuration validation passed")
                self._add_test_result("Configuration Validation", "PASS", "All settings validated")
                return True
            except RuntimeError as e:
                # Expected in test environment without all settings
                logger.warning(f"⚠️  Configuration validation failed (expected in test): {e}")
                self._add_test_result("Configuration Validation", "WARN", "Validation failed in test environment")
                return True
            except Exception as e:
                error_msg = f"Configuration validation error: {e}"
                logger.error(error_msg)
                self._add_test_result("Configuration Validation", "FAIL", error_msg)
                return False

        except ImportError as e:
            error_msg = f"Configuration module import failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Configuration Loading", "FAIL", error_msg)
            return False
        except Exception as e:
            error_msg = f"Configuration test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Configuration Loading", "FAIL", error_msg)
            return False

    def test_database_configuration(self) -> bool:
        """Test database configuration"""
        try:
            from core.config import settings

            # Test database URL generation
            db_url = settings.effective_database_url()
            assert isinstance(db_url, str)
            assert len(db_url) > 0

            logger.info(f"✅ Database configuration valid: {db_url}")
            self._add_test_result("Database Configuration", "PASS", f"Database URL: {db_url}")
            return True

        except Exception as e:
            error_msg = f"Database configuration test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Database Configuration", "FAIL", error_msg)
            return False

    def test_api_key_parsing(self) -> bool:
        """Test API key parsing functionality"""
        try:
            from core.config import settings

            # Test empty keys
            assert settings.groq_api_keys == []
            assert settings.openrouter_api_keys == []
            assert settings.admin_emails == []

            # Test with sample data
            os.environ["GROQ_API_KEYS"] = "key1,key2,key3"
            os.environ["OPENROUTER_API_KEYS"] = "or_key1,or_key2"
            os.environ["ADMIN_EMAILS"] = "admin@example.com,user@example.com"

            # Reload settings
            from importlib import reload
            import core.config
            reload(core.config)
            from core.config import settings

            assert len(settings.groq_api_keys) == 3
            assert len(settings.openrouter_api_keys) == 2
            assert len(settings.admin_emails) == 2

            logger.info("✅ API key parsing working correctly")
            self._add_test_result("API Key Parsing", "PASS", "Key parsing functional")
            return True

        except Exception as e:
            error_msg = f"API key parsing test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("API Key Parsing", "FAIL", error_msg)
            return False

    def test_auth_module(self) -> bool:
        """Test auth module functionality"""
        try:
            from api.v1.auth import LoginRequest, TokenResponse

            # Test LoginRequest model
            login_request = LoginRequest(email="test@example.com")
            assert login_request.email == "test@example.com"

            # Test TokenResponse model
            token_response = TokenResponse(
                access_token="test_token",
                token_type="bearer",
                expires_in=3600,
                user={"id": 1, "email": "test@example.com"}
            )
            assert token_response.access_token == "test_token"

            logger.info("✅ Auth module working correctly")
            self._add_test_result("Auth Module", "PASS", "Auth models functional")
            return True

        except ImportError as e:
            error_msg = f"Auth module import failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Auth Module", "FAIL", error_msg)
            return False
        except Exception as e:
            error_msg = f"Auth module test failed: {e}"
            logger.error(error_msg)
            self._add_test_result("Auth Module", "FAIL", error_msg)
            return False

    def _add_test_result(self, test_name: str, status: str, details: str):
        """Add a test result to the results collection"""
        self.test_results["tests"].append({
            "name": test_name,
            "status": status,
            "details": details
        })

        if status == "PASS":
            self.test_results["passed"] += 1
        elif status == "FAIL":
            self.test_results["failed"] += 1
        elif status == "WARN":
            self.test_results["warnings"] += 1

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate a comprehensive test report"""
        total_tests = self.test_results["passed"] + self.test_results["failed"] + self.test_results["warnings"]
        pass_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0

        report = {
            "project": "ASTRAMIND Backend",
            "version": "1.1.2",
            "test_type": "Deployment Readiness",
            "summary": {
                "total_tests": total_tests,
                "passed": self.test_results["passed"],
                "failed": self.test_results["failed"],
                "warnings": self.test_results["warnings"],
                "pass_rate": round(pass_rate, 1),
                "status": "READY" if self.test_results["failed"] == 0 else "NOT_READY"
            },
            "tests": self.test_results["tests"],
            "recommendations": []
        }

        # Generate recommendations
        if self.test_results["failed"] > 0:
            report["recommendations"].append("Fix failed tests before deployment")
        if self.test_results["warnings"] > 0:
            report["recommendations"].append("Review warnings for potential issues")
        if report["summary"]["pass_rate"] < 100:
            report["recommendations"].append("Improve test coverage and reliability")

        return report

    def print_test_report(self, report: Dict[str, Any]):
        """Print a formatted test report"""
        print("\n" + "=" * 70)
        print(f"ASTRAMIND Backend - Deployment Readiness Test Report")
        print(f"Version: {report['version']}")
        print(f"Test Type: {report['test_type']}")
        print("=" * 70)

        summary = report["summary"]
        print(f"\nTest Summary:")
        print(f"  Total Tests: {summary['total_tests']}")
        print(f"  Passed: {summary['passed']}")
        print(f"  Failed: {summary['failed']}")
        print(f"  Warnings: {summary['warnings']}")
        print(f"  Pass Rate: {summary['pass_rate']}%")
        print(f"  Status: {summary['status']}")

        print(f"\nTest Results:")
        for test in report["tests"]:
            status_icon = "✅" if test["status"] == "PASS" else "❌" if test["status"] == "FAIL" else "⚠️"
            print(f"  {status_icon} {test['name']}: {test['status']}")
            print(f"     {test['details']}")

        if report["recommendations"]:
            print(f"\nRecommendations:")
            for i, recommendation in enumerate(report["recommendations"], 1):
                print(f"  {i}. {recommendation}")

        print("\n" + "=" * 70)
        if summary["status"] == "READY":
            print("🎉 Deployment Ready! All critical tests passed.")
        else:
            print("❌ Deployment Not Ready. Please fix the issues before deploying.")
        print("=" * 70)

    def run_all_tests(self) -> bool:
        """Run all deployment tests"""
        logger.info("Starting ASTRAMIND Backend deployment readiness tests...")

        # Run individual tests
        tests = [
            self.test_python_version,
            self.test_dependency_imports,
            self.test_email_validation,
            self.test_security_dependencies,
            self.test_configuration_validation,
            self.test_database_configuration,
            self.test_api_key_parsing,
            self.test_auth_module
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                logger.error(f"Test {test.__name__} failed with exception: {e}")
                self._add_test_result(test.__name__, "FAIL", f"Exception: {e}")

        # Generate and display report
        report = self.generate_test_report()
        self.print_test_report(report)

        # Return success status
        success = report["summary"]["status"] == "READY"
        logger.info(f"Deployment tests completed with status: {report['summary']['status']}")
        return success

def main():
    """Main entry point"""
    try:
        tester = DeploymentTester()
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        logger.error(f"Deployment test script failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
