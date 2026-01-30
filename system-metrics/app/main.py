from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException

HOST_ROOT = Path("/host")

app = FastAPI(title="System Metrics Service", version="1.0.0")


def run_host_command(command: List[str]) -> Optional[str]:
    """Execute a host command through the mounted root using chroot."""
    executable = command[0]

    # resolve binary location on host
    if not HOST_ROOT.joinpath(executable.lstrip("/")).exists():
        candidate = HOST_ROOT / "usr/bin" / executable
        if candidate.exists():
            command = [f"/usr/bin/{executable}"] + command[1:]
        else:
            return None

    try:
        completed = subprocess.run(
            ["chroot", str(HOST_ROOT), *command],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        return completed.stdout.strip()
    except (FileNotFoundError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return None


def read_os_release() -> Optional[str]:
    os_release_path = HOST_ROOT / "etc/os-release"
    if not os_release_path.exists():
        return None
    data: Dict[str, str] = {}
    for line in os_release_path.read_text().splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"')
    name = data.get("PRETTY_NAME") or data.get("NAME")
    version = data.get("VERSION")
    if name and version:
        return f"{name} {version}"
    return name


def parse_lscpu(raw: str) -> Dict[str, Any]:
    cpu_info: Dict[str, Any] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, value = [segment.strip() for segment in line.split(":", 1)]
        cpu_info[key] = value
    summary: Dict[str, Any] = {}
    summary["model"] = cpu_info.get("Model name") or cpu_info.get("Model") or "Unknown"
    cores = cpu_info.get("CPU(s)")
    if cores:
        try:
            summary["cores"] = int(re.findall(r"\d+", cores)[0])
        except (IndexError, ValueError):
            summary["cores"] = cores
    sockets = cpu_info.get("Socket(s)")
    if sockets:
        summary["sockets"] = sockets
    threads_per_core = cpu_info.get("Thread(s) per core")
    if threads_per_core:
        summary["threads_per_core"] = threads_per_core
    return summary


def parse_free(raw: str) -> Dict[str, Any]:
    lines = raw.splitlines()
    if len(lines) < 2:
        return {}
    headers = re.split(r"\s+", lines[0].strip())
    mem_line = next((line for line in lines if line.lower().startswith("mem")), None)
    if not mem_line:
        return {}
    values = re.split(r"\s+", mem_line.strip())[1:]
    memory = dict(zip(headers, values))
    return {
        "total": memory.get("total"),
        "used": memory.get("used"),
    }


def human_readable_to_bytes(value: str) -> Optional[float]:
    match = re.match(r"([\d\.]+)([KMGTP]?)(i?B)?", value)
    if not match:
        return None
    number = float(match.group(1))
    unit = match.group(2).upper() if match.group(2) else ""
    multipliers = {
        "": 1,
        "K": 1024,
        "M": 1024**2,
        "G": 1024**3,
        "T": 1024**4,
        "P": 1024**5,
    }
    return number * multipliers.get(unit, 1)


def format_gb(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    bytes_value = human_readable_to_bytes(value)
    if bytes_value is None:
        return value
    gb = bytes_value / (1024**3)
    return f"{gb:.1f} GB"


def parse_storage(raw: str) -> Dict[str, Any]:
    lines = raw.splitlines()
    if len(lines) < 2:
        return {}
    headers = re.split(r"\s+", lines[0].strip())
    values = re.split(r"\s+", lines[1].strip())

    if headers[-2:] == ["Mounted", "on"]:
        headers = headers[:-2] + ["Mounted on"]
    if len(values) < len(headers) and "Mounted on" in headers:
        # Join remaining parts for mountpoint
        mount_index = headers.index("Mounted on")
        mount_value = " ".join(values[mount_index:])
        values = values[:mount_index] + [mount_value]

    data = dict(zip(headers, values))

    filesystem = data.get("Filesystem")
    size = format_gb(data.get("Size"))
    used = format_gb(data.get("Used"))
    available = format_gb(data.get("Avail"))
    mountpoint = data.get("Mounted") or data.get("Mounted on")

    result = {
        "filesystem": filesystem,
        "size": size,
        "used": used,
        "available": available,
        "mountpoint": mountpoint,
    }
    return {key: value for key, value in result.items() if value}


def gather_os_version() -> Optional[str]:
    output = run_host_command(["lsb_release", "-a"])
    if output:
        description: Optional[str] = None
        for line in output.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key == "description":
                description = value
        if description:
            return description
    fallback = run_host_command(["lsb_release", "-ds"])
    if fallback:
        return fallback.strip().strip('"')
    return read_os_release()


def gather_hostname_and_ips() -> Tuple[Optional[str], Optional[str], List[str]]:
    # Read hostname directly from host filesystem
    hostname_path = HOST_ROOT / "etc/hostname"
    hostname = None
    if hostname_path.exists():
        try:
            hostname = hostname_path.read_text().strip()
        except Exception:
            pass

    # Fallback to hostname command if file doesn't exist or is empty
    if not hostname:
        hostname = run_host_command(["hostname"])

    output = run_host_command(["ip", "a"])
    if not output:
        return hostname, None, []

    current_iface: Optional[str] = None
    preferred_ips: List[str] = []
    fallback_ips: List[str] = []

    for line in output.splitlines():
        iface_match = re.match(r"^\d+:\s+([^:]+):", line)
        if iface_match:
            current_iface = iface_match.group(1).split("@")[0]
            continue
        if current_iface and "inet " in line:
            if current_iface.startswith(("lo", "docker", "br-", "veth", "tun")):
                continue
            cidr = line.strip().split()[1]
            address, _, mask = cidr.partition("/")
            if not mask:
                continue
            try:
                mask_size = int(mask)
            except ValueError:
                continue
            if address.startswith("127."):
                continue
            if mask_size >= 24:
                preferred_ips.append(address)
            else:
                fallback_ips.append(address)

    selected_ip: Optional[str] = None
    if preferred_ips:
        selected_ip = preferred_ips[0]
    elif fallback_ips:
        selected_ip = fallback_ips[0]

    if selected_ip:
        return hostname, selected_ip, [selected_ip]
    return hostname, None, []


def gather_memory() -> Dict[str, Any]:
    output = run_host_command(["free", "-h"])
    if not output:
        return {}
    return parse_free(output)


def gather_storage() -> Dict[str, Any]:
    output = run_host_command(["df", "-h", "/"])
    if not output:
        return {}
    return parse_storage(output)


def gather_system_metrics() -> Dict[str, Any]:
    metrics: Dict[str, Any] = {}

    hostname, primary_ip, ips = gather_hostname_and_ips()
    if hostname:
        metrics["hostname"] = hostname
    if ips:
        metrics["ip_addresses"] = ips

    os_info = gather_os_version()
    if os_info:
        metrics["operating_system"] = os_info

    lscpu_output = run_host_command(["lscpu"])
    if lscpu_output:
        metrics["cpu"] = parse_lscpu(lscpu_output)

    memory = gather_memory()
    if memory:
        metrics["memory"] = memory

    storage = gather_storage()
    if storage:
        metrics["storage"] = storage

    return metrics


@app.get("/metrics")
def metrics() -> Dict[str, Any]:
    data = gather_system_metrics()
    if not data:
        raise HTTPException(status_code=500, detail="Unable to collect system metrics")
    return data


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}

