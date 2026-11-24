"""Validation helpers that mirror the database's own constraints.

LEARNING: keeping this rule in two places (here, and the `check`
constraint on the `ratings` table) is intentional, not duplication
for its own sake. The database constraint is the source of truth —
it cannot be bypassed by any client, through any code path. This
function exists so application code can fail fast with a readable
error *before* a write is ever attempted.

That only works if the two agree. See `test_validators.py` for the
case that proved they did not.
"""

JAIL_VALUE = -1000


def is_valid_rating(value):
    """True if `value` is a rating the database would accept.

    Mirrors the `ratings_value_valid` check constraint:

        value = -1000
        or (value >= 1 and value <= 10 and (value * 2) = trunc(value * 2))

    A rating is either the jail value (-1000), or a score from 1 to 10
    inclusive in half-point steps. 7.5 is valid; 7.3 is not.
    """
    # Reject anything non-numeric before comparing. `isinstance(True, int)`
    # is True in Python, so booleans need excluding explicitly — otherwise
    # is_valid_rating(True) would pass as the number 1.
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False

    # NaN fails every comparison, including against itself, so it would slip
    # through the range check below.
    if value != value:
        return False

    if value == JAIL_VALUE:
        return True

    if not (1 <= value <= 10):
        return False

    # The half-point rule. Doubling a legal value always gives a whole
    # number — this is the same trick the SQL constraint uses.
    return (value * 2) == int(value * 2)
