#!/usr/bin/env python3
"""Return the next numbered follow-up prefix for a research folder."""

import os
import re
import sys


def next_number(output_dir: str) -> int:
    max_seen = 3
    for name in os.listdir(output_dir):
        match = re.match(r"^(\d{2})-.*\.md$", name)
        if match:
            max_seen = max(max_seen, int(match.group(1)))
    return max_seen + 1


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: next_followup_number.py <research_output_dir>", file=sys.stderr)
        sys.exit(1)
    output_dir = sys.argv[1]
    if not os.path.isdir(output_dir):
        print(f"Directory not found: {output_dir}", file=sys.stderr)
        sys.exit(1)
    print(f"{next_number(output_dir):02d}")


if __name__ == "__main__":
    main()
