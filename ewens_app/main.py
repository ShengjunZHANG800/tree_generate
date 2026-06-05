from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event
from threading import Lock
from time import time
from typing import Any
from uuid import uuid4

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic import Field

from .ewens import DEFAULT_DRAW_LIMIT
from .ewens import MAX_DRAW_LIMIT
from .ewens import MAX_N
from .ewens import MAX_SCAN_POINTS
from .ewens import MAX_SCAN_WORK
from .ewens import MODEL_LABELS
from .ewens import MODEL_FIXED_THETA
from .ewens import MODEL_MAX_N
from .ewens import MODEL_PERFORMANCE_NOTES
from .ewens import EwensCancelled
from .ewens import sample
from .ewens import scan_experiment
from .ewens import simulate
from .ewens import solve_theory
from .smalln import explore_recursive_trees


APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"

app = FastAPI(title="Ewens Tree Lab")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

TASK_EXECUTOR = ThreadPoolExecutor(max_workers=2)
TASK_LOCK = Lock()
TASKS: dict[str, dict[str, Any]] = {}
TASK_HISTORY_LIMIT = 50


class SampleRequest(BaseModel):
    model: str = "ewens"
    theta: float = 2.0
    n: int = 5_000
    seed: int | None = 2026
    draw_limit: int = DEFAULT_DRAW_LIMIT


class SimulateRequest(BaseModel):
    model: str = "ewens"
    theta: float = 2.0
    n: int = 5_000
    samples: int = 40
    seed: int | None = 2026


class ScanRequest(BaseModel):
    models: list[str] = Field(default_factory=lambda: ["ewens"])
    theta_values: list[float] = Field(default_factory=lambda: [2.0])
    n_values: list[int] = Field(default_factory=lambda: [1_000, 5_000, 10_000])
    samples: int = 10
    seed: int | None = 2026


class SmallNRequest(BaseModel):
    n: int = 5
    theta: float = 2.0


def _task_public(task: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in task.items()
        if not key.startswith("_")
    }


def _prune_tasks() -> None:
    finished = [
        task
        for task in TASKS.values()
        if task["status"] in {"completed", "cancelled", "failed"}
    ]
    if len(TASKS) <= TASK_HISTORY_LIMIT:
        return
    for task in sorted(finished, key=lambda item: item["updated_at"]):
        if len(TASKS) <= TASK_HISTORY_LIMIT:
            break
        TASKS.pop(task["id"], None)


def _run_task(
    task_id: str,
    runner: Any,
    cancel_event: Event,
) -> None:
    last_progress_at = 0.0
    last_progress_fraction = -1.0

    def progress(update: dict[str, Any]) -> None:
        nonlocal last_progress_at
        nonlocal last_progress_fraction
        now = time()
        fraction = float(update.get("fraction") or 0.0)
        stage = update.get("stage")
        if (
            stage not in {"complete", "cancelled"}
            and now - last_progress_at < 0.12
            and abs(fraction - last_progress_fraction) < 0.002
        ):
            return
        last_progress_at = now
        last_progress_fraction = fraction
        with TASK_LOCK:
            task = TASKS.get(task_id)
            if task is None:
                return
            task["progress"] = update
            task["updated_at"] = now

    def cancel_check() -> bool:
        return cancel_event.is_set()

    with TASK_LOCK:
        task = TASKS[task_id]
        task["status"] = "running"
        task["updated_at"] = time()

    try:
        result = runner(progress, cancel_check)
    except EwensCancelled:
        with TASK_LOCK:
            task = TASKS[task_id]
            task["status"] = "cancelled"
            task["progress"] = {
                "stage": "cancelled",
                "current": 1,
                "total": 1,
                "fraction": 1,
                "message": "Cancelled",
            }
            task["updated_at"] = time()
    except Exception as exc:  # noqa: BLE001 - returned to local UI as task error.
        with TASK_LOCK:
            task = TASKS[task_id]
            task["status"] = "failed"
            task["error"] = str(exc)
            task["updated_at"] = time()
    else:
        with TASK_LOCK:
            task = TASKS[task_id]
            task["status"] = "completed"
            task["result"] = result
            task["progress"] = {
                "stage": "complete",
                "current": 1,
                "total": 1,
                "fraction": 1,
                "message": "Complete",
            }
            task["updated_at"] = time()
    finally:
        with TASK_LOCK:
            _prune_tasks()


def _start_task(kind: str, parameters: dict[str, Any], runner: Any) -> dict[str, Any]:
    task_id = uuid4().hex
    cancel_event = Event()
    now = time()
    task = {
        "id": task_id,
        "kind": kind,
        "status": "queued",
        "parameters": parameters,
        "progress": {
            "stage": "queued",
            "current": 0,
            "total": 1,
            "fraction": 0,
            "message": "Queued",
        },
        "result": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
        "cancel_requested": False,
        "_cancel_event": cancel_event,
    }
    with TASK_LOCK:
        TASKS[task_id] = task
        _prune_tasks()
    future = TASK_EXECUTOR.submit(_run_task, task_id, runner, cancel_event)
    with TASK_LOCK:
        task["_future"] = future
        return _task_public(task)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/limits")
def limits() -> dict[str, Any]:
    return {
        "max_n": MAX_N,
        "default_draw_limit": DEFAULT_DRAW_LIMIT,
        "max_draw_limit": MAX_DRAW_LIMIT,
        "max_scan_work": MAX_SCAN_WORK,
        "max_scan_points": MAX_SCAN_POINTS,
        "models": MODEL_LABELS,
        "model_fixed_theta": MODEL_FIXED_THETA,
        "model_max_n": MODEL_MAX_N,
        "model_performance_notes": MODEL_PERFORMANCE_NOTES,
    }


@app.get("/api/theory")
def theory(theta: float = 2.0) -> dict[str, Any]:
    try:
        return solve_theory(theta).__dict__
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/sample")
def sample_endpoint(request: SampleRequest) -> dict[str, Any]:
    try:
        return sample(request.theta, request.n, request.seed, request.draw_limit, model=request.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/simulate")
def simulate_endpoint(request: SimulateRequest) -> dict[str, Any]:
    try:
        return simulate(request.theta, request.n, request.samples, request.seed, model=request.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/scan")
def scan_endpoint(request: ScanRequest) -> dict[str, Any]:
    try:
        return scan_experiment(
            request.models,
            request.theta_values,
            request.n_values,
            request.samples,
            request.seed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/small-n/recursive")
def small_n_recursive_endpoint(request: SmallNRequest) -> dict[str, Any]:
    try:
        return explore_recursive_trees(request.n, request.theta)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/tasks/sample")
def start_sample_task(request: SampleRequest) -> dict[str, Any]:
    return _start_task(
        "sample",
        request.model_dump(),
        lambda progress, cancel_check: sample(
            request.theta,
            request.n,
            request.seed,
            request.draw_limit,
            progress,
            cancel_check,
            request.model,
        ),
    )


@app.post("/api/tasks/simulate")
def start_simulate_task(request: SimulateRequest) -> dict[str, Any]:
    return _start_task(
        "simulation",
        request.model_dump(),
        lambda progress, cancel_check: simulate(
            request.theta,
            request.n,
            request.samples,
            request.seed,
            progress,
            cancel_check,
            request.model,
        ),
    )


@app.post("/api/tasks/scan")
def start_scan_task(request: ScanRequest) -> dict[str, Any]:
    return _start_task(
        "scan",
        request.model_dump(),
        lambda progress, cancel_check: scan_experiment(
            request.models,
            request.theta_values,
            request.n_values,
            request.samples,
            request.seed,
            progress,
            cancel_check,
        ),
    )


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str) -> dict[str, Any]:
    with TASK_LOCK:
        task = TASKS.get(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found.")
        return _task_public(task)


@app.post("/api/tasks/{task_id}/cancel")
def cancel_task(task_id: str) -> dict[str, Any]:
    with TASK_LOCK:
        task = TASKS.get(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found.")
        task["cancel_requested"] = True
        task["_cancel_event"].set()
        task["updated_at"] = time()
        return _task_public(task)
