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
