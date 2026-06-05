import math

import pytest

from ewens_app.ewens import MAX_DRAW_LIMIT
from ewens_app.ewens import MAX_N
from ewens_app.ewens import sample
from ewens_app.ewens import scan_experiment
from ewens_app.ewens import simulate
from ewens_app.ewens import solve_theory


def test_theory_solution_for_theta_two_is_stable():
    theory = solve_theory(2.0)

    assert theory.theta == 2.0
    assert theory.t == pytest.approx(2.920694670565039)
    assert theory.c == pytest.approx(1.6738050501509092)
    assert theory.d == pytest.approx(0.8596268553948643)
    assert theory.a == pytest.approx(1 / theory.c)
    assert math.isfinite(theory.L)


def test_sample_returns_drawable_nodes_under_limit():
    result = sample(theta=2.0, n=100, seed=2026, draw_limit=MAX_DRAW_LIMIT)

    assert result["drawable"] is True
    assert len(result["nodes"]) == 100
    assert result["summary"]["n"] == 100
    assert result["summary"]["edges"] == 99
    assert result["height_offsets"]["height_minus_second_order"] is not None


def test_sample_supports_recursive_tree_models():
    for model in ("ewens", "uniform_recursive", "plancherel_recursive"):
        result = sample(theta=2.0, n=120, seed=2026, draw_limit=1_000, model=model)

        assert result["parameters"]["model"] == model
        assert result["drawable"] is True
        assert len(result["nodes"]) == 120
        assert result["summary"]["edges"] == 119
        if model == "ewens":
            assert result["theory"] is not None
            assert result["height_offsets"]["height_minus_second_order"] is not None
        else:
            expected_theta = 1.0 if model == "uniform_recursive" else 2.0
            assert result["theory"]["theta"] == expected_theta
            assert result["parameters"]["theta"] == expected_theta
            assert result["parameters"]["theta_fixed"] is True
            assert result["height_offsets"]["height_minus_second_order"] is not None


def test_sample_uses_summary_only_above_draw_limit():
    result = sample(theta=2.0, n=500, seed=2026, draw_limit=100)

    assert result["drawable"] is False
    assert "nodes" not in result
    assert result["summary"]["n"] == 500
    assert result["summary"]["longest_path_truncated"] is True


def test_simulate_and_scan_shapes_are_stable():
    sim = simulate(theta=2.0, n=100, samples=3, seed=2026)
    assert len(sim["heights"]) == 3
    assert len(sim["samples"]) == 3
    assert sim["stats"]["min"] <= sim["stats"]["median"] <= sim["stats"]["max"]

    scan = scan_experiment(models=["ewens"], theta_values=[1.0, 2.0], n_values=[100, 200], samples=2, seed=2026)
    assert len(scan["groups"]) == 4
    assert len(scan["rows"]) == 8
    assert {row["sample_index"] for row in scan["rows"]} == {1, 2}
    assert scan["groups"][0]["q25_offset_second_order"] is not None
    assert scan["groups"][0]["q25_offset_second_order"] <= scan["groups"][0]["q75_offset_second_order"]


def test_simulate_supports_fixed_theta_models_with_offsets():
    sim = simulate(theta=2.0, n=80, samples=2, seed=2026, model="uniform_recursive")

    assert sim["parameters"]["model"] == "uniform_recursive"
    assert sim["parameters"]["theta"] == 1.0
    assert len(sim["heights"]) == 2
    assert all(value is not None for value in sim["offsets_second_order"])


def test_scan_supports_multiple_models_with_fixed_theta_rows():
    scan = scan_experiment(
        models=["ewens", "uniform_recursive", "plancherel_recursive"],
        theta_values=[1.5, 2.5],
        n_values=[40],
        samples=1,
        seed=2026,
    )

    groups = {(group["model"], group["theta"]) for group in scan["groups"]}
    assert groups == {
        ("ewens", 1.5),
        ("ewens", 2.5),
        ("uniform_recursive", 1.0),
        ("plancherel_recursive", 2.0),
    }
    assert len(scan["rows"]) == 4
    assert all(row["model_label"] for row in scan["rows"])


def test_validation_rejects_invalid_ranges():
    with pytest.raises(ValueError):
        solve_theory(0)
    with pytest.raises(ValueError):
        sample(theta=2.0, n=MAX_N + 1, seed=1, draw_limit=10)
    with pytest.raises(ValueError):
        simulate(theta=2.0, n=100, samples=0, seed=1)
    with pytest.raises(ValueError):
        scan_experiment(models=["ewens"], theta_values=[], n_values=[100], samples=1, seed=1)
