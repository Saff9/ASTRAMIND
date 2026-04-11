import os
import sys
from pathlib import Path

import pytest

# Ensure `backend/` is on sys.path so imports like `import main` work.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# Keep tests fast/deterministic by disabling background loops.
os.environ.setdefault("DISABLE_BACKGROUND_TASKS", "1")

# Set test JWT secret for security tests
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-purposes-only-32chars")


@pytest.fixture
def anyio_backend():
    return "asyncio"
