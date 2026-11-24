from app.validators import is_valid_rating


def test_jail_rating_is_valid():
    assert is_valid_rating(-1000) is True


def test_boundary_ratings_are_valid():
    assert is_valid_rating(1) is True
    assert is_valid_rating(10) is True


def test_half_star_ratings_are_valid():
    assert is_valid_rating(7.5) is True
    assert is_valid_rating(9.5) is True


def test_out_of_range_ratings_are_invalid():
    assert is_valid_rating(0) is False
    assert is_valid_rating(11) is False
    assert is_valid_rating(-500) is False


def test_non_half_point_steps_are_invalid():
    """The bug this suite originally missed.

    The database constraint rejects 7.3, but this function used to accept it
    because it only checked the range. The two have to agree, or the whole
    point of mirroring the constraint is lost.
    """
    assert is_valid_rating(7.3) is False
    assert is_valid_rating(2.25) is False
    assert is_valid_rating(9.99) is False


def test_non_numeric_values_are_invalid():
    assert is_valid_rating(None) is False
    assert is_valid_rating("8") is False
    assert is_valid_rating([8]) is False


def test_booleans_are_not_ratings():
    """`isinstance(True, int)` is True in Python, so without an explicit
    check a boolean would sail through as the number 1."""
    assert is_valid_rating(True) is False
    assert is_valid_rating(False) is False


def test_nan_is_invalid():
    """NaN fails every comparison including `1 <= nan <= 10`, so it would
    otherwise reach the half-point check and raise."""
    assert is_valid_rating(float("nan")) is False
