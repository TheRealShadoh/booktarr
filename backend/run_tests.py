#!/usr/bin/env python3
"""
Test runner for BookTarr backend tests
"""
import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle output"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.stdout:
        print("STDOUT:")
        print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
    
    print(f"Exit code: {result.returncode}")
    return result.returncode == 0


def main():
    """Main test runner"""
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    print("BookTarr Backend Test Runner")
    print(f"Working directory: {os.getcwd()}")
    
    # Install test dependencies
    if not run_command([
        sys.executable, "-m", "pip", "install", 
        "pytest", "pytest-asyncio", "httpx", "aiofiles"
    ], "Installing test dependencies"):
        print("❌ Failed to install dependencies")
        return 1
    
    # Run specific test categories
    test_commands = [
        {
            "cmd": [sys.executable, "-m", "pytest", "tests/test_series_validation.py", "-v"],
            "desc": "Series Validation Tests"
        },
        {
            "cmd": [sys.executable, "-m", "pytest", "tests/test_image_service.py", "-v"],
            "desc": "Image Service Tests"
        },
        {
            "cmd": [sys.executable, "-m", "pytest", "tests/test_volume_sync.py", "-v"],
            "desc": "Volume Sync Tests"
        },
        {
            "cmd": [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short"],
            "desc": "All New Tests"
        }
    ]
    
    results = []
    for test in test_commands:
        success = run_command(test["cmd"], test["desc"])
        results.append((test["desc"], success))
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = 0
    for desc, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{desc}: {status}")
        if success:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} test suites passed")
    
    if passed == len(results):
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())