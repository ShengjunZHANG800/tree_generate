from time import sleep

import pytest
from fastapi.testclient import TestClient

from ewens_app.main import app


client = TestClient(app)


def test_limits_endpoint():
    response = client.get("/api/limits")

    assert response.status_code == 200
    body = response.json()
    assert body["max_n"] == 10_000_000
    assert body["max_draw_limit"] == 100_000
    assert "ewens" in body["model_performance_notes"]


def test_sample_endpoint_small_tree():
    response = client.post(
        "/api/sample",
        json={"theta": 2.0, "n": 80, "seed": 2026, "draw_limit": 1000},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["drawable"] is True
    assert len(body["nodes"]) == 80
    assert body["summary"]["edges"] == 79


def test_sample_endpoint_supports_uniform_recursive_model():
    response = client.post(
        "/api/sample",
        json={"model": "uniform_recursive", "theta": 2.0, "n": 80, "seed": 2026, "draw_limit": 1000},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["parameters"]["model"] == "uniform_recursive"
    assert body["parameters"]["theta"] == 1.0
    assert body["theory"]["theta"] == 1.0
    assert len(body["nodes"]) == 80


def test_sample_endpoint_returns_400_for_invalid_theta():
    response = client.post(
        "/api/sample",
        json={"theta": 0, "n": 80, "seed": 2026, "draw_limit": 1000},
    )

    assert response.status_code == 400
    assert "theta" in response.json()["detail"]


def test_scan_endpoint_small_grid():
    response = client.post(
        "/api/scan",
        json={"theta_values": [1.0, 2.0], "n_values": [50, 100], "samples": 2, "seed": 2026},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["groups"]) == 4
    assert len(body["rows"]) == 8


def test_scan_endpoint_supports_model_comparison():
    response = client.post(
        "/api/scan",
        json={
            "models": ["ewens", "uniform_recursive"],
            "theta_values": [1.5, 2.5],
            "n_values": [40],
            "samples": 1,
            "seed": 2026,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert [(group["model"], group["theta"]) for group in body["groups"]] == [
        ("ewens", 1.5),
        ("ewens", 2.5),
        ("uniform_recursive", 1.0),
    ]
    assert len(body["rows"]) == 3


def test_small_n_recursive_endpoint_enumerates_probabilities():
    response = client.post("/api/small-n/recursive", json={"n": 5, "theta": 2.0})

    assert response.status_code == 200
    body = response.json()
    assert body["parameters"]["total_trees"] == 24
    assert len(body["rows"]) == 24
    assert len(body["shape_groups"]) == 9
    assert sum(group["count"] for group in body["shape_groups"]) == 24
    first = body["rows"][0]
    assert first["probability_fractions"] == {
        "ewens": "2/15",
        "uniform_recursive": "1/24",
        "plancherel_recursive": "2/15",
    }
    assert first["probability_comparisons"]["ewens_over_uniform"]["fraction"] == "16/5"
    assert first["probability_comparisons"]["plancherel_minus_ewens"]["fraction"] == "0"
    assert first["shape_signature"]
    for model in ("ewens", "uniform_recursive", "plancherel_recursive"):
        total = sum(row["probabilities"][model] for row in body["rows"])
        assert total == pytest.approx(1.0)
        assert all(row["probability_fractions"][model] for row in body["rows"])
        height_total = sum(row["probabilities"][model] for row in body["distributions"]["height"])
        assert height_total == pytest.approx(1.0)


def test_small_n_recursive_endpoint_rejects_large_n():
    response = client.post("/api/small-n/recursive", json={"n": 10, "theta": 2.0})

    assert response.status_code == 400


def test_sample_task_endpoint_completes():
    response = client.post(
        "/api/tasks/sample",
        json={"model": "plancherel_recursive", "theta": 2.0, "n": 80, "seed": 2026, "draw_limit": 1000},
    )

    assert response.status_code == 200
    task = response.json()
    assert task["kind"] == "sample"

    for _ in range(20):
        poll = client.get(f"/api/tasks/{task['id']}")
        assert poll.status_code == 200
        task = poll.json()
        if task["status"] == "completed":
            break
        sleep(0.05)

    assert task["status"] == "completed"
    assert task["result"]["summary"]["n"] == 80
    assert task["result"]["parameters"]["model"] == "plancherel_recursive"


def test_scan_task_can_be_cancelled():
    response = client.post(
        "/api/tasks/scan",
        json={"theta_values": [2.0], "n_values": [200_000], "samples": 10, "seed": 2026},
    )

    assert response.status_code == 200
    task_id = response.json()["id"]
    cancel = client.post(f"/api/tasks/{task_id}/cancel")
    assert cancel.status_code == 200
    assert cancel.json()["cancel_requested"] is True

    task = cancel.json()
    for _ in range(40):
        poll = client.get(f"/api/tasks/{task_id}")
        assert poll.status_code == 200
        task = poll.json()
        if task["status"] in {"cancelled", "completed", "failed"}:
            break
        sleep(0.05)

    assert task["status"] in {"cancelled", "completed"}


def test_missing_task_returns_404():
    response = client.get("/api/tasks/missing-task")

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."
