#!/usr/bin/env python3
"""Copy genuine, already captured Pulse images to an operator recovery directory.

Input is a reviewed DB manifest with image_id/captured_at/event_id provenance.
Never captures a browser, changes an event, or stores credentials in the backup.
This is an operator backup, not the online screenshot fallback.
"""
import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import time
import subprocess
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--bindings", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    records = json.loads(args.manifest.read_text())
    key = bytes.fromhex(json.loads(args.bindings.read_text())["IMAGE_SIGNING_KEY"])
    args.output.mkdir(parents=True, exist_ok=True)
    restored = []
    for item in records:
        image_id = str(uuid.UUID(item["image_id"]))
        expires = str(int(time.time()) + 300)
        signature = hmac.new(key, f"{image_id}:{expires}".encode(), hashlib.sha256).hexdigest()
        url = f"https://vault-spy-pulse.iruben597.workers.dev/image/{image_id}?expires={expires}&signature={signature}"
        # URLs contain short-lived credentials: never print HTTP exception text.
        transfer = subprocess.run(
            ["curl", "--silent", "--show-error", "--fail", "--max-time", "30",
             "--max-filesize", "8000000", "--config", "-"],
            input=f'url = "{url}"\n'.encode(), capture_output=True,
        )
        data = transfer.stdout
        if transfer.returncode or not 10_000 <= len(data) <= 8_000_000 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise SystemExit(f"Backup failed for image {image_id}; no event was changed.")
        destination = args.output / f"{image_id}.png"
        digest = hashlib.sha256(data).hexdigest()
        if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise SystemExit(f"Existing backup differs for {image_id}; refusing to overwrite.")
        if not destination.exists():
            temporary = destination.with_suffix(".tmp")
            temporary.write_bytes(data)
            os.replace(temporary, destination)
        if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise SystemExit(f"Backup verification failed for {image_id}.")
        restored.append({**item, "file": destination.name, "sha256": digest, "bytes": len(data)})
    (args.output / "verified-manifest.json").write_text(json.dumps(restored, indent=2) + "\n")
    print(json.dumps({"verified_images": len(restored), "bytes": sum(r["bytes"] for r in restored)}))


if __name__ == "__main__":
    main()
