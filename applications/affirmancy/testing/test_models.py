import json

import pytest

from src.grammars import PRESENT
from src.models import (
    Affirmation,
    GeneratedAffirmations,
    GrammarAffirmations,
    SubjectAffirmations,
    ValidationResult,
)
from src.subjects import TAROT_CARDS


@pytest.mark.unit
def test_affirmation_construction() -> None:
    affirmation = Affirmation(
        text="I am the fool, leaping into the unknown.",
    )
    assert affirmation.text == "I am the fool, leaping into the unknown."


@pytest.mark.unit
def test_affirmation_serialization_roundtrip() -> None:
    affirmation = Affirmation(
        text="I embrace new beginnings.",
    )
    json_str = affirmation.model_dump_json()
    parsed = json.loads(json_str)
    assert parsed["text"] == "I embrace new beginnings."


@pytest.mark.unit
def test_grammar_affirmations_construction() -> None:
    grammar = PRESENT
    affirmations = [
        Affirmation(
            text="I am free.",
        )
    ]
    grammar_affirmations = GrammarAffirmations(grammar=grammar, affirmations=affirmations)
    assert grammar_affirmations.grammar.name == grammar.name
    assert len(grammar_affirmations.affirmations) == 1


@pytest.mark.unit
def test_subject_affirmations_serialization() -> None:
    subject = TAROT_CARDS[0]  # The Fool
    grammar = PRESENT
    affirmations = [
        Affirmation(
            text="I trust the journey.",
        )
    ]
    subject_affirmations = SubjectAffirmations(
        subject=subject,
        grammars=[GrammarAffirmations(grammar=grammar, affirmations=affirmations)],
    )
    json_str = subject_affirmations.model_dump_json(indent=2)
    parsed = json.loads(json_str)
    assert "grammars" in parsed
    assert len(parsed["grammars"]) == 1
    assert parsed["grammars"][0]["affirmations"][0]["text"] == "I trust the journey."


@pytest.mark.unit
def test_generated_affirmations_construction() -> None:
    generated = GeneratedAffirmations(affirmations=["I am strong", "I am resilient", "I am brave"])
    assert len(generated.affirmations) == 3


@pytest.mark.unit
def test_generated_affirmations_strips_trailing_period() -> None:
    generated = GeneratedAffirmations(
        affirmations=["I am strong.", "I am resilient.", "I am brave."]
    )
    assert generated.affirmations == ["I am strong", "I am resilient", "I am brave"]


@pytest.mark.unit
def test_validation_result_valid() -> None:
    result = ValidationResult(valid=True, reason="Matches present tense first person.")
    assert result.valid is True
    assert result.reason is not None
    assert "present" in result.reason


@pytest.mark.unit
def test_validation_result_invalid() -> None:
    result = ValidationResult(valid=False, reason="Uses past tense instead of present.")
    assert result.valid is False


@pytest.mark.unit
def test_grammar_str_returns_slug() -> None:
    assert str(PRESENT) == PRESENT.slug
