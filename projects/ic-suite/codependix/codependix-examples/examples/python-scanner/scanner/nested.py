from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from shared.constants import FIRST


def load():
    from shared.helpers import name

    return name()
