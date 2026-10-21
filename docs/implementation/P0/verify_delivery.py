"""Read-only verification of the imported delivery and optional Git/archive bytes."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile


MANIFEST_SHA256 = "16aadd64d5a256330df0b1cf05106c300df394835e40037c5925073247c1c4c5"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--git-ref", help="Also verify exact blobs at this local Git ref")
    parser.add_argument("--archive", type=Path, help="Also compare the retained original ZIP")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    delivery = root / "docs/engineering"
    manifest_name = "SHA256-DELIVERY-MANIFEST.json"
    manifest_bytes = (delivery / manifest_name).read_bytes()
    require(hashlib.sha256(manifest_bytes).hexdigest() == MANIFEST_SHA256,
            "Delivery manifest differs from the observed bootstrap input")
    manifest = json.loads(manifest_bytes)
    records = manifest["files"]
    expected = {record["path"] for record in records}
    require(len(expected) == len(records) == 41, "Duplicate or unexpected manifest entries")
    require(sum(name.startswith("01-normative/") for name in expected) ==
            manifest["normative_count"] == 18, "Unexpected normative file count")
    for name in expected:
        path = PurePosixPath(name)
        require(not path.is_absolute() and "\\" not in name and
                all(part not in (".", "..") and ":" not in part for part in path.parts),
                "Unsafe manifest path")
        require((delivery / name).resolve().is_relative_to(delivery.resolve()),
                "Manifest path escapes delivery")
    actual = {p.relative_to(delivery).as_posix() for p in delivery.rglob("*") if p.is_file()}
    require(actual == expected | {manifest_name}, "Delivery file inventory mismatch")

    def git_blob(name: str) -> bytes:
        return subprocess.run(
            ["git", "-c", f"safe.directory={root.as_posix()}", "show",
             f"{args.git_ref}:docs/engineering/{name}"],
            cwd=root, check=True, capture_output=True,
        ).stdout

    for record in records:
        name = record["path"]
        content = (delivery / name).read_bytes()
        require(len(content) == record["bytes"] and
                hashlib.sha256(content).hexdigest() == record["sha256"], name)
        if args.git_ref:
            require(git_blob(name) == content, f"Git blob mismatch: {name}")
    if args.git_ref:
        require(git_blob(manifest_name) == manifest_bytes, "Git manifest mismatch")
    if args.archive:
        with zipfile.ZipFile(args.archive) as archive:
            require(archive.testzip() is None, "Archive CRC failure")
            require(len(archive.infolist()) == 42 and
                    set(archive.namelist()) == actual, "Archive inventory mismatch")
            for name in actual:
                require(archive.read(name) == (delivery / name).read_bytes(),
                        f"Archive byte mismatch: {name}")
    print(json.dumps({
        "status": "PASS", "delivery_files": 42, "manifest_payload_files": 41,
        "normative_files": 18, "manifest_sha256": MANIFEST_SHA256,
        "git_blobs": "PASS" if args.git_ref else "NOT_RUN",
        "archive_comparison": "PASS" if args.archive else "NOT_RUN",
    }, indent=2))


if __name__ == "__main__":
    main()
