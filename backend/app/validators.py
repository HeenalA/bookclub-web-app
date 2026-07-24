"""Validation helpers that mirror the database's own constraints.

LEARNING: keeping this rule in two places (here, and the `check`
constraint on the `ratings` table in Supabase) is intentional, not
duplication for its own sake — the DB constraint is the ultimate
source of truth (it can't be bypassed), while this function lets the
app validate input and fail fast with a clear error *before* it ever
reaches the database.
"""


def is_valid_rating(value):
    """A rating is either the jail value (-1000), or a normal score
    from 1 to 10 inclusive. Half-stars (7.5, 8.5, 9.5) are allowed."""
    if value == -1000:
        return True
    return 1 <= value <= 10
