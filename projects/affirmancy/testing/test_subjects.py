import pytest

from src.subjects import (
    ASTROLOGY_ASPECTS,
    ASTROLOGY_HOUSES,
    ASTROLOGY_SIGNS,
    CHAKRAS,
    ELEMENTS,
    HEBREW_LETTERS,
    LENORMAND_CARDS,
    NUMBERS,
    RUNES,
    SEPHIROTH,
    SUBJECTS,
    TAROT_CARDS,
    Subject,
    SubjectCategory,
)


@pytest.mark.unit
def test_subject_category_construction() -> None:
    category = SubjectCategory(name="Tarot Card", slug="tarot-card")
    assert category.name == "Tarot Card"
    assert category.slug == "tarot-card"


@pytest.mark.unit
def test_subject_construction() -> None:
    category = SubjectCategory(name="Tarot Card", slug="tarot-card")
    subject = Subject(name="The Fool", slug="the-fool", order=0, category=category)
    assert subject.name == "The Fool"
    assert subject.slug == "the-fool"
    assert subject.order == 0


@pytest.mark.unit
def test_subject_metadata_default_empty() -> None:
    category = SubjectCategory(name="Test", slug="test")
    subject = Subject(name="Test", slug="test", order=1, category=category)
    assert subject.metadata == {}


@pytest.mark.unit
def test_subject_with_metadata() -> None:
    aspect = ASTROLOGY_ASPECTS[0]  # Conjunction
    assert aspect.metadata["angle"] == 0
    assert aspect.metadata["fraction"] == "1/1"


@pytest.mark.unit
def test_tarot_cards_count() -> None:
    assert len(TAROT_CARDS) == 78


@pytest.mark.unit
def test_lenormand_cards_count() -> None:
    assert len(LENORMAND_CARDS) == 38


@pytest.mark.unit
def test_astrology_signs_count() -> None:
    assert len(ASTROLOGY_SIGNS) == 13


@pytest.mark.unit
def test_astrology_houses_count() -> None:
    assert len(ASTROLOGY_HOUSES) == 12


@pytest.mark.unit
def test_chakras_count() -> None:
    assert len(CHAKRAS) == 7


@pytest.mark.unit
def test_runes_count() -> None:
    assert len(RUNES) == 24


@pytest.mark.unit
def test_sephiroth_count() -> None:
    assert len(SEPHIROTH) == 10


@pytest.mark.unit
def test_hebrew_letters_count() -> None:
    assert len(HEBREW_LETTERS) == 22


@pytest.mark.unit
def test_elements_count() -> None:
    assert len(ELEMENTS) == 4


@pytest.mark.unit
def test_numbers_count() -> None:
    assert len(NUMBERS) == 32


@pytest.mark.unit
def test_subjects_contains_all_lists() -> None:
    assert len(SUBJECTS) > 0
    assert TAROT_CARDS[0] in SUBJECTS
    assert LENORMAND_CARDS[0] in SUBJECTS
    assert CHAKRAS[0] in SUBJECTS
    assert RUNES[0] in SUBJECTS


@pytest.mark.unit
def test_tarot_first_card_is_the_fool() -> None:
    fool = TAROT_CARDS[0]
    assert fool.name == "The Fool"
    assert fool.order == 0
    assert fool.category.slug == "tarot-card"


@pytest.mark.unit
def test_hebrew_letters_have_metadata() -> None:
    aleph = HEBREW_LETTERS[0]
    assert aleph.metadata["letter"] == "א"
