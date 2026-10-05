import pytest

from src.grammars import (
    FUTURE,
    PAST,
    PERFECT_PROGRESSIVE,
    PRESENT,
    Aspect,
    Form,
    Grammar,
    Mood,
    Number,
    Person,
    Tense,
    Voice,
)


@pytest.mark.unit
def test_grammar_name_includes_emoji() -> None:
    assert PRESENT.name.startswith("⭐")


@pytest.mark.unit
def test_grammar_name_title_case() -> None:
    assert "Indicative" in PRESENT.name
    assert "Present" in PRESENT.name


@pytest.mark.unit
def test_grammar_slug_kebab_case() -> None:
    slug = PRESENT.slug
    assert slug == slug.lower()
    assert " " not in slug
    assert "_" not in slug


@pytest.mark.unit
def test_grammar_str_returns_slug() -> None:
    assert str(PRESENT) == PRESENT.slug


@pytest.mark.unit
def test_grammar_specifiers_omit_none() -> None:
    minimal = Grammar(
        emoji="🔹", description="A minimal grammar.", examples=["I am."], mood=Mood.INDICATIVE
    )
    assert minimal.specifiers == ["INDICATIVE"]


@pytest.mark.unit
def test_grammar_specifiers_full() -> None:
    specifiers = PRESENT.specifiers
    assert "FINITE" in specifiers
    assert "INDICATIVE" in specifiers
    assert "ACTIVE" in specifiers
    assert "PRESENT" in specifiers
    assert "SIMPLE" in specifiers
    assert "FIRST" in specifiers
    assert "SINGULAR" in specifiers


@pytest.mark.unit
def test_past_grammar_tense() -> None:
    assert PAST.tense == Tense.PAST
    assert PAST.mood == Mood.INDICATIVE


@pytest.mark.unit
def test_future_grammar_tense() -> None:
    assert FUTURE.tense == Tense.FUTURE
    assert FUTURE.aspect == Aspect.SIMPLE


@pytest.mark.unit
def test_perfect_progressive_grammar() -> None:
    assert PERFECT_PROGRESSIVE.aspect == Aspect.PERFECT_PROGRESSIVE
    assert PERFECT_PROGRESSIVE.tense == Tense.PRESENT


@pytest.mark.unit
def test_all_predefined_grammars_have_examples() -> None:
    for grammar in [PAST, PRESENT, FUTURE, PERFECT_PROGRESSIVE]:
        assert len(grammar.examples) >= 3


@pytest.mark.unit
def test_grammar_slug_matches_specifiers() -> None:
    grammar = Grammar(
        emoji="🔹",
        description="A full grammar.",
        examples=["I am here."],
        form=Form.FINITE,
        mood=Mood.INDICATIVE,
        voice=Voice.ACTIVE,
        tense=Tense.PRESENT,
        aspect=Aspect.SIMPLE,
        person=Person.FIRST,
        number=Number.SINGULAR,
    )
    assert grammar.slug == "finite-indicative-active-present-simple-first-singular"


@pytest.mark.unit
def test_described_enum_examples_property() -> None:
    examples = Mood.INDICATIVE.examples
    assert len(examples) == 6
    assert all(isinstance(ex, str) for ex in examples)


@pytest.mark.unit
def test_specifier_descriptions_first_person_plural() -> None:
    grammar = Grammar(
        emoji="🔹",
        description="First person plural grammar.",
        examples=["We are {adjective}.", "We {verb}.", "We will {verb}."],
        mood=Mood.INDICATIVE,
        person=Person.FIRST,
        number=Number.PLURAL,
    )
    assert "Subject is 'we' (first person plural)." in grammar.specifier_descriptions


@pytest.mark.unit
def test_specifier_descriptions_non_first_person() -> None:
    grammar = Grammar(
        emoji="🔹",
        description="Second person grammar.",
        examples=["You are {adjective}.", "You {verb}.", "You will {verb}."],
        mood=Mood.INDICATIVE,
        person=Person.SECOND,
        number=Number.SINGULAR,
    )
    assert Person.SECOND.description in grammar.specifier_descriptions
