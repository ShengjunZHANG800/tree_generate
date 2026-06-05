from __future__ import annotations

from fractions import Fraction
from functools import lru_cache
from itertools import product
from math import factorial
from typing import Any

from .ewens import MODEL_EWENS
from .ewens import MODEL_LABELS
from .ewens import MODEL_PLANCHEREL_RECURSIVE
from .ewens import MODEL_UNIFORM_RECURSIVE
from .ewens import solve_theory


MAX_SMALL_N = 9
MAX_SMALL_ROWS = 50_000
SMALL_N_MODELS = (MODEL_EWENS, MODEL_UNIFORM_RECURSIVE, MODEL_PLANCHEREL_RECURSIVE)


def _validate_small_n(n: int) -> int:
    n = int(n)
    if n < 1:
        raise ValueError("n must be at least 1.")
    if n > MAX_SMALL_N:
        raise ValueError(f"Small-n explorer is capped at n={MAX_SMALL_N}.")
    if factorial(max(0, n - 1)) > MAX_SMALL_ROWS:
        raise ValueError(f"Small-n explorer is capped at {MAX_SMALL_ROWS:,} trees.")
    return n


def _children_from_parent(parent: tuple[int, ...]) -> list[list[int]]:
    children = [[] for _ in parent]
    for node in range(1, len(parent)):
        children[parent[node]].append(node)
    return children


def _shape_signature(children: list[list[int]], node: int = 0) -> str:
    if not children[node]:
        return "()"
    child_signatures = sorted(_shape_signature(children, child) for child in children[node])
    return "(" + "".join(child_signatures) + ")"


def _depths(parent: tuple[int, ...]) -> list[int]:
    depth = [0] * len(parent)
    for node in range(1, len(parent)):
        depth[node] = depth[parent[node]] + 1
    return depth


def _subtree_sizes(parent: tuple[int, ...]) -> list[int]:
    sizes = [1] * len(parent)
    for node in range(len(parent) - 1, 0, -1):
        sizes[parent[node]] += sizes[node]
    return sizes


def _root_partition(parent: tuple[int, ...], sizes: list[int]) -> tuple[int, ...]:
    parts = [sizes[node] for node in range(1, len(parent)) if parent[node] == 0]
    parts.sort(reverse=True)
    return tuple(parts)


@lru_cache(maxsize=None)
def _partition_counts(parts: tuple[int, ...]) -> tuple[tuple[int, int], ...]:
    counts: dict[int, int] = {}
    for part in parts:
        counts[part] = counts.get(part, 0) + 1
    return tuple(sorted(counts.items()))


@lru_cache(maxsize=None)
def _partition_z(parts: tuple[int, ...]) -> int:
    result = 1
    for size, count in _partition_counts(parts):
        result *= factorial(count) * (size**count)
    return result


@lru_cache(maxsize=None)
def _partition_bell_number(parts: tuple[int, ...]) -> int:
    total = sum(parts)
    if total == 0:
        return 1
    result = factorial(total)
    for size, count in _partition_counts(parts):
        result //= factorial(count) * (factorial(size) ** count)
    return result


def _fraction_label(value: Fraction) -> str:
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def _probability_comparisons(probabilities: dict[str, Fraction]) -> dict[str, dict[str, float | str]]:
    ewens = probabilities[MODEL_EWENS]
    uniform = probabilities[MODEL_UNIFORM_RECURSIVE]
    plancherel = probabilities[MODEL_PLANCHEREL_RECURSIVE]
    comparisons = {
        "ewens_over_uniform": ewens / uniform,
        "plancherel_over_uniform": plancherel / uniform,
        "plancherel_minus_ewens": plancherel - ewens,
    }
    return {
        key: {"value": float(value), "fraction": _fraction_label(value)}
        for key, value in comparisons.items()
    }


@lru_cache(maxsize=None)
def _ewens_partition_probability(parts: tuple[int, ...], theta: Fraction) -> Fraction:
    total = sum(parts)
    if total == 0:
        return Fraction(1)
    weight = Fraction(1)
    for k in range(total):
        weight *= Fraction(k + 1, 1) / (theta + k)
    weight *= theta**len(parts)
    return weight / _partition_z(parts)


def _ewens_probability(
    parent: tuple[int, ...],
    theta: Fraction,
    memo: dict[tuple[int, ...], Fraction],
) -> Fraction:
    if len(parent) <= 1:
        return Fraction(1)
    cached = memo.get(parent)
    if cached is not None:
        return cached
    children = _children_from_parent(parent)
    sizes = _subtree_sizes(parent)
    parts = _root_partition(parent, sizes)
    probability = _ewens_partition_probability(parts, theta) / _partition_bell_number(parts)
    for root_child in children[0]:
        subtree_nodes = []
        stack = [root_child]
        while stack:
            node = stack.pop()
            subtree_nodes.append(node)
            stack.extend(children[node])
        subtree_nodes.sort()
        relabel = {node: index for index, node in enumerate(subtree_nodes)}
        subtree_parent = [-1] * len(subtree_nodes)
        for node in subtree_nodes[1:]:
            subtree_parent[relabel[node]] = relabel[parent[node]]
        probability *= _ewens_probability(tuple(subtree_parent), theta, memo)
    memo[parent] = probability
    return probability


@lru_cache(maxsize=None)
def _plancherel_denominator(n: int) -> Fraction:
    denominator = Fraction(1)
    for i in range(1, n):
        denominator *= Fraction(i * (i + 1), 2)
    return denominator


def _plancherel_probability(parent: tuple[int, ...], sizes: list[int]) -> Fraction:
    n = len(parent)
    if n <= 1:
        return Fraction(1)
    numerator = Fraction(factorial(n), 1)
    for size in sizes:
        numerator /= size
    return numerator / _plancherel_denominator(n)


def _iter_parent_codes(n: int):
    if n == 1:
        yield (-1,)
        return
    for choices in product(*(range(k) for k in range(1, n))):
        yield (-1, *choices)


def explore_recursive_trees(n: int, theta: float = 2.0) -> dict[str, Any]:
    n = _validate_small_n(n)
    theta = float(theta)
    if theta <= 0:
        raise ValueError("theta must be positive.")
    theta_fraction = Fraction(str(theta))
    total = factorial(max(0, n - 1))
    uniform_probability = Fraction(1, total)
    ewens_memo: dict[tuple[int, ...], Fraction] = {}
    rows = []
    aggregate = {model: {"mean_height": 0.0, "mean_leaves": 0.0} for model in SMALL_N_MODELS}
    distribution_metrics = ("height", "leaves", "root_degree", "max_degree")
    distributions: dict[str, dict[int, dict[str, Any]]] = {metric: {} for metric in distribution_metrics}
    shape_groups: dict[str, dict[str, Any]] = {}
    for index, parent in enumerate(_iter_parent_codes(n), start=1):
        depth = _depths(parent)
        sizes = _subtree_sizes(parent)
        children = _children_from_parent(parent)
        degree = [len(items) for items in children]
        height = max(depth) if depth else 0
        leaves = sum(1 for value in degree if value == 0)
        root_degree = degree[0] if degree else 0
        max_degree = max(degree) if degree else 0
        shape_signature = _shape_signature(children)
        code = ",".join(str(value) for value in parent[1:])
        ewens_probability = _ewens_probability(parent, theta_fraction, ewens_memo)
        plancherel_probability = _plancherel_probability(parent, sizes)
        probability_fractions = {
            MODEL_EWENS: ewens_probability,
            MODEL_UNIFORM_RECURSIVE: uniform_probability,
            MODEL_PLANCHEREL_RECURSIVE: plancherel_probability,
        }
        probabilities = {model: float(probability) for model, probability in probability_fractions.items()}
        for model, probability in probabilities.items():
            aggregate[model]["mean_height"] += probability * height
            aggregate[model]["mean_leaves"] += probability * leaves
        shape_group = shape_groups.get(shape_signature)
        if shape_group is None:
            shape_group = {
                "shape_signature": shape_signature,
                "count": 0,
                "representative_rank": index,
                "representative_code": code,
                "height_min": height,
                "height_max": height,
                "root_degree": root_degree,
                "leaves": leaves,
                "probability_fractions": {model: Fraction(0) for model in SMALL_N_MODELS},
            }
            shape_groups[shape_signature] = shape_group
        shape_group["count"] += 1
        shape_group["height_min"] = min(shape_group["height_min"], height)
        shape_group["height_max"] = max(shape_group["height_max"], height)
        for model, probability in probability_fractions.items():
            shape_group["probability_fractions"][model] += probability
        metric_values = {
            "height": height,
            "leaves": leaves,
            "root_degree": root_degree,
            "max_degree": max_degree,
        }
        for metric, value in metric_values.items():
            bucket = distributions[metric].get(value)
            if bucket is None:
                bucket = {
                    "value": value,
                    "count": 0,
                    "probability_fractions": {model: Fraction(0) for model in SMALL_N_MODELS},
                }
                distributions[metric][value] = bucket
            bucket["count"] += 1
            for model, probability in probability_fractions.items():
                bucket["probability_fractions"][model] += probability
        rows.append(
            {
                "rank": index,
                "parent": list(parent),
                "code": code,
                "height": height,
                "root_degree": root_degree,
                "leaves": leaves,
                "max_degree": max_degree,
                "root_partition": list(_root_partition(parent, sizes)),
                "shape_signature": shape_signature,
                "probabilities": probabilities,
                "probability_fractions": {
                    model: _fraction_label(probability) for model, probability in probability_fractions.items()
                },
                "probability_comparisons": _probability_comparisons(probability_fractions),
            }
        )
    shape_group_rows = []
    for group in shape_groups.values():
        probability_fractions = group["probability_fractions"]
        shape_group_rows.append(
            {
                **{key: value for key, value in group.items() if key != "probability_fractions"},
                "probabilities": {model: float(probability) for model, probability in probability_fractions.items()},
                "probability_fractions": {
                    model: _fraction_label(probability) for model, probability in probability_fractions.items()
                },
                "probability_comparisons": _probability_comparisons(probability_fractions),
            }
        )
    shape_group_rows.sort(key=lambda row: (-row["count"], row["representative_rank"]))
    distribution_rows = {}
    for metric, buckets in distributions.items():
        distribution_rows[metric] = []
        for bucket in sorted(buckets.values(), key=lambda item: item["value"]):
            probability_fractions = bucket["probability_fractions"]
            distribution_rows[metric].append(
                {
                    "value": bucket["value"],
                    "count": bucket["count"],
                    "probabilities": {
                        model: float(probability) for model, probability in probability_fractions.items()
                    },
                    "probability_fractions": {
                        model: _fraction_label(probability) for model, probability in probability_fractions.items()
                    },
                }
            )
    return {
        "parameters": {
            "n": n,
            "theta": theta,
            "max_n": MAX_SMALL_N,
            "total_trees": total,
        },
        "models": MODEL_LABELS,
        "theory": solve_theory(theta).__dict__,
        "aggregate": aggregate,
        "shape_groups": shape_group_rows,
        "distributions": distribution_rows,
        "rows": rows,
    }
