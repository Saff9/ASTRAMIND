import os

path = "core/config.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            return url'''

replacement = '''            if url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://", 1)
            if url.startswith("libsql://"):
                return url.replace("libsql://", "sqlite+libsql://", 1)
            return url'''

if target in content:
    content = content.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed!")
else:
    print("Target not found. Something is wrong.")
