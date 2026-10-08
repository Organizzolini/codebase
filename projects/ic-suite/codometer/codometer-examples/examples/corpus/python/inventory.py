"""Tracks how much of each catalog item is on hand."""

from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

# How many of one item a single location may hold.
MAXIMUM_ON_HAND = 10_000

DEFAULT_LOCATION = "warehouse"


class Counter(Protocol):
    """Anything that can say how many of an item it holds."""

    def count(self, item_identifier: str) -> int:
        """Return the quantity held of one item."""
        ...


@dataclass(frozen=True)
class Holding:
    """How many of one item sit at one location."""

    item_identifier: str
    location: str
    quantity: int


class Inventory:
    """Counts holdings across every location."""

    def __init__(self, holdings: list[Holding]) -> None:
        """Store the holdings this inventory answers from."""
        self.holdings = holdings

    def count(self, item_identifier: str) -> int:
        """Return how many of one item are held anywhere."""
        return sum(
            holding.quantity
            for holding in self.holdings
            if holding.item_identifier == item_identifier
        )


@lru_cache(maxsize=None)
def available(quantity: int) -> bool:
    """Return whether a quantity is one a location may hold."""
    return 0 < quantity <= MAXIMUM_ON_HAND
