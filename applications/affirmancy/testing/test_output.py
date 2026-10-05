from __future__ import annotations

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

import pytest

import src.output as output_module
from src.grammars import PRESENT
from src.models import Affirmation, GrammarAffirmations, SubjectAffirmations
from src.output import (
    write_affirmations_document_markdown,
    write_affirmations_json,
    write_affirmations_markdown,
    write_semantics_document_markdown,
)
from src.subjects import TAROT_CARDS


@pytest.fixture()
def output_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    out = tmp_path / "output"
    monkeypatch.setattr(output_module, "PROJECT_DIRECTORY", tmp_path)
    monkeypatch.setattr(output_module, "OUTPUT_DIRECTORY", out)
    return out


def _make_subject_affirmations() -> SubjectAffirmations:
    subject = TAROT_CARDS[0]  # The Fool
    grammar = PRESENT
    affirmations = [
        Affirmation(
            text=f"I am affirmation {i}.",
        )
        for i in range(1, 4)
    ]
    grammar_affirmations = GrammarAffirmations(grammar=grammar, affirmations=affirmations)
    return SubjectAffirmations(subject=subject, grammars=[grammar_affirmations])


@pytest.mark.unit
def test_write_affirmations_json_creates_file(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_json(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.json"
    )
    assert output_file.exists()


@pytest.mark.unit
def test_write_affirmations_json_valid_json(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_json(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.json"
    )
    parsed = json.loads(output_file.read_text())
    assert "grammars" in parsed
    assert len(parsed["grammars"]) == 1


@pytest.mark.unit
def test_write_affirmations_markdown_creates_file(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_markdown(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.md"
    )
    assert output_file.exists()


@pytest.mark.unit
def test_write_affirmations_markdown_heading(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_markdown(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.md"
    )
    content = output_file.read_text()
    assert f"# {subject.name} Affirmations" in content


@pytest.mark.unit
def test_write_affirmations_markdown_grammar_subheading(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_markdown(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.md"
    )
    content = output_file.read_text()
    assert f"## {PRESENT.name}" in content


@pytest.mark.unit
def test_write_affirmations_markdown_numbered_list(output_dir: Path) -> None:
    subject_affirmations = _make_subject_affirmations()
    write_affirmations_markdown(subject_affirmations)
    subject = subject_affirmations.subject
    output_file = (
        output_dir
        / "affirmations"
        / f"{subject.category.slug}"
        / f"{subject.order}-{subject.slug}.md"
    )
    content = output_file.read_text()
    assert "1. I am affirmation 1." in content
    assert "2. I am affirmation 2." in content
    assert "3. I am affirmation 3." in content


@pytest.mark.unit
def test_write_document_creates_file(output_dir: Path) -> None:
    subject = TAROT_CARDS[0]  # The Fool
    expected_file = (
        output_dir
        / "affirmations"
        / "documents"
        / subject.category.slug
        / f"{subject.order}-{subject.slug}.md"
    )
    write_affirmations_document_markdown(subject, "# The Fool\nContent here.")
    assert expected_file.exists()
    assert "# The Fool" in expected_file.read_text()


@pytest.mark.unit
def test_write_semantics_document_markdown_creates_file(output_dir: Path) -> None:
    subject = TAROT_CARDS[0]  # The Fool
    expected_file = (
        output_dir
        / "semantic-documents"
        / subject.category.slug
        / f"{subject.order}-{subject.slug}.md"
    )
    write_semantics_document_markdown(subject, "# The Fool\nSemantics here.")
    assert expected_file.exists()


@pytest.mark.unit
def test_write_semantics_document_markdown_content(output_dir: Path) -> None:
    subject = TAROT_CARDS[0]  # The Fool
    write_semantics_document_markdown(subject, "# The Fool\nSemantics here.")
    output_file = (
        output_dir
        / "semantic-documents"
        / subject.category.slug
        / f"{subject.order}-{subject.slug}.md"
    )
    assert "# The Fool" in output_file.read_text()
    assert "Semantics here." in output_file.read_text()


@pytest.mark.unit
def test_write_semantics_document_markdown_strips_fences(output_dir: Path) -> None:
    subject = TAROT_CARDS[0]  # The Fool
    write_semantics_document_markdown(subject, "```markdown\n# The Fool\nContent.\n```")
    output_file = (
        output_dir
        / "semantic-documents"
        / subject.category.slug
        / f"{subject.order}-{subject.slug}.md"
    )
    content = output_file.read_text()
    assert "```" not in content
    assert "# The Fool" in content
