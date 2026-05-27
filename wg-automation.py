#!/usr/bin/env python3
"""Create WireGuard client configs and add them as server peers.

Examples:
  sudo ./wg-automation.py
  sudo ./wg-automation.py create alice
"""

from __future__ import annotations

import argparse
import base64
import ipaddress
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


DEFAULT_INTERFACE = "wg0"
DEFAULT_API_URL = "http://10.0.0.2:3000/api/vpn"
DEFAULT_AGENT_TOKEN = "vps"
DEFAULT_ENDPOINT = "35.212.244.73:51820"
DEFAULT_SUBNET = "10.0.0.0/24"
DEFAULT_OUTPUT_DIR = "clients"
DEFAULT_DNS = "8.8.8.8, 8.8.4.4"
DEFAULT_ALLOWED_IPS = "0.0.0.0/0"
DEFAULT_POLL_INTERVAL = 5
DEFAULT_USER_AGENT = "curl/8.5.0"
DEFAULT_QR_ENABLED = True
RESERVED_HOSTS = 10


class WireGuardError(RuntimeError):
    """Raised when a WireGuard command fails."""


def run(command: list[str], input_text: str | None = None) -> str:
    try:
        result = subprocess.run(
            command,
            input=input_text,
            text=True,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise WireGuardError(f"Command not found: {command[0]}") from exc
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip()
        detail = f": {stderr}" if stderr else ""
        raise WireGuardError(f"Command failed: {' '.join(command)}{detail}") from exc

    return result.stdout.strip()


def safe_client_name(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        raise ValueError("client name may only contain letters, numbers, dots, hyphens, and underscores")
    return name


def generate_key_pair() -> tuple[str, str]:
    private_key = run(["wg", "genkey"])
    public_key = run(["wg", "pubkey"], input_text=f"{private_key}\n")
    return private_key, public_key


def get_server_public_key(interface: str) -> str:
    return run(["wg", "show", interface, "public-key"])


def get_used_ips(interface: str) -> set[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    used: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    output = run(["wg", "show", interface, "allowed-ips"])

    for line in output.splitlines():
        parts = line.split()
        for allowed_ip in parts[1:]:
            try:
                network = ipaddress.ip_network(allowed_ip, strict=False)
            except ValueError:
                continue

            if network.prefixlen == network.max_prefixlen:
                used.add(network.network_address)

    return used


def reserve_first_hosts(
    network: ipaddress.IPv4Network | ipaddress.IPv6Network,
    count: int,
) -> set[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    reserved: set[ipaddress.IPv4Address | ipaddress.IPv6Address] = set()
    for index, host in enumerate(network.hosts(), start=1):
        if index > count:
            break
        reserved.add(host)
    return reserved


def next_available_ip(
    network: ipaddress.IPv4Network | ipaddress.IPv6Network,
    used_ips: set[ipaddress.IPv4Address | ipaddress.IPv6Address],
    reserved_hosts: int,
) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    blocked = used_ips | reserve_first_hosts(network, reserved_hosts)

    for host in network.hosts():
        if host not in blocked:
            return host

    raise WireGuardError(f"No available client IPs in {network}")


def add_peer(
    interface: str,
    public_key: str,
    client_ip: ipaddress.IPv4Address | ipaddress.IPv6Address,
    dry_run: bool,
) -> None:
    command = [
        "wg",
        "set",
        interface,
        "peer",
        public_key,
        "allowed-ips",
        f"{client_ip}/32" if client_ip.version == 4 else f"{client_ip}/128",
    ]

    if dry_run:
        print("DRY RUN:", " ".join(command))
        return

    run(command)


def save_wireguard_config(interface: str, dry_run: bool) -> None:
    command = ["wg-quick", "save", interface]

    if dry_run:
        print("DRY RUN:", " ".join(command))
        return

    run(command)


def format_client_config(
    client_private_key: str,
    client_ip: ipaddress.IPv4Address | ipaddress.IPv6Address,
    client_prefix: int,
    server_public_key: str,
    endpoint: str,
    allowed_ips: str,
    dns: str | None,
    persistent_keepalive: int,
) -> str:
    dns_line = f"DNS = {dns}\n" if dns else ""

    return (
        "[Interface]\n"
        f"Address = {client_ip}/{client_prefix}\n"
        f"PrivateKey = {client_private_key}\n"
        f"{dns_line}"
        "\n"
        "[Peer]\n"
        f"PublicKey = {server_public_key}\n"
        f"Endpoint = {endpoint}\n"
        f"AllowedIPs = {allowed_ips}\n"
        f"PersistentKeepalive = {persistent_keepalive}\n"
    )


def write_client_config(output_dir: Path, client_name: str, config: str, dry_run: bool) -> Path:
    output_path = output_dir / f"{client_name}.conf"

    if dry_run:
        print(f"DRY RUN: would write {output_path}")
        print()
        print(config)
        return output_path

    output_dir.mkdir(parents=True, exist_ok=True)

    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    mode = 0o600
    try:
        fd = os.open(output_path, flags, mode)
    except FileExistsError as exc:
        raise WireGuardError(f"Client config already exists: {output_path}") from exc

    with os.fdopen(fd, "w", encoding="utf-8") as file:
        file.write(config)

    return output_path


def generate_qr_code(config: str, config_path: Path, dry_run: bool) -> tuple[Path | None, str | None]:
    qr_path = config_path.with_suffix(".png")

    if dry_run:
        print(f"DRY RUN: would write QR code {qr_path}")
        return qr_path, None

    run(["qrencode", "-t", "png", "-o", str(qr_path)], input_text=config)
    qr_path.chmod(0o600)

    with qr_path.open("rb") as file:
        qr_code = base64.b64encode(file.read()).decode("ascii")

    return qr_path, f"data:image/png;base64,{qr_code}"


def create_client(args: argparse.Namespace, client_name: str) -> dict[str, str]:
    network = ipaddress.ip_network(args.subnet, strict=False)
    dns = args.dns.strip() or None

    used_ips = get_used_ips(args.interface)
    client_ip = next_available_ip(network, used_ips, args.reserved_hosts)
    client_private_key, client_public_key = generate_key_pair()
    server_public_key = get_server_public_key(args.interface)

    add_peer(args.interface, client_public_key, client_ip, args.dry_run)

    if not args.no_save:
        save_wireguard_config(args.interface, args.dry_run)

    config = format_client_config(
        client_private_key=client_private_key,
        client_ip=client_ip,
        client_prefix=network.prefixlen,
        server_public_key=server_public_key,
        endpoint=args.endpoint,
        allowed_ips=args.allowed_ips,
        dns=dns,
        persistent_keepalive=args.keepalive,
    )
    output_path = write_client_config(Path(args.output_dir), client_name, config, args.dry_run)
    qr_path, qr_code = generate_qr_code(config, output_path, args.dry_run) if args.qr else (None, None)

    return {
        "client_name": client_name,
        "assigned_ip": str(client_ip),
        "address": f"{client_ip}/{network.prefixlen}",
        "client_public_key": client_public_key,
        "config": config,
        "config_file": str(output_path),
        "qr_file": str(qr_path) if qr_path else None,
        "qr_code": qr_code,
    }


def api_request(method: str, url: str, token: str | None, payload: dict | None = None) -> dict:
    body = None
    headers = {
        "Accept": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(url, data=body, headers=headers, method=method)

    with urlopen(request, timeout=15) as response:
        response_body = response.read().decode("utf-8")
        if not response_body:
            return {}
        return json.loads(response_body)


def describe_http_error(error: HTTPError) -> str:
    try:
        body = error.read().decode("utf-8").strip()
    except Exception:
        body = ""

    detail = f"{error.code} {error.reason} for {error.url}"
    if body:
        detail = f"{detail}: {body[:500]}"

    return detail


def normalize_pending_requests(data: dict) -> list[dict]:
    if isinstance(data.get("requests"), list):
        return data["requests"]
    if isinstance(data.get("jobs"), list):
        return data["jobs"]
    if data.get("id") or data.get("client_name") or data.get("clientName"):
        return [data]
    return []


def request_client_name(job: dict) -> str:
    raw_name = job.get("client_name") or job.get("clientName") or job.get("username") or f"client-{job.get('id')}"
    return safe_client_name(str(raw_name))


def run_agent(args: argparse.Namespace) -> int:
    pending_url = urljoin(args.api_url.rstrip("/") + "/", "pending")
    token = args.agent_token

    print(f"WireGuard agent started. Polling {pending_url}")
    print(f"Backend API URL: {args.api_url}")
    if token == "change-this-agent-token":
        print("Warning: DEFAULT_AGENT_TOKEN is still using the placeholder value.", file=sys.stderr)

    while True:
        try:
            data = api_request("GET", pending_url, token)
            jobs = normalize_pending_requests(data)

            for job in jobs:
                job_id = job.get("id") or job.get("request_id") or job.get("requestId")
                if job_id is None:
                    print("Skipping job without id")
                    continue

                client_name = request_client_name(job)
                complete_url = urljoin(args.api_url.rstrip("/") + "/", f"{job_id}/complete")
                fail_url = urljoin(args.api_url.rstrip("/") + "/", f"{job_id}/fail")

                try:
                    result = create_client(args, client_name)
                    api_request("POST", complete_url, token, result)
                    print(f"Created peer for {client_name}: {result['address']}")
                except Exception as exc:
                    api_request("POST", fail_url, token, {"error": str(exc)})
                    print(f"Failed job {job_id}: {exc}", file=sys.stderr)

        except HTTPError as exc:
            print(f"Agent poll failed: {describe_http_error(exc)}", file=sys.stderr)
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"Agent poll failed: {exc}", file=sys.stderr)
        except KeyboardInterrupt:
            print("WireGuard agent stopped.")
            return 0

        time.sleep(args.poll_interval)


def add_wireguard_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--interface", default=DEFAULT_INTERFACE, help=f"WireGuard interface, default: {DEFAULT_INTERFACE}")
    parser.add_argument("--subnet", default=DEFAULT_SUBNET, help=f"VPN subnet, default: {DEFAULT_SUBNET}")
    parser.add_argument("--endpoint", default=os.getenv("WG_ENDPOINT", DEFAULT_ENDPOINT), help=f"Public server endpoint, default: {DEFAULT_ENDPOINT}")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help=f"Directory for client configs, default: {DEFAULT_OUTPUT_DIR}")
    parser.add_argument("--dns", default=DEFAULT_DNS, help=f"DNS server for client config; use '' to omit, default: {DEFAULT_DNS}")
    parser.add_argument("--allowed-ips", default=DEFAULT_ALLOWED_IPS, help=f"Client traffic routes, default: {DEFAULT_ALLOWED_IPS}")
    parser.add_argument("--keepalive", type=int, default=25, help="PersistentKeepalive seconds, default: 25")
    parser.add_argument("--reserved-hosts", type=int, default=RESERVED_HOSTS, help="Number of first usable IPs to reserve, default: 10")
    parser.add_argument("--no-qr", dest="qr", action="store_false", help="Do not generate a PNG QR code with qrencode")
    parser.add_argument("--no-save", action="store_true", help="Do not run wg-quick save after adding the peer")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without changing WireGuard or files")
    parser.set_defaults(qr=DEFAULT_QR_ENABLED)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plug-and-play WireGuard agent. Run without arguments to poll the backend and create clients.",
    )
    subparsers = parser.add_subparsers(dest="command")

    create_parser = subparsers.add_parser("create", help="Create one WireGuard client config now")
    create_parser.add_argument("client_name", help="Name for the new client config file")
    add_wireguard_args(create_parser)

    agent_parser = subparsers.add_parser("agent", help="Poll a backend API for pending VPN client requests")
    agent_parser.add_argument("--api-url", default=os.getenv("WG_API_URL", DEFAULT_API_URL), help=f"Backend VPN API base URL, default: {DEFAULT_API_URL}")
    agent_parser.add_argument("--agent-token", default=os.getenv("WG_AGENT_TOKEN", DEFAULT_AGENT_TOKEN), help="Bearer token for backend API")
    agent_parser.add_argument("--poll-interval", type=int, default=DEFAULT_POLL_INTERVAL, help=f"Seconds between backend polls, default: {DEFAULT_POLL_INTERVAL}")
    add_wireguard_args(agent_parser)

    args = parser.parse_args()

    if args.command is None:
        args.command = "agent"
        args.api_url = os.getenv("WG_API_URL", DEFAULT_API_URL)
        args.agent_token = os.getenv("WG_AGENT_TOKEN", DEFAULT_AGENT_TOKEN)
        args.poll_interval = DEFAULT_POLL_INTERVAL
        args.interface = DEFAULT_INTERFACE
        args.subnet = DEFAULT_SUBNET
        args.endpoint = os.getenv("WG_ENDPOINT", DEFAULT_ENDPOINT)
        args.output_dir = DEFAULT_OUTPUT_DIR
        args.dns = DEFAULT_DNS
        args.allowed_ips = DEFAULT_ALLOWED_IPS
        args.keepalive = 25
        args.reserved_hosts = RESERVED_HOSTS
        args.qr = DEFAULT_QR_ENABLED
        args.no_save = False
        args.dry_run = False

    return args


def main() -> int:
    args = parse_args()

    try:
        if args.command == "agent":
            return run_agent(args)

        result = create_client(args, safe_client_name(args.client_name))
    except (ValueError, WireGuardError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Created client: {result['client_name']}")
    print(f"Assigned IP: {result['assigned_ip']}")
    print(f"Config file: {result['config_file']}")
    if result["qr_file"]:
        print(f"QR code file: {result['qr_file']}")
    print(f"Reserved first {args.reserved_hosts} usable IPs in {ipaddress.ip_network(args.subnet, strict=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
