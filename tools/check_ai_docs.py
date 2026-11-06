#!/usr/bin/env python3
"""Check repository AI docs, local links, and the documented scalar metadata subset.

Uses only Python's standard library. Not a general YAML/OKF conformance validator.
"""
from datetime import date
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
FIELDS = {"id", "title", "project", "record_type", "status", "created_at", "updated_at", "source_revision"}
HEADINGS = {"Knowledge / Context", "Decision / Rationale", "Evidence / Validation", "Reuse / Limits", "Decision history"}


def metadata(text):
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise ValueError("missing YAML frontmatter")
    block = text[4:].split("\n---\n", 1)[0]
    result = {}
    for line in block.splitlines():
        match = re.fullmatch(r'([a-z_]+): (".*")', line)
        if not match:
            raise ValueError("expected key and double-quoted scalar: " + line)
        key, value = match.groups()
        if key in result:
            raise ValueError("duplicate metadata key: " + key)
        result[key] = json.loads(value)
        if not isinstance(result[key], str) or not result[key].strip():
            raise ValueError("empty or non-string metadata: " + key)
    return result


def check(root):
    errors = []
    paths = [root / "AGENTS.md", root / "README.md"]
    paths += sorted((root / ".agents/skills").glob("*/SKILL.md"))
    paths += sorted((root / "docs/ai").glob("*.md"))
    paths += sorted((root / "docs/knowledge").glob("*.md"))
    for required in ("AGENTS.md", "docs/ai/README.md", "docs/knowledge/README.md", "docs/knowledge/template.md",
                     ".agents/skills/develop-shader-artwork/SKILL.md", ".agents/skills/verify-shader-artwork/SKILL.md"):
        if not (root / required).is_file():
            errors.append(required + ": missing required entry point")
    ids = set()
    for path in paths:
        label = str(path.relative_to(root))
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if path.name == "SKILL.md" or path.name.endswith(".okf.md"):
            try:
                values = metadata(text)
                if path.name == "SKILL.md":
                    if set(values) != {"name", "description"}:
                        raise ValueError("SKILL requires only name and description")
                    if values["name"] != path.parent.name or not re.fullmatch(r"[a-z0-9-]{1,64}", values["name"]):
                        raise ValueError("invalid skill name or directory mismatch")
                else:
                    if set(values) != FIELDS:
                        raise ValueError("OKF metadata fields differ from repository convention")
                    if not re.fullmatch(r"shader-playground/[a-z0-9-]+", values["id"]) or values["id"] in ids:
                        raise ValueError("invalid or duplicate record id")
                    ids.add(values["id"])
                    if values["status"] not in {"proposed", "accepted", "superseded"}:
                        raise ValueError("invalid status")
                    if values["record_type"] not in {"project-map", "decision", "lesson", "creative-concept"}:
                        raise ValueError("invalid record_type")
                    if not re.fullmatch(r"[0-9a-f]{40}", values["source_revision"]):
                        raise ValueError("source_revision must be a full commit SHA")
                    if date.fromisoformat(values["created_at"]) > date.fromisoformat(values["updated_at"]):
                        raise ValueError("updated_at precedes created_at")
                    if not HEADINGS.issubset(set(re.findall(r"^## (.+)$", text, re.M))):
                        raise ValueError("missing required OKF sections")
            except (ValueError, KeyError) as exc:
                errors.append(label + ": " + str(exc))
        # Our docs use inline links without spaces or nested parentheses.
        prose = re.sub(r"^```[^\n]*\n.*?^```[^\n]*$", "", text, flags=re.M | re.S)
        for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", prose):
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            target = target.split("#", 1)[0].split("?", 1)[0]
            resolved = (path.parent / target).resolve()
            try:
                resolved.relative_to(root.resolve())
            except ValueError:
                errors.append(label + ": link escapes repository: " + target)
                continue
            if not resolved.exists():
                errors.append(label + ": missing link target: " + target)
        if path.name.endswith(".okf.md"):
            index = root / "docs/knowledge/README.md"
            if index.is_file() and "(" + path.name + ")" not in index.read_text(encoding="utf-8"):
                errors.append(label + ": missing from knowledge index")
    return paths, errors


if __name__ == "__main__":
    files, failures = check(ROOT)
    if failures:
        print("\n".join(failures), file=sys.stderr)
        sys.exit(1)
    print("AI docs OK: %d documents (local links and repository metadata convention)" % len(files))
