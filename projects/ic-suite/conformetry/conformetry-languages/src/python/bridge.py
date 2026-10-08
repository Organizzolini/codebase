"""Bridge entrypoint for invoking the Python conformance validator from TypeScript.

Reads one JSON request on stdin and writes one JSON response on stdout, so the
TypeScript side never has to model Python's `ast` module. Errors are returned
as data rather than raised, so a malformed file degrades to a reported problem
instead of a non-zero exit that aborts the whole validation run.
"""

import json
import sys
from dataclasses import asdict


def main() -> None:
    payload = json.loads(sys.stdin.read())

    try:
        from python.validator import validate_python_conformetry

        result = validate_python_conformetry(
            filename=payload["filename"],
            instance=payload["instance"],
            template=payload["template"],
        )
    except ModuleNotFoundError as difference:
        result = {
            "differences": [
                {
                    "difference_type": "code",
                    "language": "python",
                    "message": f"Python validator dependency missing: {difference}",
                    "fix": "Reinstall the conformetry-languages package.",
                }
            ],
            "total_weight": 1,
        }

    differences = [
        asdict(difference) if hasattr(difference, "__dataclass_fields__") else difference
        for difference in result.get("differences", [])
    ]
    print(json.dumps({"differences": differences, "total_weight": result.get("total_weight", 0)}))


if __name__ == "__main__":
    main()
