from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.models import SubjectAffirmations
    from src.subjects import Subject

PROJECT_DIRECTORY = Path(__file__).parent.parent
OUTPUT_DIRECTORY = PROJECT_DIRECTORY / "output"


def write_affirmations_document_markdown(subject: Subject, content: str) -> None:
    output_directory = OUTPUT_DIRECTORY / f"affirmations/documents/{subject.category.slug}"
    output_directory.mkdir(parents=True, exist_ok=True)
    output_filename = f"{subject.order}-{subject.slug}.md"
    output_path = output_directory / output_filename
    content = content.strip()
    content = re.sub(r"^```(?:markdown)?\s*\n", "", content)
    content = re.sub(r"\n```\s*$", "", content)
    output_path.write_text(content, encoding="utf-8")
    print(
        f"💾 Wrote affirmations document Markdown to: {output_path.relative_to(PROJECT_DIRECTORY)}"
    )


def write_semantics_document_markdown(subject: Subject, content: str) -> None:
    output_directory = OUTPUT_DIRECTORY / f"semantic-documents/{subject.category.slug}"
    output_directory.mkdir(parents=True, exist_ok=True)
    output_filename = f"{subject.order}-{subject.slug}.md"
    output_path = output_directory / output_filename
    content = content.strip()
    content = re.sub(r"^```(?:markdown)?\s*\n", "", content)
    content = re.sub(r"\n```\s*$", "", content)
    output_path.write_text(content, encoding="utf-8")
    print(f"💾 Wrote semantics document Markdown to: {output_path.relative_to(PROJECT_DIRECTORY)}")


def write_affirmations_json(
    subject_affirmations: SubjectAffirmations,
) -> None:
    subject = subject_affirmations.subject
    output_directory = OUTPUT_DIRECTORY / f"affirmations/{subject.category.slug}"
    output_directory.mkdir(parents=True, exist_ok=True)
    output_filename = f"{subject.order}-{subject.slug}.json"
    output_path = output_directory / output_filename
    output_path.write_text(subject_affirmations.model_dump_json(indent=2), encoding="utf-8")
    print(f"💾 Wrote affirmations JSON to: {output_path.relative_to(PROJECT_DIRECTORY)}")


def write_affirmations_markdown(
    subject_affirmations: SubjectAffirmations,
) -> None:
    subject = subject_affirmations.subject
    output_directory = OUTPUT_DIRECTORY / f"affirmations/{subject.category.slug}"
    output_directory.mkdir(parents=True, exist_ok=True)
    output_filename = f"{subject.order}-{subject.slug}.md"
    output_path = output_directory / output_filename
    lines: list[str] = [f"# {subject.name} Affirmations\n"]
    for grammar_affirmations in subject_affirmations.grammars:
        lines.append(f"\n## {grammar_affirmations.grammar.name}\n")
        for i, affirmation in enumerate(grammar_affirmations.affirmations, start=1):
            lines.append(f"{i}. {affirmation.text}")
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"💾 Wrote affirmations Markdown to: {output_path.relative_to(PROJECT_DIRECTORY)}\n")
