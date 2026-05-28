#!/usr/bin/env python3
"""Install Node dependencies declared in package.json for deployment."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
PACKAGE_JSON = PROJECT_ROOT / "package.json"
PACKAGE_LOCK = PROJECT_ROOT / "package-lock.json"


def run(command: list[str]) -> None:
    print(f"$ {' '.join(command)}")
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)


def require_command(name: str) -> None:
    if shutil.which(name) is None:
        raise SystemExit(f"Missing required command: {name}. Install Node.js/npm first.")


def read_package_json() -> dict:
    if not PACKAGE_JSON.exists():
        raise SystemExit("package.json was not found. Run this script from the project repo.")

    with PACKAGE_JSON.open(encoding="utf-8") as package_file:
        return json.load(package_file)


def print_dependencies(package_data: dict, production: bool) -> None:
    dependencies = package_data.get("dependencies", {})
    dev_dependencies = package_data.get("devDependencies", {})

    print("Dependencies from package.json:")
    for name, version in sorted(dependencies.items()):
        print(f"  - {name}: {version}")

    if not production and dev_dependencies:
        print("Dev dependencies:")
        for name, version in sorted(dev_dependencies.items()):
            print(f"  - {name}: {version}")


def install_dependencies(production: bool, dry_run: bool) -> None:
    if PACKAGE_LOCK.exists():
        command = ["npm", "ci"]
    else:
        command = ["npm", "install"]

    if production:
        command.append("--omit=dev")

    if dry_run:
        print(f"Dry run: would execute {' '.join(command)}")
        return

    run(command)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Install npm packages listed in package.json."
    )
    parser.add_argument(
        "--production",
        action="store_true",
        help="install only dependencies, skipping devDependencies such as nodemon",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="show the npm command without installing packages",
    )
    args = parser.parse_args()

    require_command("node")
    require_command("npm")

    package_data = read_package_json()
    print_dependencies(package_data, args.production)
    install_dependencies(args.production, args.dry_run)

    if not args.dry_run:
        print("Deployment dependencies are installed.")
        print("Start the app with: npm start")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
