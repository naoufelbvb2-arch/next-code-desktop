"""Read-only verification of the imported delivery and optional Git/archive bytes."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile


MANIFEST_SHA256 = "16aadd64d5a256330df0b1cf05106c300df394835e40037c5925073247c1c4c5"


ADDENDA_MANIFEST_SHA256 = "105d751eb4b5d6f31cdf4104aed03d33b329c690cb6b7a52d0c23616e2ef9ed5"
R03_MANIFEST_SHA256 = "70421b9325665f2b50bf07453ad743196227722aea28ea313ca0bf5fb2f83a1f"

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
    addenda_name = "SHA256-APPROVED-ADDENDA-MANIFEST.json"
    addenda_bytes = (delivery / addenda_name).read_bytes()
    require(hashlib.sha256(addenda_bytes).hexdigest() == ADDENDA_MANIFEST_SHA256,
            "Approved addenda baseline mismatch")
    addenda = json.loads(addenda_bytes)
    added_records = addenda["files"]
    added = {record["path"] for record in added_records}
    require(added == {"01-normative/NCD-03-IIS-02-C02-P8-READ-PROJECTIONS-ADDENDUM.md"}
            and len(added_records) == 1 and not (added & expected),
            "Unexpected approved addendum inventory")
    # P9-R03 prospectively adopts CP-002. Preserve the earlier authenticated
    # manifest; pin a separate exact extension and its owner ratification record.
    r03_name = "SHA256-APPROVED-ADDENDA-R03-MANIFEST.json"
    r03_bytes = (delivery / r03_name).read_bytes()
    require(hashlib.sha256(r03_bytes).hexdigest() == R03_MANIFEST_SHA256,
            "R03 approved addendum baseline mismatch")
    r03 = json.loads(r03_bytes)
    r03_records = r03["files"]
    r03_added = {record["path"] for record in r03_records}
    require(r03["previousManifest"] == {"path": addenda_name, "sha256": ADDENDA_MANIFEST_SHA256}
            and r03["totalNormativeFiles"] == 20
            and len(r03_records) == 2 and r03_added == {
                "01-normative/NCD-V1-DEEPSEEK-SINGLE-PROVIDER-SCOPE-v1.0-FROZEN.md",
                "02-authority-records/NCD-V1-CP-002-OWNER-RATIFICATION-RECORD.md"}
            and not r03_added & (expected | added), "Unexpected R03 approved inventory/chain")
    actual = {p.relative_to(delivery).as_posix() for p in delivery.rglob("*") if p.is_file()}
    require(actual == expected | added | r03_added | {manifest_name, addenda_name, r03_name}, "Delivery file inventory mismatch")

    def git_blob(name: str) -> bytes:
        target = f"docs/engineering/{name}"
        revision = f":{target}" if args.git_ref == ":" else f"{args.git_ref}:{target}"
        return subprocess.run(
            ["git", "-c", f"safe.directory={root.as_posix()}", "show",
             revision],
            cwd=root, check=True, capture_output=True,
        ).stdout

    for record in records + added_records + r03_records:
        name = record["path"]
        content = (delivery / name).read_bytes()
        require(len(content) == record["bytes"] and
                hashlib.sha256(content).hexdigest() == record["sha256"], name)
        if args.git_ref:
            require(git_blob(name) == content, f"Git blob mismatch: {name}")
    if args.git_ref:
        require(git_blob(manifest_name) == manifest_bytes, "Git manifest mismatch")
        require(git_blob(addenda_name) == addenda_bytes, "Git addenda manifest mismatch")
        require(git_blob(r03_name) == r03_bytes, "Git R03 addenda manifest mismatch")
    if args.archive:
        with zipfile.ZipFile(args.archive) as archive:
            require(archive.testzip() is None, "Archive CRC failure")
            require(len(archive.infolist()) == 42 and
                    set(archive.namelist()) == expected | {manifest_name}, "Archive inventory mismatch")
            for name in expected | {manifest_name}:
                require(archive.read(name) == (delivery / name).read_bytes(),
                        f"Archive byte mismatch: {name}")
    print(json.dumps({
        "status": "PASS", "delivery_files": 42, "manifest_payload_files": 41,
        "original_normative_files": 18, "approved_normative_addenda": 2,
        "normative_files": 20, "engineering_files": 47,
        "addenda_manifest_sha256": ADDENDA_MANIFEST_SHA256, "manifest_sha256": MANIFEST_SHA256,
        "r03_addenda_manifest_sha256": R03_MANIFEST_SHA256,
        "git_blobs": "PASS" if args.git_ref else "NOT_RUN",
        "archive_comparison": "PASS" if args.archive else "NOT_RUN",
    }, indent=2))


if __name__ == "__main__":
    main()
