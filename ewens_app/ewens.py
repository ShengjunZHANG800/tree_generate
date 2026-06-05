from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from math import exp
from math import log
from statistics import mean
from statistics import pstdev
from time import perf_counter
from typing import Any
from typing import Callable

import numpy as np
from scipy.optimize import brentq
from scipy.special import digamma
from scipy.special import gammaln


MAX_N = 20_000_000
MAX_DRAW_LIMIT = 150_000
DEFAULT_DRAW_LIMIT = 75_000
MAX_SIM_WORK = 30_000_000
MAX_SIM_SAMPLES = 250
MAX_SCAN_WORK = 60_000_000
MAX_SCAN_POINTS = 120
BATCHED_PARTITION_THRESHOLD = 4_096
BATCHED_PARTITION_SIZE = 65_536
FENWICK_PARTS_THRESHOLD = 512
CANCEL_CHECK_NODE_STEP = 2_048
PROGRESS_NODE_STEP = 8_192
MODEL_EWENS = "ewens"
MODEL_UNIFORM_RECURSIVE = "uniform_recursive"
MODEL_PLANCHEREL_RECURSIVE = "plancherel_recursive"
MODEL_LABELS = {
    MODEL_EWENS: "Ewens recursive",
    MODEL_UNIFORM_RECURSIVE: "Uniform recursive",
    MODEL_PLANCHEREL_RECURSIVE: "Plancherel recursive",
}
MODEL_FIXED_THETA = {
    MODEL_EWENS: None,
    MODEL_UNIFORM_RECURSIVE: 1.0,
    MODEL_PLANCHEREL_RECURSIVE: 2.0,
}
MODEL_MAX_N = {
    MODEL_EWENS: MAX_N,
    MODEL_UNIFORM_RECURSIVE: 10_000_000,
    MODEL_PLANCHEREL_RECURSIVE: 150_000,
}
MODEL_PERFORMANCE_NOTES = {
    MODEL_EWENS: "Streaming Ewens recursion; large n can return statistics without drawable node arrays.",
    MODEL_UNIFORM_RECURSIVE: "Parent/depth arrays are generated in memory; data-only summaries avoid sending drawable nodes.",
    MODEL_PLANCHEREL_RECURSIVE: "Treap-based generator with a lower interactive n cap because it keeps several arrays in memory.",
}

ProgressCallback = Callable[[dict[str, Any]], None]
CancelCheck = Callable[[], bool]


class EwensCancelled(RuntimeError):
    pass


def _check_cancel(cancel_check: CancelCheck | None) -> None:
    if cancel_check is not None and cancel_check():
        raise EwensCancelled("Operation cancelled.")


def _emit_progress(
    progress: ProgressCallback | None,
    *,
    stage: str,
    current: int | float,
    total: int | float,
    message: str,
    **extra: Any,
) -> None:
    if progress is None:
        return
    progress(
        {
            "stage": stage,
            "current": current,
            "total": total,
            "fraction": float(current / total) if total else 0.0,
            "message": message,
            **extra,
        }
    )


@dataclass(frozen=True)
class Theory:
    theta: float
    t: float
    beta: float
    L: float
    c: float
    d: float
    a: float


def _validate_theta(theta: float) -> float:
    if not np.isfinite(theta) or theta <= 0:
        raise ValueError("theta must be a positive finite number.")
    return float(theta)


def _validate_n(n: int) -> int:
    if n < 1:
        raise ValueError("n must be at least 1.")
    if n > MAX_N:
        raise ValueError(f"n is capped at {MAX_N:,} for this local tool.")
    return int(n)


def _validate_model(model: str | None) -> str:
    clean = (model or MODEL_EWENS).strip().lower()
    if clean not in MODEL_LABELS:
        raise ValueError(
            "model must be one of: " + ", ".join(sorted(MODEL_LABELS))
        )
    return clean


def _validate_model_n(model: str, n: int) -> int:
    n = _validate_n(n)
    max_model_n = MODEL_MAX_N[model]
    if n > max_model_n:
        raise ValueError(f"{MODEL_LABELS[model]} is capped at {max_model_n:,}.")
    return n


def effective_theta(model: str, theta: float) -> float:
    fixed = MODEL_FIXED_THETA[model]
    return _validate_theta(theta if fixed is None else fixed)


def beta_value(theta: float, t: float) -> float:
    theta = _validate_theta(theta)
    return float(exp(gammaln(t) + gammaln(theta + 1) - gammaln(t + theta)))


def L_value(theta: float, t: float) -> float:
    theta = _validate_theta(theta)
    return float(gammaln(t + theta) - gammaln(t) - gammaln(theta + 1))


def L_prime(theta: float, t: float) -> float:
    theta = _validate_theta(theta)
    return float(digamma(t + theta) - digamma(t))


def solve_theory(theta: float) -> Theory:
    theta = _validate_theta(theta)

    def critical_equation(t: float) -> float:
        L = L_value(theta, t)
        return t * L_prime(theta, t) - L

    lo = 1.0 + 1e-10
    hi = 2.0
    while critical_equation(hi) > 0:
        hi *= 2
        if hi > 1e8:
            raise ValueError("Could not bracket the critical parameter.")

    t = float(brentq(critical_equation, lo, hi, xtol=1e-12, rtol=1e-12))
    L = L_value(theta, t)
    b = beta_value(theta, t)
    return Theory(theta=theta, t=t, beta=b, L=L, c=t / L, d=3 / (2 * L), a=L / t)


def centering(theta: float, n: int) -> dict[str, float | None]:
    n = _validate_n(n)
    th = solve_theory(theta)
    first = th.c * log(n) if n > 0 else None
    second = th.c * log(n) - th.d * log(log(n)) if n > 2 else None
    return {
        "first_order": first,
        "second_order": second,
        "c_log_n": first,
        "d_log_log_n": th.d * log(log(n)) if n > 2 else None,
    }


def ewens_partition_size(
    m: int,
    theta: float,
    rng: np.random.Generator,
    cancel_check: CancelCheck | None = None,
) -> list[int]:
    _check_cancel(cancel_check)
    if m <= 0:
        return []
    if m >= BATCHED_PARTITION_THRESHOLD:
        expected_parts = theta * log(max(m, 2))
        if expected_parts >= FENWICK_PARTS_THRESHOLD:
            return ewens_partition_size_batched_fenwick(m, theta, rng, cancel_check)
        return ewens_partition_size_batched_linear(m, theta, rng, cancel_check)
    parts = [1]
    for k in range(1, m):
        if k % 4096 == 0:
            _check_cancel(cancel_check)
        if rng.random() <= theta / (theta + k):
            parts.append(1)
        else:
            target = int(rng.integers(k))
            total = 0
            idx = 0
            for i, size in enumerate(parts):
                total += size
                if target < total:
                    idx = i
                    break
            parts[idx] += 1
    parts.sort(reverse=True)
    return parts


def _partition_random_batches(
    m: int, theta: float, rng: np.random.Generator
):
    start = 1
    while start < m:
        stop = min(m, start + BATCHED_PARTITION_SIZE)
        ks = np.arange(start, stop, dtype=np.int64)
        new_tables = rng.random(stop - start) <= theta / (theta + ks)
        targets = rng.integers(0, ks)
        yield new_tables, targets
        start = stop


def ewens_partition_size_batched_linear(
    m: int,
    theta: float,
    rng: np.random.Generator,
    cancel_check: CancelCheck | None = None,
) -> list[int]:
    parts = [1]
    for new_tables, targets in _partition_random_batches(m, theta, rng):
        _check_cancel(cancel_check)
        for is_new, target_value in zip(new_tables, targets):
            if is_new:
                parts.append(1)
                continue
            target = int(target_value)
            total = 0
            idx = 0
            for i, size in enumerate(parts):
                total += size
                if target < total:
                    idx = i
                    break
            parts[idx] += 1
    parts.sort(reverse=True)
    return parts


def _initial_fenwick_capacity(m: int, theta: float) -> int:
    expected_parts = max(16, int(theta * log(max(m, 2)) * 4) + 16)
    capacity = 1
    while capacity < expected_parts:
        capacity *= 2
    return min(capacity, m)


def _fenwick_rebuild(parts: list[int], capacity: int) -> list[int]:
    tree = [0] * (capacity + 1)
    for idx, value in enumerate(parts, start=1):
        i = idx
        while i <= capacity:
            tree[i] += value
            i += i & -i
    return tree


def _fenwick_add(tree: list[int], capacity: int, idx: int, delta: int) -> None:
    i = idx
    while i <= capacity:
        tree[i] += delta
        i += i & -i


def _fenwick_find_by_order(tree: list[int], capacity: int, target: int) -> int:
    idx = 0
    bit = 1 << (capacity.bit_length() - 1)
    while bit:
        nxt = idx + bit
        if nxt <= capacity and tree[nxt] <= target:
            target -= tree[nxt]
            idx = nxt
        bit >>= 1
    return idx + 1


def ewens_partition_size_fenwick(
    m: int,
    theta: float,
    rng: np.random.Generator,
    cancel_check: CancelCheck | None = None,
) -> list[int]:
    parts = [1]
    capacity = _initial_fenwick_capacity(m, theta)
    tree = _fenwick_rebuild(parts, capacity)
    for k in range(1, m):
        if k % 4096 == 0:
            _check_cancel(cancel_check)
        if rng.random() <= theta / (theta + k):
            parts.append(1)
            if len(parts) > capacity:
                capacity = min(m, capacity * 2)
                tree = _fenwick_rebuild(parts, capacity)
            else:
                _fenwick_add(tree, capacity, len(parts), 1)
        else:
            target = int(rng.integers(k))
            idx = _fenwick_find_by_order(tree, capacity, target)
            parts[idx - 1] += 1
            _fenwick_add(tree, capacity, idx, 1)
    parts.sort(reverse=True)
    return parts


def ewens_partition_size_batched_fenwick(
    m: int,
    theta: float,
    rng: np.random.Generator,
    cancel_check: CancelCheck | None = None,
) -> list[int]:
    parts = [1]
    capacity = _initial_fenwick_capacity(m, theta)
    tree = _fenwick_rebuild(parts, capacity)
    for new_tables, targets in _partition_random_batches(m, theta, rng):
        _check_cancel(cancel_check)
        for is_new, target_value in zip(new_tables, targets):
            if is_new:
                parts.append(1)
                if len(parts) > capacity:
                    capacity = min(m, capacity * 2)
                    tree = _fenwick_rebuild(parts, capacity)
                else:
                    _fenwick_add(tree, capacity, len(parts), 1)
                continue
            idx = _fenwick_find_by_order(tree, capacity, int(target_value))
            parts[idx - 1] += 1
            _fenwick_add(tree, capacity, idx, 1)
    parts.sort(reverse=True)
    return parts


def generate_ewens_tree(
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    n = _validate_n(n)
    theta = _validate_theta(theta)
    rng = np.random.default_rng(seed)

    parent = [-1]
    depth = [0]
    subtree_size = [n]
    children: list[list[int]] = [[]]
    stack = [(0, n)]
    last_reported = 0
    visited = 0

    while stack:
        visited += 1
        if visited % CANCEL_CHECK_NODE_STEP == 0:
            _check_cancel(cancel_check)
        node, mass = stack.pop()
        if mass <= 1:
            continue
        parts = ewens_partition_size(mass - 1, theta, rng, cancel_check)
        child_ids = []
        for part in parts:
            cid = len(parent)
            parent.append(node)
            depth.append(depth[node] + 1)
            subtree_size.append(part)
            children.append([])
            child_ids.append(cid)
        children[node] = child_ids
        for cid, part in reversed(list(zip(child_ids, parts))):
            stack.append((cid, part))
        if len(parent) - last_reported >= PROGRESS_NODE_STEP or len(parent) == n:
            last_reported = len(parent)
            _emit_progress(
                progress,
                stage="generate",
                current=min(len(parent), n),
                total=n,
                message="Generating drawable tree",
                nodes=len(parent),
            )

    return {
        "parent": parent,
        "depth": depth,
        "subtree_size": subtree_size,
        "children": children,
    }


def generate_ewens_summary(
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, int]:
    n = _validate_n(n)
    theta = _validate_theta(theta)
    rng = np.random.default_rng(seed)
    height = 0
    leaves = 0
    max_degree = 0
    root_degree = 0
    stack = [(n, 0, True)]
    processed = 0
    last_reported = 0

    while stack:
        mass, depth, is_root = stack.pop()
        processed += 1
        if processed % CANCEL_CHECK_NODE_STEP == 0:
            _check_cancel(cancel_check)
        if depth > height:
            height = depth
        if mass <= 1:
            leaves += 1
            continue
        parts = ewens_partition_size(mass - 1, theta, rng, cancel_check)
        degree = len(parts)
        if is_root:
            root_degree = degree
        if degree > max_degree:
            max_degree = degree
        for part in reversed(parts):
            stack.append((part, depth + 1, False))
        if processed - last_reported >= PROGRESS_NODE_STEP or processed == n:
            last_reported = processed
            _emit_progress(
                progress,
                stage="generate",
                current=min(processed, n),
                total=n,
                message="Generating summary statistics",
                nodes=processed,
            )

    return {
        "height": height,
        "root_degree": root_degree,
        "leaves": leaves,
        "max_degree": max_degree,
    }


def _histogram(values: list[int]) -> list[dict[str, int]]:
    counts: dict[int, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    return [{"value": k, "count": counts[k]} for k in sorted(counts)]


def _top_counts(values: list[int], limit: int = 40) -> list[dict[str, int]]:
    counts: dict[int, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    items = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]
    return [{"value": k, "count": v} for k, v in items]


def summarize_tree(tree: dict[str, Any]) -> dict[str, Any]:
    parent: list[int] = tree["parent"]
    depth: list[int] = tree["depth"]
    subtree_size: list[int] = tree["subtree_size"]
    children: list[list[int]] = tree["children"]
    n = len(parent)
    degrees = [len(c) for c in children]
    height = max(depth) if depth else 0
    deepest = max((i for i, d in enumerate(depth) if d == height), default=0)
    path = []
    node = deepest
    while node >= 0:
        path.append(node)
        node = parent[node]
    path.reverse()
    profile = [0] * (height + 1)
    for d in depth:
        profile[d] += 1
    root_partition = sorted([subtree_size[c] for c in children[0]], reverse=True)
    leaves = sum(1 for degree in degrees if degree == 0)
    max_degree = max(degrees) if degrees else 0
    avg_depth = float(sum(depth) / n)
    avg_degree = float(sum(degrees) / n)
    return {
        "n": n,
        "edges": max(0, n - 1),
        "height": height,
        "root_degree": len(children[0]) if children else 0,
        "leaves": leaves,
        "max_degree": max_degree,
        "avg_depth": avg_depth,
        "avg_degree": avg_degree,
        "longest_path": path,
        "longest_path_length": len(path) - 1,
        "profile": [{"depth": i, "count": count} for i, count in enumerate(profile)],
        "degree_distribution": _histogram(degrees),
        "depth_distribution": _histogram(depth),
        "subtree_size_top_counts": _top_counts(subtree_size),
        "root_subtree_partition": root_partition[:80],
        "root_subtree_partition_truncated": len(root_partition) > 80,
    }


def generate_ewens_statistics(
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    n = _validate_n(n)
    theta = _validate_theta(theta)
    rng = np.random.default_rng(seed)

    node_count = 0
    total_depth = 0
    height = 0
    leaves = 0
    max_degree = 0
    root_degree = 0
    root_partition: list[int] = []
    depth_counts: Counter[int] = Counter()
    degree_counts: Counter[int] = Counter()
    subtree_counts: Counter[int] = Counter()
    stack = [(n, 0, True)]
    last_reported = 0

    while stack:
        mass, depth, is_root = stack.pop()
        node_count += 1
        if node_count % CANCEL_CHECK_NODE_STEP == 0:
            _check_cancel(cancel_check)
        total_depth += depth
        depth_counts[depth] += 1
        subtree_counts[mass] += 1
        if depth > height:
            height = depth

        if mass <= 1:
            leaves += 1
            degree_counts[0] += 1
            continue

        parts = ewens_partition_size(mass - 1, theta, rng, cancel_check)
        degree = len(parts)
        degree_counts[degree] += 1
        if degree > max_degree:
            max_degree = degree
        if is_root:
            root_degree = degree
            root_partition = parts
        for part in reversed(parts):
            stack.append((part, depth + 1, False))
        if node_count - last_reported >= PROGRESS_NODE_STEP or node_count == n:
            last_reported = node_count
            _emit_progress(
                progress,
                stage="generate",
                current=min(node_count, n),
                total=n,
                message="Generating data-only statistics",
                nodes=node_count,
            )

    return {
        "n": node_count,
        "edges": max(0, node_count - 1),
        "height": height,
        "root_degree": root_degree,
        "leaves": leaves,
        "max_degree": max_degree,
        "avg_depth": float(total_depth / node_count),
        "avg_degree": float(max(0, node_count - 1) / node_count),
        "longest_path": [],
        "longest_path_length": height,
        "longest_path_truncated": True,
        "profile": [
            {"depth": depth, "count": depth_counts[depth]}
            for depth in range(height + 1)
        ],
        "degree_distribution": [
            {"value": degree, "count": degree_counts[degree]}
            for degree in sorted(degree_counts)
        ],
        "depth_distribution": [
            {"value": depth, "count": depth_counts[depth]}
            for depth in sorted(depth_counts)
        ],
        "subtree_size_top_counts": [
            {"value": size, "count": count}
            for size, count in sorted(
                subtree_counts.items(), key=lambda item: (-item[1], item[0])
            )[:40]
        ],
        "root_subtree_partition": root_partition[:80],
        "root_subtree_partition_truncated": len(root_partition) > 80,
    }


def _emit_node_progress(
    progress: ProgressCallback | None,
    *,
    current: int,
    total: int,
    message: str,
) -> None:
    if current % PROGRESS_NODE_STEP == 0 or current == total:
        _emit_progress(
            progress,
            stage="generate",
            current=current,
            total=total,
            message=message,
            nodes=current,
        )


def generate_uniform_parent_arrays(
    n: int,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    n = _validate_model_n(MODEL_UNIFORM_RECURSIVE, n)
    rng = np.random.default_rng(seed)
    parent = np.empty(n, dtype=np.int32)
    depth = np.empty(n, dtype=np.int32)
    parent[0] = -1
    depth[0] = 0
    _emit_node_progress(progress, current=1, total=n, message="Generating uniform recursive tree")
    for k in range(1, n):
        if k % CANCEL_CHECK_NODE_STEP == 0:
            _check_cancel(cancel_check)
        p = int(rng.integers(0, k))
        parent[k] = p
        depth[k] = depth[p] + 1
        _emit_node_progress(progress, current=k + 1, total=n, message="Generating uniform recursive tree")
    return parent, depth


def _treap_size(idx: int, sizes: np.ndarray) -> int:
    return int(sizes[idx]) if idx else 0


def _treap_pull(idx: int, left: np.ndarray, right: np.ndarray, sizes: np.ndarray) -> None:
    if idx:
        sizes[idx] = 1 + _treap_size(int(left[idx]), sizes) + _treap_size(int(right[idx]), sizes)


def _treap_merge(
    a: int,
    b: int,
    left: np.ndarray,
    right: np.ndarray,
    sizes: np.ndarray,
    priorities: np.ndarray,
) -> int:
    if not a or not b:
        return a or b
    if priorities[a] < priorities[b]:
        right[a] = _treap_merge(int(right[a]), b, left, right, sizes, priorities)
        _treap_pull(a, left, right, sizes)
        return a
    left[b] = _treap_merge(a, int(left[b]), left, right, sizes, priorities)
    _treap_pull(b, left, right, sizes)
    return b


def _treap_split(
    root: int,
    count: int,
    left: np.ndarray,
    right: np.ndarray,
    sizes: np.ndarray,
) -> tuple[int, int]:
    if not root:
        return 0, 0
    left_size = _treap_size(int(left[root]), sizes)
    if count <= left_size:
        a, new_left = _treap_split(int(left[root]), count, left, right, sizes)
        left[root] = new_left
        _treap_pull(root, left, right, sizes)
        return a, root
    new_right, b = _treap_split(int(right[root]), count - left_size - 1, left, right, sizes)
    right[root] = new_right
    _treap_pull(root, left, right, sizes)
    return root, b


def _treap_kth(
    root: int,
    index: int,
    left: np.ndarray,
    right: np.ndarray,
    sizes: np.ndarray,
    values: np.ndarray,
) -> int:
    current = root
    while current:
        left_size = _treap_size(int(left[current]), sizes)
        if index < left_size:
            current = int(left[current])
        elif index == left_size:
            return int(values[current])
        else:
            index -= left_size + 1
            current = int(right[current])
    raise ValueError("Treap index out of range.")


def generate_plancherel_parent_arrays(
    n: int,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    n = _validate_model_n(MODEL_PLANCHEREL_RECURSIVE, n)
    rng = np.random.default_rng(seed)
    parent = np.empty(n, dtype=np.int32)
    depth = np.empty(n, dtype=np.int32)
    parent[0] = -1
    depth[0] = 0
    if n == 1:
        return parent, depth

    ks = np.arange(1, n, dtype=np.float64)
    w = np.floor(np.sqrt((ks + ks * ks) * rng.random(n - 1) + 0.25) + 0.5).astype(np.int32)
    j_values = 1 + rng.integers(0, w, dtype=np.int32)

    left = np.zeros(n + 1, dtype=np.int32)
    right = np.zeros(n + 1, dtype=np.int32)
    sizes = np.zeros(n + 1, dtype=np.int32)
    values = np.zeros(n + 1, dtype=np.int32)
    priorities = rng.integers(1, np.iinfo(np.int32).max, size=n + 1, dtype=np.int32)
    root = 1
    sizes[1] = 1
    values[1] = 0

    _emit_node_progress(progress, current=1, total=n, message="Generating Plancherel recursive tree")
    for k in range(1, n):
        if k % CANCEL_CHECK_NODE_STEP == 0:
            _check_cancel(cancel_check)
        source_index = k - int(w[k - 1])
        p = _treap_kth(root, source_index, left, right, sizes, values)
        parent[k] = p
        depth[k] = depth[p] + 1

        node_idx = k + 1
        sizes[node_idx] = 1
        values[node_idx] = k
        insert_at = k + 1 - int(j_values[k - 1])
        a, b = _treap_split(root, insert_at, left, right, sizes)
        root = _treap_merge(_treap_merge(a, node_idx, left, right, sizes, priorities), b, left, right, sizes, priorities)
        _emit_node_progress(progress, current=k + 1, total=n, message="Generating Plancherel recursive tree")
    return parent, depth


def complete_tree_arrays(parent: np.ndarray, depth: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    n = len(parent)
    subtree_size = np.ones(n, dtype=np.int64)
    degree = np.zeros(n, dtype=np.int32)
    for node in range(n - 1, 0, -1):
        p = int(parent[node])
        subtree_size[p] += subtree_size[node]
        degree[p] += 1
    return subtree_size, degree


def tree_from_arrays(parent: np.ndarray, depth: np.ndarray) -> dict[str, Any]:
    subtree_size, degree = complete_tree_arrays(parent, depth)
    children: list[list[int]] = [[] for _ in range(len(parent))]
    for node in range(1, len(parent)):
        children[int(parent[node])].append(node)
    return {
        "parent": parent.astype(int).tolist(),
        "depth": depth.astype(int).tolist(),
        "subtree_size": subtree_size.astype(int).tolist(),
        "children": children,
    }


def summarize_arrays(parent: np.ndarray, depth: np.ndarray) -> dict[str, Any]:
    subtree_size, degree = complete_tree_arrays(parent, depth)
    n = len(parent)
    height = int(depth.max()) if n else 0
    deepest = int(np.flatnonzero(depth == height)[-1]) if n else 0
    path = []
    node = deepest
    while node >= 0:
        path.append(int(node))
        node = int(parent[node])
    path.reverse()
    profile_counts = np.bincount(depth.astype(np.int64), minlength=height + 1)
    degree_counts = np.bincount(degree.astype(np.int64))
    subtree_values, subtree_counts = np.unique(subtree_size, return_counts=True)
    top_subtree_indices = sorted(
        range(len(subtree_values)),
        key=lambda idx: (-int(subtree_counts[idx]), int(subtree_values[idx])),
    )[:40]
    root_children = np.flatnonzero(parent == 0)
    root_partition = sorted((int(subtree_size[child]) for child in root_children), reverse=True)
    return {
        "n": n,
        "edges": max(0, n - 1),
        "height": height,
        "root_degree": int(degree[0]) if n else 0,
        "leaves": int(np.count_nonzero(degree == 0)),
        "max_degree": int(degree.max()) if n else 0,
        "avg_depth": float(depth.mean()) if n else 0.0,
        "avg_degree": float(max(0, n - 1) / n) if n else 0.0,
        "longest_path": path,
        "longest_path_length": len(path) - 1,
        "profile": [{"depth": i, "count": int(count)} for i, count in enumerate(profile_counts)],
        "degree_distribution": [
            {"value": i, "count": int(count)}
            for i, count in enumerate(degree_counts)
            if count
        ],
        "depth_distribution": [{"value": i, "count": int(count)} for i, count in enumerate(profile_counts)],
        "subtree_size_top_counts": [
            {"value": int(subtree_values[idx]), "count": int(subtree_counts[idx])}
            for idx in top_subtree_indices
        ],
        "root_subtree_partition": root_partition[:80],
        "root_subtree_partition_truncated": len(root_partition) > 80,
    }


def summarize_basic_arrays(parent: np.ndarray, depth: np.ndarray) -> dict[str, int]:
    n = len(parent)
    degree = np.bincount(parent[1:].astype(np.int64), minlength=n) if n > 1 else np.zeros(n, dtype=np.int64)
    return {
        "height": int(depth.max()) if n else 0,
        "root_degree": int(degree[0]) if n else 0,
        "leaves": int(np.count_nonzero(degree == 0)),
        "max_degree": int(degree.max()) if n else 0,
    }


def generate_model_arrays(
    model: str,
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    if model == MODEL_UNIFORM_RECURSIVE:
        return generate_uniform_parent_arrays(n, seed, progress, cancel_check)
    if model == MODEL_PLANCHEREL_RECURSIVE:
        return generate_plancherel_parent_arrays(n, seed, progress, cancel_check)
    tree = generate_ewens_tree(n, theta, seed, progress, cancel_check)
    return np.array(tree["parent"], dtype=np.int32), np.array(tree["depth"], dtype=np.int32)


def generate_model_tree(
    model: str,
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    if model == MODEL_EWENS:
        return generate_ewens_tree(n, theta, seed, progress, cancel_check)
    parent, depth = generate_model_arrays(model, n, theta, seed, progress, cancel_check)
    return tree_from_arrays(parent, depth)


def generate_model_statistics(
    model: str,
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    if model == MODEL_EWENS:
        return generate_ewens_statistics(n, theta, seed, progress, cancel_check)
    parent, depth = generate_model_arrays(model, n, theta, seed, progress, cancel_check)
    summary = summarize_arrays(parent, depth)
    summary["longest_path"] = []
    summary["longest_path_truncated"] = True
    return summary


def generate_model_summary(
    model: str,
    n: int,
    theta: float,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    if model == MODEL_EWENS:
        return generate_ewens_summary(n, theta, seed, progress, cancel_check)
    parent, depth = generate_model_arrays(model, n, theta, seed, progress, cancel_check)
    return summarize_basic_arrays(parent, depth)


def empty_centering() -> dict[str, None]:
    return {
        "first_order": None,
        "second_order": None,
        "c_log_n": None,
        "d_log_log_n": None,
    }


def sample(
    theta: float,
    n: int,
    seed: int | None,
    draw_limit: int,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
    model: str = MODEL_EWENS,
) -> dict[str, Any]:
    model = _validate_model(model)
    n = _validate_model_n(model, n)
    theta = effective_theta(model, theta)
    draw_limit = max(0, min(int(draw_limit), MAX_DRAW_LIMIT))
    drawable = n <= draw_limit
    total_start = perf_counter()
    _emit_progress(
        progress,
        stage="theory",
        current=0,
        total=1,
        message="Solving theory constants",
    )
    _check_cancel(cancel_check)
    theory_start = perf_counter()
    th = solve_theory(theta)
    theory_ms = (perf_counter() - theory_start) * 1000
    _emit_progress(
        progress,
        stage="theory",
        current=1,
        total=1,
        message="Theory constants solved",
    )
    if drawable:
        generate_start = perf_counter()
        tree = generate_model_tree(model, n, theta, seed, progress, cancel_check)
        generate_ms = (perf_counter() - generate_start) * 1000
        _check_cancel(cancel_check)
        summarize_start = perf_counter()
        summary = summarize_tree(tree)
        summarize_ms = (perf_counter() - summarize_start) * 1000
    else:
        generate_start = perf_counter()
        tree = None
        summary = generate_model_statistics(model, n, theta, seed, progress, cancel_check)
        generate_ms = (perf_counter() - generate_start) * 1000
        summarize_ms = 0.0
    centered = centering_from_theory(th, n)
    payload: dict[str, Any] = {
        "parameters": {
            "model": model,
            "model_label": MODEL_LABELS[model],
            "theta": theta,
            "theta_fixed": MODEL_FIXED_THETA[model] is not None,
            "n": n,
            "seed": seed,
            "draw_limit": draw_limit,
            "max_n": MAX_N,
            "max_draw_limit": MAX_DRAW_LIMIT,
            "model_max_n": MODEL_MAX_N[model],
        },
        "theory": th.__dict__,
        "centering": centered,
        "summary": summary,
        "drawable": drawable,
        "timing": {
            "theory_ms": theory_ms,
            "generate_ms": generate_ms,
            "summarize_ms": summarize_ms,
        },
    }
    if centered["second_order"] is not None:
        payload["height_offsets"] = {
            "height_minus_first_order": summary["height"] - centered["first_order"],
            "height_minus_second_order": summary["height"] - centered["second_order"],
        }
    if drawable:
        if tree is None:
            raise RuntimeError("Drawable samples must retain node data.")
        degrees = [len(c) for c in tree["children"]]
        longest = set(summary["longest_path"])
        payload["nodes"] = [
            {
                "id": i,
                "parent": tree["parent"][i],
                "depth": tree["depth"][i],
                "subtree_size": tree["subtree_size"][i],
                "degree": degrees[i],
                "on_longest_path": i in longest,
            }
            for i in range(n)
        ]
    payload["timing"]["total_ms"] = (perf_counter() - total_start) * 1000
    _emit_progress(
        progress,
        stage="complete",
        current=1,
        total=1,
        message="Sample complete",
    )
    return payload


def centering_from_theory(th: Theory, n: int) -> dict[str, float | None]:
    n = _validate_n(n)
    first = th.c * log(n) if n > 0 else None
    second = th.c * log(n) - th.d * log(log(n)) if n > 2 else None
    return {
        "first_order": first,
        "second_order": second,
        "c_log_n": first,
        "d_log_log_n": th.d * log(log(n)) if n > 2 else None,
    }


def simulate(
    theta: float,
    n: int,
    samples: int,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
    model: str = MODEL_EWENS,
) -> dict[str, Any]:
    model = _validate_model(model)
    n = _validate_model_n(model, n)
    theta = effective_theta(model, theta)
    samples = int(samples)
    if samples < 1:
        raise ValueError("samples must be at least 1.")
    if samples > MAX_SIM_SAMPLES:
        raise ValueError(f"samples is capped at {MAX_SIM_SAMPLES}.")
    if n * samples > MAX_SIM_WORK:
        raise ValueError(
            f"n * samples is capped at {MAX_SIM_WORK:,} for interactive runs."
        )
    rng = np.random.default_rng(seed)
    heights = []
    offsets = []
    th = solve_theory(theta)
    centered = centering_from_theory(th, n)
    second = centered["second_order"]
    sample_rows = []
    total_start = perf_counter()
    _emit_progress(
        progress,
        stage="simulate",
        current=0,
        total=samples,
        message="Starting height simulation",
    )
    for sample_index in range(samples):
        _check_cancel(cancel_check)
        local_seed = int(rng.integers(0, 2**32 - 1))
        start = perf_counter()
        summary = generate_model_summary(model, n, theta, local_seed, None, cancel_check)
        h = summary["height"]
        elapsed_ms = (perf_counter() - start) * 1000
        heights.append(int(h))
        offsets.append(float(h - second) if second is not None else None)
        sample_rows.append(
            {
                "theta": theta,
                "model": model,
                "n": n,
                "seed": local_seed,
                "height": int(h),
                "second_order_center": second,
                "height_minus_second_order": float(h - second)
                if second is not None
                else None,
                "elapsed_ms": elapsed_ms,
            }
        )
        _emit_progress(
            progress,
            stage="simulate",
            current=sample_index + 1,
            total=samples,
            message="Running height simulation",
            height=int(h),
        )
    sorted_heights = sorted(heights)

    def quantile(q: float) -> int:
        idx = round((len(sorted_heights) - 1) * q)
        return sorted_heights[int(idx)]

    return {
        "parameters": {
            "model": model,
            "model_label": MODEL_LABELS[model],
            "theta": theta,
            "theta_fixed": MODEL_FIXED_THETA[model] is not None,
            "n": n,
            "samples": samples,
            "seed": seed,
            "model_max_n": MODEL_MAX_N[model],
        },
        "centering": centered,
        "heights": heights,
        "offsets_second_order": offsets,
        "samples": sample_rows,
        "timing": {"total_ms": (perf_counter() - total_start) * 1000},
        "stats": {
            "mean": float(mean(heights)),
            "std": float(pstdev(heights)) if len(heights) > 1 else 0.0,
            "min": min(heights),
            "q25": quantile(0.25),
            "median": quantile(0.5),
            "q75": quantile(0.75),
            "max": max(heights),
        },
    }


def scan_experiment(
    models: list[str] | None,
    theta_values: list[float],
    n_values: list[int],
    samples: int,
    seed: int | None,
    progress: ProgressCallback | None = None,
    cancel_check: CancelCheck | None = None,
) -> dict[str, Any]:
    clean_models = [_validate_model(model) for model in (models or [MODEL_EWENS])]
    clean_models = list(dict.fromkeys(clean_models))
    if not clean_models:
        raise ValueError("models must not be empty.")
    if not theta_values:
        raise ValueError("theta_values must not be empty.")
    if not n_values:
        raise ValueError("n_values must not be empty.")
    clean_thetas = [_validate_theta(theta) for theta in theta_values]
    clean_ns_by_model = {
        model: [_validate_model_n(model, n) for n in n_values]
        for model in clean_models
    }
    model_thetas = {
        model: [
            effective_theta(model, theta)
            for theta in (clean_thetas if MODEL_FIXED_THETA[model] is None else [clean_thetas[0]])
        ]
        for model in clean_models
    }
    scan_points = sum(len(model_thetas[model]) * len(clean_ns_by_model[model]) for model in clean_models)
    if scan_points > MAX_SCAN_POINTS:
        raise ValueError(f"scan grid is capped at {MAX_SCAN_POINTS} points.")
    samples = int(samples)
    if samples < 1:
        raise ValueError("samples must be at least 1.")
    if samples > MAX_SIM_SAMPLES:
        raise ValueError(f"samples is capped at {MAX_SIM_SAMPLES}.")

    work = sum(
        sum(clean_ns_by_model[model]) * len(model_thetas[model]) * samples
        for model in clean_models
    )
    if work > MAX_SCAN_WORK:
        raise ValueError(
            f"sum(n) * model/theta_count * samples is capped at {MAX_SCAN_WORK:,}."
        )

    rng = np.random.default_rng(seed)
    total_start = perf_counter()
    rows = []
    groups = []
    theory_cache = {theta: solve_theory(theta) for values in model_thetas.values() for theta in values}
    total_runs = scan_points * samples
    completed_runs = 0
    _emit_progress(
        progress,
        stage="scan",
        current=0,
        total=total_runs,
        message="Starting parameter scan",
    )
    for model in clean_models:
        for theta in model_thetas[model]:
            th = theory_cache[theta]
            for n in clean_ns_by_model[model]:
                _check_cancel(cancel_check)
                centered = centering_from_theory(th, n)
                second = centered["second_order"]
                heights = []
                offsets = []
                group_start = perf_counter()
                for sample_index in range(samples):
                    _check_cancel(cancel_check)
                    local_seed = int(rng.integers(0, 2**32 - 1))
                    run_start = perf_counter()
                    summary = generate_model_summary(model, n, theta, local_seed, None, cancel_check)
                    elapsed_ms = (perf_counter() - run_start) * 1000
                    height = int(summary["height"])
                    offset = float(height - second) if second is not None else None
                    heights.append(height)
                    offsets.append(offset)
                    rows.append(
                        {
                            "model": model,
                            "model_label": MODEL_LABELS[model],
                            "theta": theta,
                            "theta_fixed": MODEL_FIXED_THETA[model] is not None,
                            "n": n,
                            "sample_index": sample_index + 1,
                            "seed": local_seed,
                            "height": height,
                            "height_minus_second_order": offset,
                            "root_degree": summary["root_degree"],
                            "leaves": summary["leaves"],
                            "max_degree": summary["max_degree"],
                            "elapsed_ms": elapsed_ms,
                        }
                    )
                    completed_runs += 1
                    _emit_progress(
                        progress,
                        stage="scan",
                        current=completed_runs,
                        total=total_runs,
                        message="Running parameter scan",
                        model=model,
                        theta=theta,
                        n=n,
                        sample_index=sample_index + 1,
                    )

                sorted_heights = sorted(heights)
                sorted_offsets = sorted(value for value in offsets if value is not None)

                def quantile(q: float) -> int:
                    idx = round((len(sorted_heights) - 1) * q)
                    return sorted_heights[int(idx)]

                def offset_quantile(q: float) -> float | None:
                    if not sorted_offsets:
                        return None
                    idx = round((len(sorted_offsets) - 1) * q)
                    return float(sorted_offsets[int(idx)])

                groups.append(
                    {
                        "model": model,
                        "model_label": MODEL_LABELS[model],
                        "theta": theta,
                        "theta_fixed": MODEL_FIXED_THETA[model] is not None,
                        "n": n,
                        "samples": samples,
                        "c": th.c,
                        "d": th.d,
                        "second_order_center": second,
                        "mean_height": float(mean(heights)),
                        "std_height": float(pstdev(heights))
                        if len(heights) > 1
                        else 0.0,
                        "mean_offset_second_order": float(mean(offsets))
                        if second is not None
                        else None,
                        "std_offset_second_order": float(pstdev(sorted_offsets))
                        if len(sorted_offsets) > 1
                        else 0.0 if sorted_offsets else None,
                        "min_offset_second_order": offset_quantile(0),
                        "q25_offset_second_order": offset_quantile(0.25),
                        "median_offset_second_order": offset_quantile(0.5),
                        "q75_offset_second_order": offset_quantile(0.75),
                        "max_offset_second_order": offset_quantile(1),
                        "min_height": min(heights),
                        "q25_height": quantile(0.25),
                        "median_height": quantile(0.5),
                        "q75_height": quantile(0.75),
                        "max_height": max(heights),
                        "total_elapsed_ms": (perf_counter() - group_start) * 1000,
                        "mean_elapsed_ms": mean(
                            row["elapsed_ms"]
                            for row in rows[-samples:]
                        ),
                    }
                )

    return {
        "parameters": {
            "models": clean_models,
            "theta_values": clean_thetas,
            "n_values": [int(n) for n in n_values],
            "samples": samples,
            "seed": seed,
            "max_scan_work": MAX_SCAN_WORK,
        },
        "groups": groups,
        "rows": rows,
        "timing": {"total_ms": (perf_counter() - total_start) * 1000},
    }
