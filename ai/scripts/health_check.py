#!/usr/bin/env python3
"""
AI/ML Engineering Module — Health Check & Diagnostics CLI.
Verifies Python version, package imports, settings, and runs a dry-run inference test.
"""

import sys
from pathlib import Path

# Add project root to sys.path so script can be run directly from repo root or ai/ directory
current_file = Path(__file__).resolve()
ai_dir = current_file.parents[1]
repo_root = current_file.parents[2]
for p in [str(repo_root), str(ai_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)


def run_diagnostics() -> bool:
    print("=" * 70)
    print("ODDO NATIONAL HACKATHON 2026 — AI/ML MODULE HEALTH DIAGNOSTICS")
    print("=" * 70)

    # 1. Check Python Version
    py_version = sys.version_info
    print(f"[*] Python Version: {py_version.major}.{py_version.minor}.{py_version.micro}")
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 10):
        print("[-] FAIL: Python 3.10+ required.")
        return False
    print("[+] PASS: Python version compatible.")

    # 2. Check Critical Packages
    packages = [
        ("pydantic", "pydantic"),
        ("yaml", "PyYAML"),
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("sklearn", "scikit-learn"),
        ("fastapi", "fastapi"),
        ("httpx", "httpx"),
    ]

    all_pkgs_ok = True
    for mod_name, pkg_label in packages:
        try:
            __import__(mod_name)
            print(f"[+] PASS: Package '{pkg_label}' is installed.")
        except ImportError:
            print(f"[-] FAIL: Missing package '{pkg_label}'. Install via requirements.txt.")
            all_pkgs_ok = False

    if not all_pkgs_ok:
        return False

    # 3. Check Configuration Loading
    try:
        from ai.src.core.config import get_settings

        settings = get_settings()
        print(f"[+] PASS: Configuration loaded. Model: {settings.model_name} (v{settings.model_version})")
    except Exception as exc:
        print(f"[-] FAIL: Config loading error: {str(exc)}")
        return False

    # 4. Check Model Registry
    try:
        from ai.src.models.registry import get_model_registry

        registry = get_model_registry()
        models = registry.list_models()
        print(f"[+] PASS: ModelRegistry initialized with {len(models)} model(s): {models}")
    except Exception as exc:
        print(f"[-] FAIL: ModelRegistry initialization error: {str(exc)}")
        return False

    # 5. Check Dry-Run Inference Execution
    try:
        from ai.src.inference.predictor import Predictor

        predictor = Predictor()
        mock_payload = {
            "request_id": "health-check-test-001",
            "entity_id": "health-entity",
            "features": {"feature_a": 42.0, "feature_b": "category_1"},
            "options": {"explain": True, "timeout_ms": 3000},
        }

        output = predictor.predict(mock_payload)
        if not output.get("success"):
            print(f"[-] FAIL: Dry-run prediction returned error: {output.get('error')}")
            return False

        result = output.get("result", {})
        metadata = output.get("metadata", {})
        print(f"[+] PASS: Dry-run prediction succeeded!")
        print(f"    - Output: {result.get('prediction')} (confidence: {result.get('confidence')})")
        print(f"    - Latency: {metadata.get('latency_ms')} ms")
    except Exception as exc:
        print(f"[-] FAIL: Dry-run inference crashed: {str(exc)}")
        return False

    print("=" * 70)
    print("ALL HEALTH CHECKS PASSED: AI/ML Module is Operational & Ready!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = run_diagnostics()
    sys.exit(0 if success else 1)

