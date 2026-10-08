"""Spiritual practice configuration: topics and affirmation grammatical structures."""

from pydantic import BaseModel

type Primitive = str | int | float | bool | None


class SubjectCategory(BaseModel):
    name: str
    slug: str


class Subject(BaseModel):
    category: SubjectCategory
    metadata: dict[str, Primitive] = {}
    name: str
    order: int
    slug: str


_TAROT_CARD = SubjectCategory(name="Tarot Card", slug="tarot-card")
_LENORMAND = SubjectCategory(name="Lenormand", slug="lenormand")
_ASTROLOGY_SIGN = SubjectCategory(name="Astrology Sign", slug="astrology-sign")
_ASTROLOGY_PLANET = SubjectCategory(name="Astrology Planet", slug="astrology-planet")
_ASTROLOGY_NODE = SubjectCategory(name="Astrology Node", slug="astrology-node")
_ASTROLOGY_ASTEROID = SubjectCategory(name="Astrology Asteroid", slug="astrology-asteroid")
_ASTROLOGY_ASPECT = SubjectCategory(name="Astrology Aspect", slug="astrology-aspect")
_ASTROLOGY_HOUSE = SubjectCategory(name="Astrology House", slug="astrology-house")
_MODALITY = SubjectCategory(name="Modality", slug="modality")
_POLARITY = SubjectCategory(name="Polarity", slug="polarity")
_CHAKRA = SubjectCategory(name="Chakra", slug="chakra")
_RUNE = SubjectCategory(name="Rune", slug="rune")
_SEPHIROTH = SubjectCategory(name="Sephiroth", slug="sephiroth")
_HEBREW_LETTER = SubjectCategory(name="Hebrew Letter", slug="hebrew-letter")
_KABBALAH_WORLD = SubjectCategory(name="Kabbalah World", slug="kabbalah-world")
_SOLFEGGIO = SubjectCategory(name="Solfeggio", slug="solfeggio")
_WEEKDAY = SubjectCategory(name="Weekday", slug="weekday")
_ELEMENT = SubjectCategory(name="Element", slug="element")
_COLOR = SubjectCategory(name="Color", slug="color")
_GEMSTONE = SubjectCategory(name="Gemstone", slug="gemstone")
_METAL = SubjectCategory(name="Metal", slug="metal")
_NUMBER = SubjectCategory(name="Number", slug="number")


TAROT_CARDS: list[Subject] = [
    Subject(name="The Fool", slug="the-fool", order=0, category=_TAROT_CARD),
    Subject(name="The Magician", slug="the-magician", order=1, category=_TAROT_CARD),
    Subject(name="The High Priestess", slug="the-high-priestess", order=2, category=_TAROT_CARD),
    Subject(name="The Empress", slug="the-empress", order=3, category=_TAROT_CARD),
    Subject(name="The Emperor", slug="the-emperor", order=4, category=_TAROT_CARD),
    Subject(name="The Hierophant", slug="the-hierophant", order=5, category=_TAROT_CARD),
    Subject(name="The Lovers", slug="the-lovers", order=6, category=_TAROT_CARD),
    Subject(name="The Chariot", slug="the-chariot", order=7, category=_TAROT_CARD),
    Subject(name="Strength", slug="strength", order=8, category=_TAROT_CARD),
    Subject(name="The Hermit", slug="the-hermit", order=9, category=_TAROT_CARD),
    Subject(name="Wheel of Fortune", slug="wheel-of-fortune", order=10, category=_TAROT_CARD),
    Subject(name="Justice", slug="justice", order=11, category=_TAROT_CARD),
    Subject(name="The Hanged Man", slug="the-hanged-man", order=12, category=_TAROT_CARD),
    Subject(name="Death", slug="death", order=13, category=_TAROT_CARD),
    Subject(name="Temperance", slug="temperance", order=14, category=_TAROT_CARD),
    Subject(name="The Devil", slug="the-devil", order=15, category=_TAROT_CARD),
    Subject(name="The Tower", slug="the-tower", order=16, category=_TAROT_CARD),
    Subject(name="The Star", slug="the-star", order=17, category=_TAROT_CARD),
    Subject(name="The Moon", slug="the-moon", order=18, category=_TAROT_CARD),
    Subject(name="The Sun", slug="the-sun", order=19, category=_TAROT_CARD),
    Subject(name="Judgment", slug="judgment", order=20, category=_TAROT_CARD),
    Subject(name="The World", slug="the-world", order=21, category=_TAROT_CARD),
    Subject(name="The Ace of Wands", slug="the-ace-of-wands", order=22, category=_TAROT_CARD),
    Subject(name="The Two of Wands", slug="the-two-of-wands", order=23, category=_TAROT_CARD),
    Subject(name="The Three of Wands", slug="the-three-of-wands", order=24, category=_TAROT_CARD),
    Subject(name="The Four of Wands", slug="the-four-of-wands", order=25, category=_TAROT_CARD),
    Subject(name="The Five of Wands", slug="the-five-of-wands", order=26, category=_TAROT_CARD),
    Subject(name="The Six of Wands", slug="the-six-of-wands", order=27, category=_TAROT_CARD),
    Subject(name="The Seven of Wands", slug="the-seven-of-wands", order=28, category=_TAROT_CARD),
    Subject(name="The Eight of Wands", slug="the-eight-of-wands", order=29, category=_TAROT_CARD),
    Subject(name="The Nine of Wands", slug="the-nine-of-wands", order=30, category=_TAROT_CARD),
    Subject(name="The Ten of Wands", slug="the-ten-of-wands", order=31, category=_TAROT_CARD),
    Subject(name="The Page of Wands", slug="the-page-of-wands", order=32, category=_TAROT_CARD),
    Subject(name="The Knight of Wands", slug="the-knight-of-wands", order=33, category=_TAROT_CARD),
    Subject(name="The Queen of Wands", slug="the-queen-of-wands", order=34, category=_TAROT_CARD),
    Subject(name="The King of Wands", slug="the-king-of-wands", order=35, category=_TAROT_CARD),
    Subject(name="The Ace of Cups", slug="the-ace-of-cups", order=36, category=_TAROT_CARD),
    Subject(name="The Two of Cups", slug="the-two-of-cups", order=37, category=_TAROT_CARD),
    Subject(name="The Three of Cups", slug="the-three-of-cups", order=38, category=_TAROT_CARD),
    Subject(name="The Four of Cups", slug="the-four-of-cups", order=39, category=_TAROT_CARD),
    Subject(name="The Five of Cups", slug="the-five-of-cups", order=40, category=_TAROT_CARD),
    Subject(name="The Six of Cups", slug="the-six-of-cups", order=41, category=_TAROT_CARD),
    Subject(name="The Seven of Cups", slug="the-seven-of-cups", order=42, category=_TAROT_CARD),
    Subject(name="The Eight of Cups", slug="the-eight-of-cups", order=43, category=_TAROT_CARD),
    Subject(name="The Nine of Cups", slug="the-nine-of-cups", order=44, category=_TAROT_CARD),
    Subject(name="The Ten of Cups", slug="the-ten-of-cups", order=45, category=_TAROT_CARD),
    Subject(name="The Page of Cups", slug="the-page-of-cups", order=46, category=_TAROT_CARD),
    Subject(name="The Knight of Cups", slug="the-knight-of-cups", order=47, category=_TAROT_CARD),
    Subject(name="The Queen of Cups", slug="the-queen-of-cups", order=48, category=_TAROT_CARD),
    Subject(name="The King of Cups", slug="the-king-of-cups", order=49, category=_TAROT_CARD),
    Subject(name="The Ace of Swords", slug="the-ace-of-swords", order=50, category=_TAROT_CARD),
    Subject(name="The Two of Swords", slug="the-two-of-swords", order=51, category=_TAROT_CARD),
    Subject(name="The Three of Swords", slug="the-three-of-swords", order=52, category=_TAROT_CARD),
    Subject(name="The Four of Swords", slug="the-four-of-swords", order=53, category=_TAROT_CARD),
    Subject(name="The Five of Swords", slug="the-five-of-swords", order=54, category=_TAROT_CARD),
    Subject(name="The Six of Swords", slug="the-six-of-swords", order=55, category=_TAROT_CARD),
    Subject(name="The Seven of Swords", slug="the-seven-of-swords", order=56, category=_TAROT_CARD),
    Subject(name="The Eight of Swords", slug="the-eight-of-swords", order=57, category=_TAROT_CARD),
    Subject(name="The Nine of Swords", slug="the-nine-of-swords", order=58, category=_TAROT_CARD),
    Subject(name="The Ten of Swords", slug="the-ten-of-swords", order=59, category=_TAROT_CARD),
    Subject(name="The Page of Swords", slug="the-page-of-swords", order=60, category=_TAROT_CARD),
    Subject(
        name="The Knight of Swords", slug="the-knight-of-swords", order=61, category=_TAROT_CARD
    ),
    Subject(name="The Queen of Swords", slug="the-queen-of-swords", order=62, category=_TAROT_CARD),
    Subject(name="The King of Swords", slug="the-king-of-swords", order=63, category=_TAROT_CARD),
    Subject(
        name="The Ace of Pentacles", slug="the-ace-of-pentacles", order=64, category=_TAROT_CARD
    ),
    Subject(
        name="The Two of Pentacles", slug="the-two-of-pentacles", order=65, category=_TAROT_CARD
    ),
    Subject(
        name="The Three of Pentacles", slug="the-three-of-pentacles", order=66, category=_TAROT_CARD
    ),
    Subject(
        name="The Four of Pentacles", slug="the-four-of-pentacles", order=67, category=_TAROT_CARD
    ),
    Subject(
        name="The Five of Pentacles", slug="the-five-of-pentacles", order=68, category=_TAROT_CARD
    ),
    Subject(
        name="The Six of Pentacles", slug="the-six-of-pentacles", order=69, category=_TAROT_CARD
    ),
    Subject(
        name="The Seven of Pentacles", slug="the-seven-of-pentacles", order=70, category=_TAROT_CARD
    ),
    Subject(
        name="The Eight of Pentacles", slug="the-eight-of-pentacles", order=71, category=_TAROT_CARD
    ),
    Subject(
        name="The Nine of Pentacles", slug="the-nine-of-pentacles", order=72, category=_TAROT_CARD
    ),
    Subject(
        name="The Ten of Pentacles", slug="the-ten-of-pentacles", order=73, category=_TAROT_CARD
    ),
    Subject(
        name="The Page of Pentacles", slug="the-page-of-pentacles", order=74, category=_TAROT_CARD
    ),
    Subject(
        name="The Knight of Pentacles",
        slug="the-knight-of-pentacles",
        order=75,
        category=_TAROT_CARD,
    ),
    Subject(
        name="The Queen of Pentacles", slug="the-queen-of-pentacles", order=76, category=_TAROT_CARD
    ),
    Subject(
        name="The King of Pentacles", slug="the-king-of-pentacles", order=77, category=_TAROT_CARD
    ),
]

LENORMAND_CARDS: list[Subject] = [
    Subject(name="Rider", slug="rider", order=1, category=_LENORMAND),
    Subject(name="Clover", slug="clover", order=2, category=_LENORMAND),
    Subject(name="Ship", slug="ship", order=3, category=_LENORMAND),
    Subject(name="House", slug="house", order=4, category=_LENORMAND),
    Subject(name="Tree", slug="tree", order=5, category=_LENORMAND),
    Subject(name="Clouds", slug="clouds", order=6, category=_LENORMAND),
    Subject(name="Snake", slug="snake", order=7, category=_LENORMAND),
    Subject(name="Coffin", slug="coffin", order=8, category=_LENORMAND),
    Subject(name="Bouquet", slug="bouquet", order=9, category=_LENORMAND),
    Subject(name="Scythe", slug="scythe", order=10, category=_LENORMAND),
    Subject(name="Whip", slug="whip", order=11, category=_LENORMAND),
    Subject(name="Birds", slug="birds", order=12, category=_LENORMAND),
    Subject(name="Child", slug="child", order=13, category=_LENORMAND),
    Subject(name="Fox", slug="fox", order=14, category=_LENORMAND),
    Subject(name="Bear", slug="bear", order=15, category=_LENORMAND),
    Subject(name="Stars", slug="stars", order=16, category=_LENORMAND),
    Subject(name="Stork", slug="stork", order=17, category=_LENORMAND),
    Subject(name="Dog", slug="dog", order=18, category=_LENORMAND),
    Subject(name="Tower", slug="tower", order=19, category=_LENORMAND),
    Subject(name="Garden", slug="garden", order=20, category=_LENORMAND),
    Subject(name="Mountain", slug="mountain", order=21, category=_LENORMAND),
    Subject(name="Crossroads", slug="crossroads", order=22, category=_LENORMAND),
    Subject(name="Mice", slug="mice", order=23, category=_LENORMAND),
    Subject(name="Heart", slug="heart", order=24, category=_LENORMAND),
    Subject(name="Ring", slug="ring", order=25, category=_LENORMAND),
    Subject(name="Book", slug="book", order=26, category=_LENORMAND),
    Subject(name="Letter", slug="letter", order=27, category=_LENORMAND),
    Subject(name="Man", slug="man", order=28, category=_LENORMAND),
    Subject(name="Gentleman", slug="gentleman", order=29, category=_LENORMAND),
    Subject(name="Woman", slug="woman", order=30, category=_LENORMAND),
    Subject(name="Lady", slug="lady", order=31, category=_LENORMAND),
    Subject(name="Lily", slug="lily", order=32, category=_LENORMAND),
    Subject(name="Sun", slug="sun", order=33, category=_LENORMAND),
    Subject(name="Moon", slug="moon", order=34, category=_LENORMAND),
    Subject(name="Key", slug="key", order=35, category=_LENORMAND),
    Subject(name="Fish", slug="fish", order=36, category=_LENORMAND),
    Subject(name="Anchor", slug="anchor", order=37, category=_LENORMAND),
    Subject(name="Cross", slug="cross", order=38, category=_LENORMAND),
]

ASTROLOGY_SIGNS: list[Subject] = [
    Subject(name="Aries", slug="aries", order=1, category=_ASTROLOGY_SIGN),
    Subject(name="Taurus", slug="taurus", order=2, category=_ASTROLOGY_SIGN),
    Subject(name="Gemini", slug="gemini", order=3, category=_ASTROLOGY_SIGN),
    Subject(name="Cancer", slug="cancer", order=4, category=_ASTROLOGY_SIGN),
    Subject(name="Leo", slug="leo", order=5, category=_ASTROLOGY_SIGN),
    Subject(name="Virgo", slug="virgo", order=6, category=_ASTROLOGY_SIGN),
    Subject(name="Libra", slug="libra", order=7, category=_ASTROLOGY_SIGN),
    Subject(name="Scorpio", slug="scorpio", order=8, category=_ASTROLOGY_SIGN),
    Subject(name="Sagittarius", slug="sagittarius", order=9, category=_ASTROLOGY_SIGN),
    Subject(name="Capricorn", slug="capricorn", order=10, category=_ASTROLOGY_SIGN),
    Subject(name="Aquarius", slug="aquarius", order=11, category=_ASTROLOGY_SIGN),
    Subject(name="Pisces", slug="pisces", order=12, category=_ASTROLOGY_SIGN),
    Subject(name="Ophiuchus", slug="ophiuchus", order=13, category=_ASTROLOGY_SIGN),
]

ASTROLOGY_PLANETS: list[Subject] = [
    Subject(name="Sun", slug="sun", order=1, category=_ASTROLOGY_PLANET),
    Subject(name="Moon", slug="moon", order=2, category=_ASTROLOGY_PLANET),
    Subject(name="Mercury", slug="mercury", order=3, category=_ASTROLOGY_PLANET),
    Subject(name="Venus", slug="venus", order=4, category=_ASTROLOGY_PLANET),
    Subject(name="Mars", slug="mars", order=5, category=_ASTROLOGY_PLANET),
    Subject(name="Jupiter", slug="jupiter", order=6, category=_ASTROLOGY_PLANET),
    Subject(name="Saturn", slug="saturn", order=7, category=_ASTROLOGY_PLANET),
    Subject(name="Uranus", slug="uranus", order=8, category=_ASTROLOGY_PLANET),
    Subject(name="Neptune", slug="neptune", order=9, category=_ASTROLOGY_PLANET),
    Subject(name="Pluto", slug="pluto", order=10, category=_ASTROLOGY_PLANET),
]

ASTROLOGY_ASTEROIDS: list[Subject] = [
    Subject(name="Chiron", slug="chiron", order=1, category=_ASTROLOGY_ASTEROID),
    Subject(name="Lilith", slug="lilith", order=2, category=_ASTROLOGY_ASTEROID),
    Subject(name="Ceres", slug="ceres", order=3, category=_ASTROLOGY_ASTEROID),
    Subject(name="Pallas", slug="pallas", order=4, category=_ASTROLOGY_ASTEROID),
    Subject(name="Juno", slug="juno", order=5, category=_ASTROLOGY_ASTEROID),
    Subject(name="Vesta", slug="vesta", order=6, category=_ASTROLOGY_ASTEROID),
]

ASTROLOGY_NODES: list[Subject] = [
    Subject(name="North Node", slug="north-node", order=1, category=_ASTROLOGY_NODE),
    Subject(name="South Node", slug="south-node", order=2, category=_ASTROLOGY_NODE),
]

ASTROLOGY_ASPECTS: list[Subject] = [
    Subject(
        name="Conjunction",
        slug="conjunction",
        order=1,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 0, "fraction": "1/1"},
    ),
    Subject(
        name="Sextile",
        slug="sextile",
        order=2,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 60, "fraction": "1/6"},
    ),
    Subject(
        name="Square",
        slug="square",
        order=3,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 90, "fraction": "1/4"},
    ),
    Subject(
        name="Trine",
        slug="trine",
        order=4,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 120, "fraction": "1/3"},
    ),
    Subject(
        name="Opposition",
        slug="opposition",
        order=5,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 180, "fraction": "1/2"},
    ),
    Subject(
        name="Quincunx",
        slug="quincunx",
        order=6,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 150, "fraction": "5/12"},
    ),
    Subject(
        name="Semisextile",
        slug="semisextile",
        order=7,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 30, "fraction": "1/12"},
    ),
    Subject(
        name="Semisquare",
        slug="semisquare",
        order=8,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 45, "fraction": "1/8"},
    ),
    Subject(
        name="Sesquiquadrate",
        slug="sesquiquadrate",
        order=9,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 135, "fraction": "3/8"},
    ),
    Subject(
        name="Quintile",
        slug="quintile",
        order=10,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 72, "fraction": "1/5"},
    ),
    Subject(
        name="Biquintile",
        slug="biquintile",
        order=11,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 144, "fraction": "2/5"},
    ),
    Subject(
        name="Novile",
        slug="novile",
        order=12,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 40, "fraction": "1/9"},
    ),
    Subject(
        name="Binovile",
        slug="binovile",
        order=13,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 80, "fraction": "2/9"},
    ),
    Subject(
        name="Tredecile",
        slug="tredecile",
        order=14,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 120, "fraction": "1/3"},
    ),
    Subject(
        name="Septile",
        slug="septile",
        order=15,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 51.43, "fraction": "1/7"},
    ),
    Subject(
        name="Biseptile",
        slug="biseptile",
        order=16,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 102.86, "fraction": "2/7"},
    ),
    Subject(
        name="Tredecile",
        slug="tredecile",
        order=17,
        category=_ASTROLOGY_ASPECT,
        metadata={"angle": 128.57, "fraction": "3/7"},
    ),
]

ASTROLOGY_HOUSES: list[Subject] = [
    Subject(name="First House (Ascendant)", slug="first-house", order=1, category=_ASTROLOGY_HOUSE),
    Subject(name="Second House", slug="second-house", order=2, category=_ASTROLOGY_HOUSE),
    Subject(name="Third House", slug="third-house", order=3, category=_ASTROLOGY_HOUSE),
    Subject(
        name="Fourth House (Imum Coeli)", slug="fourth-house", order=4, category=_ASTROLOGY_HOUSE
    ),
    Subject(name="Fifth House", slug="fifth-house", order=5, category=_ASTROLOGY_HOUSE),
    Subject(name="Sixth House", slug="sixth-house", order=6, category=_ASTROLOGY_HOUSE),
    Subject(
        name="Seventh House (Descendant)", slug="seventh-house", order=7, category=_ASTROLOGY_HOUSE
    ),
    Subject(name="Eighth House", slug="eighth-house", order=8, category=_ASTROLOGY_HOUSE),
    Subject(name="Ninth House", slug="ninth-house", order=9, category=_ASTROLOGY_HOUSE),
    Subject(
        name="Tenth House (Medium Coeli)", slug="tenth-house", order=10, category=_ASTROLOGY_HOUSE
    ),
    Subject(name="Eleventh House", slug="eleventh-house", order=11, category=_ASTROLOGY_HOUSE),
    Subject(name="Twelfth House", slug="twelfth-house", order=12, category=_ASTROLOGY_HOUSE),
]

MODALITIES: list[Subject] = [
    Subject(name="Cardinal", slug="cardinal", order=1, category=_MODALITY),
    Subject(name="Fixed", slug="fixed", order=2, category=_MODALITY),
    Subject(name="Mutable", slug="mutable", order=3, category=_MODALITY),
]

POLARITIES: list[Subject] = [
    Subject(name="Negative", slug="negative", order=0, category=_POLARITY),
    Subject(name="Positive", slug="positive", order=1, category=_POLARITY),
]

CHAKRAS: list[Subject] = [
    Subject(name="Root Chakra (Muladhara)", slug="root", order=1, category=_CHAKRA),
    Subject(name="Sacral Chakra (Svadhisthana)", slug="sacral", order=2, category=_CHAKRA),
    Subject(name="Solar Plexus Chakra (Manipura)", slug="solar-plexus", order=3, category=_CHAKRA),
    Subject(name="Heart Chakra (Anahata)", slug="heart", order=4, category=_CHAKRA),
    Subject(name="Throat Chakra (Vishuddha)", slug="throat", order=5, category=_CHAKRA),
    Subject(name="Third Eye Chakra (Ajna)", slug="third-eye", order=6, category=_CHAKRA),
    Subject(name="Crown Chakra (Sahasrara)", slug="crown", order=7, category=_CHAKRA),
]

RUNES: list[Subject] = [
    Subject(name="Fehu (Wealth)", slug="fehu", order=1, category=_RUNE),
    Subject(name="Uruz (Strength)", slug="uruz", order=2, category=_RUNE),
    Subject(name="Thurisaz (Protection)", slug="thurisaz", order=3, category=_RUNE),
    Subject(name="Ansuz (Wisdom)", slug="ansuz", order=4, category=_RUNE),
    Subject(name="Raidho (Journey)", slug="raidho", order=5, category=_RUNE),
    Subject(name="Kenaz (Knowledge)", slug="kenaz", order=6, category=_RUNE),
    Subject(name="Gebo (Partnership)", slug="gebo", order=7, category=_RUNE),
    Subject(name="Wunjo (Joy)", slug="wunjo", order=8, category=_RUNE),
    Subject(name="Hagalaz (Transformation)", slug="hagalaz", order=9, category=_RUNE),
    Subject(name="Nauthiz (Need)", slug="nauthiz", order=10, category=_RUNE),
    Subject(name="Isa (Stillness)", slug="isa", order=11, category=_RUNE),
    Subject(name="Jera (Harvest)", slug="jera", order=12, category=_RUNE),
    Subject(name="Eihwaz (Connection)", slug="eihwaz", order=13, category=_RUNE),
    Subject(name="Perth (Mystery)", slug="perth", order=14, category=_RUNE),
    Subject(name="Algiz (Protection)", slug="algiz", order=15, category=_RUNE),
    Subject(name="Sowilo (Success)", slug="sowilo", order=16, category=_RUNE),
    Subject(name="Tiwaz (Victory)", slug="tiwaz", order=17, category=_RUNE),
    Subject(name="Berkano (Growth)", slug="berkano", order=18, category=_RUNE),
    Subject(name="Ehwaz (Movement)", slug="ehwaz", order=19, category=_RUNE),
    Subject(name="Mannaz (Humanity)", slug="mannaz", order=20, category=_RUNE),
    Subject(name="Laguz (Flow)", slug="laguz", order=21, category=_RUNE),
    Subject(name="Ingwaz (Potential)", slug="ingwaz", order=22, category=_RUNE),
    Subject(name="Dagaz (Breakthrough)", slug="dagaz", order=23, category=_RUNE),
    Subject(name="Othala (Heritage)", slug="othala", order=24, category=_RUNE),
]

SEPHIROTH: list[Subject] = [
    Subject(name="Kether (Crown)", slug="kether", order=1, category=_SEPHIROTH),
    Subject(name="Chokmah (Wisdom)", slug="chokmah", order=2, category=_SEPHIROTH),
    Subject(name="Binah (Understanding)", slug="binah", order=3, category=_SEPHIROTH),
    Subject(name="Chesed (Mercy)", slug="chesed", order=4, category=_SEPHIROTH),
    Subject(name="Geburah (Strength)", slug="geburah", order=5, category=_SEPHIROTH),
    Subject(name="Tiphareth (Beauty)", slug="tiphareth", order=6, category=_SEPHIROTH),
    Subject(name="Netzach (Victory)", slug="netzach", order=7, category=_SEPHIROTH),
    Subject(name="Hod (Splendor)", slug="hod", order=8, category=_SEPHIROTH),
    Subject(name="Yesod (Foundation)", slug="yesod", order=9, category=_SEPHIROTH),
    Subject(name="Malkuth (Kingdom)", slug="malkuth", order=10, category=_SEPHIROTH),
]

HEBREW_LETTERS: list[Subject] = [
    Subject(name="Aleph", slug="aleph", order=1, category=_HEBREW_LETTER, metadata={"letter": "א"}),
    Subject(name="Beth", slug="beth", order=2, category=_HEBREW_LETTER, metadata={"letter": "ב"}),
    Subject(name="Gimel", slug="gimel", order=3, category=_HEBREW_LETTER, metadata={"letter": "ג"}),
    Subject(
        name="Daleth", slug="daleth", order=4, category=_HEBREW_LETTER, metadata={"letter": "ד"}
    ),
    Subject(name="He", slug="he", order=5, category=_HEBREW_LETTER, metadata={"letter": "ה"}),
    Subject(name="Vav", slug="vav", order=6, category=_HEBREW_LETTER, metadata={"letter": "ו"}),
    Subject(name="Zayin", slug="zayin", order=7, category=_HEBREW_LETTER, metadata={"letter": "ז"}),
    Subject(name="Chet", slug="chet", order=8, category=_HEBREW_LETTER, metadata={"letter": "ח"}),
    Subject(name="Tet", slug="tet", order=9, category=_HEBREW_LETTER, metadata={"letter": "ט"}),
    Subject(name="Yod", slug="yod", order=10, category=_HEBREW_LETTER, metadata={"letter": "י"}),
    Subject(name="Kaf", slug="kaf", order=11, category=_HEBREW_LETTER, metadata={"letter": "כ"}),
    Subject(
        name="Lamed", slug="lamed", order=12, category=_HEBREW_LETTER, metadata={"letter": "ל"}
    ),
    Subject(name="Mem", slug="mem", order=13, category=_HEBREW_LETTER, metadata={"letter": "מ"}),
    Subject(name="Nun", slug="nun", order=14, category=_HEBREW_LETTER, metadata={"letter": "נ"}),
    Subject(
        name="Samekh", slug="samekh", order=15, category=_HEBREW_LETTER, metadata={"letter": "ס"}
    ),
    Subject(name="Ayin", slug="ayin", order=16, category=_HEBREW_LETTER, metadata={"letter": "ע"}),
    Subject(name="Pe", slug="pe", order=17, category=_HEBREW_LETTER, metadata={"letter": "פ"}),
    Subject(
        name="Tsadi", slug="tsadi", order=18, category=_HEBREW_LETTER, metadata={"letter": "צ"}
    ),
    Subject(name="Qof", slug="qof", order=19, category=_HEBREW_LETTER, metadata={"letter": "ק"}),
    Subject(name="Resh", slug="resh", order=20, category=_HEBREW_LETTER, metadata={"letter": "ר"}),
    Subject(name="Shin", slug="shin", order=21, category=_HEBREW_LETTER, metadata={"letter": "ש"}),
    Subject(name="Tav", slug="tav", order=22, category=_HEBREW_LETTER, metadata={"letter": "ת"}),
]

KABBALAH_WORLDS: list[Subject] = [
    Subject(name="Atziluth (Emanation)", slug="atziluth", order=1, category=_KABBALAH_WORLD),
    Subject(name="Briah (Creation)", slug="briah", order=2, category=_KABBALAH_WORLD),
    Subject(name="Yetzirah (Formation)", slug="yetzirah", order=3, category=_KABBALAH_WORLD),
    Subject(name="Assiah (Action)", slug="assiah", order=4, category=_KABBALAH_WORLD),
]

SOLFEGGIOS: list[Subject] = [
    Subject(name="Do", slug="do", order=1, category=_SOLFEGGIO),
    Subject(name="Re", slug="re", order=2, category=_SOLFEGGIO),
    Subject(name="Mi", slug="mi", order=3, category=_SOLFEGGIO),
    Subject(name="Fa", slug="fa", order=4, category=_SOLFEGGIO),
    Subject(name="Sol", slug="sol", order=5, category=_SOLFEGGIO),
    Subject(name="La", slug="la", order=6, category=_SOLFEGGIO),
    Subject(name="Ti", slug="ti", order=7, category=_SOLFEGGIO),
]

WEEKDAYS: list[Subject] = [
    Subject(name="Monday", slug="monday", order=1, category=_WEEKDAY),
    Subject(name="Tuesday", slug="tuesday", order=2, category=_WEEKDAY),
    Subject(name="Wednesday", slug="wednesday", order=3, category=_WEEKDAY),
    Subject(name="Thursday", slug="thursday", order=4, category=_WEEKDAY),
    Subject(name="Friday", slug="friday", order=5, category=_WEEKDAY),
    Subject(name="Saturday", slug="saturday", order=6, category=_WEEKDAY),
    Subject(name="Sunday", slug="sunday", order=7, category=_WEEKDAY),
]

ELEMENTS: list[Subject] = [
    Subject(name="Earth", slug="earth", order=1, category=_ELEMENT),
    Subject(name="Air", slug="air", order=2, category=_ELEMENT),
    Subject(name="Fire", slug="fire", order=3, category=_ELEMENT),
    Subject(name="Water", slug="water", order=4, category=_ELEMENT),
]

COLORS: list[Subject] = [
    Subject(name="Black", slug="black", order=1, category=_COLOR),
    Subject(name="White", slug="white", order=2, category=_COLOR),
    Subject(name="Red", slug="red", order=3, category=_COLOR),
    Subject(name="Orange", slug="orange", order=4, category=_COLOR),
    Subject(name="Yellow", slug="yellow", order=5, category=_COLOR),
    Subject(name="Green", slug="green", order=6, category=_COLOR),
    Subject(name="Blue", slug="blue", order=7, category=_COLOR),
    Subject(name="Indigo", slug="indigo", order=8, category=_COLOR),
    Subject(name="Violet", slug="violet", order=9, category=_COLOR),
    Subject(name="Pink", slug="pink", order=10, category=_COLOR),
    Subject(name="Brown", slug="brown", order=11, category=_COLOR),
    Subject(name="Gray", slug="gray", order=12, category=_COLOR),
]

GEMSTONES: list[Subject] = [
    Subject(name="Garnet", slug="garnet", order=1, category=_GEMSTONE),
    Subject(name="Amethyst", slug="amethyst", order=2, category=_GEMSTONE),
    Subject(name="Aquamarine", slug="aquamarine", order=3, category=_GEMSTONE),
    Subject(name="Diamond", slug="diamond", order=4, category=_GEMSTONE),
    Subject(name="Emerald", slug="emerald", order=5, category=_GEMSTONE),
    Subject(name="Pearl", slug="pearl", order=6, category=_GEMSTONE),
    Subject(name="Ruby", slug="ruby", order=7, category=_GEMSTONE),
    Subject(name="Peridot", slug="peridot", order=8, category=_GEMSTONE),
    Subject(name="Sapphire", slug="sapphire", order=9, category=_GEMSTONE),
    Subject(name="Opal", slug="opal", order=10, category=_GEMSTONE),
    Subject(name="Topaz", slug="topaz", order=11, category=_GEMSTONE),
    Subject(name="Turquoise", slug="turquoise", order=12, category=_GEMSTONE),
]

METALS: list[Subject] = [
    Subject(name="Gold", slug="gold", order=1, category=_METAL),
    Subject(name="Mercury", slug="mercury", order=2, category=_METAL),
    Subject(name="Copper", slug="copper", order=3, category=_METAL),
    Subject(name="Silver", slug="silver", order=4, category=_METAL),
    Subject(name="Iron", slug="iron", order=5, category=_METAL),
    Subject(name="Tin", slug="tin", order=6, category=_METAL),
    Subject(name="Lead", slug="lead", order=7, category=_METAL),
]

NUMBERS: list[Subject] = [
    Subject(name="One", slug="one", order=1, category=_NUMBER),
    Subject(name="Two", slug="two", order=2, category=_NUMBER),
    Subject(name="Three", slug="three", order=3, category=_NUMBER),
    Subject(name="Four", slug="four", order=4, category=_NUMBER),
    Subject(name="Five", slug="five", order=5, category=_NUMBER),
    Subject(name="Six", slug="six", order=6, category=_NUMBER),
    Subject(name="Seven", slug="seven", order=7, category=_NUMBER),
    Subject(name="Eight", slug="eight", order=8, category=_NUMBER),
    Subject(name="Nine", slug="nine", order=9, category=_NUMBER),
    Subject(name="Ten", slug="ten", order=10, category=_NUMBER),
    Subject(name="Eleven", slug="eleven", order=11, category=_NUMBER),
    Subject(name="Twelve", slug="twelve", order=12, category=_NUMBER),
    Subject(name="Thirteen", slug="thirteen", order=13, category=_NUMBER),
    Subject(name="Fourteen", slug="fourteen", order=14, category=_NUMBER),
    Subject(name="Fifteen", slug="fifteen", order=15, category=_NUMBER),
    Subject(name="Sixteen", slug="sixteen", order=16, category=_NUMBER),
    Subject(name="Seventeen", slug="seventeen", order=17, category=_NUMBER),
    Subject(name="Eighteen", slug="eighteen", order=18, category=_NUMBER),
    Subject(name="Nineteen", slug="nineteen", order=19, category=_NUMBER),
    Subject(name="Twenty", slug="twenty", order=20, category=_NUMBER),
    Subject(name="Twenty One", slug="twenty-one", order=21, category=_NUMBER),
    Subject(name="Twenty Two", slug="twenty-two", order=22, category=_NUMBER),
    Subject(name="Twenty Three", slug="twenty-three", order=23, category=_NUMBER),
    Subject(name="Twenty Four", slug="twenty-four", order=24, category=_NUMBER),
    Subject(name="Twenty Five", slug="twenty-five", order=25, category=_NUMBER),
    Subject(name="Twenty Six", slug="twenty-six", order=26, category=_NUMBER),
    Subject(name="Twenty Seven", slug="twenty-seven", order=27, category=_NUMBER),
    Subject(name="Twenty Eight", slug="twenty-eight", order=28, category=_NUMBER),
    Subject(name="Twenty Nine", slug="twenty-nine", order=29, category=_NUMBER),
    Subject(name="Thirty", slug="thirty", order=30, category=_NUMBER),
    Subject(name="Thirty One", slug="thirty-one", order=31, category=_NUMBER),
    Subject(name="Thirty Two", slug="thirty-two", order=32, category=_NUMBER),
]

SUBJECTS: list[Subject] = (
    TAROT_CARDS
    + LENORMAND_CARDS
    + ASTROLOGY_SIGNS
    + ASTROLOGY_PLANETS
    + ASTROLOGY_ASTEROIDS
    + ASTROLOGY_ASPECTS
    + ASTROLOGY_HOUSES
    + ELEMENTS
    + MODALITIES
    + POLARITIES
    + CHAKRAS
    + RUNES
    + SEPHIROTH
    + HEBREW_LETTERS
    + KABBALAH_WORLDS
    + SOLFEGGIOS
    + WEEKDAYS
    + COLORS
    + GEMSTONES
    + METALS
    + NUMBERS
)
