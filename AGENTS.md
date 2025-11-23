# Repository Guidelines

This repository is currently empty; these guidelines set expectations as code and tooling are added. Keep changes small, documented, and reproducible so new contributors can onboard quickly.

## Project Structure & Module Organization
- Create `src/` for runtime code (CLI/server/agents) with feature-oriented subfolders (e.g., `src/core`, `src/services`).
- Mirror code layout under `tests/`; keep fixtures in `tests/fixtures` and sample configs in `tests/data`.
- Store helper automation in `scripts/` (setup, lint, data loading) and supporting docs in `docs/`.
- Add `assets/` only for static runtime needs; avoid committing large datasets or generated artifacts.

## Build, Test, and Development Commands
- Standardize via a `Makefile` or package scripts so contributors share one entrypoint set. Expected targets to add:
  - `make setup`: install dependencies into a local virtual environment.
  - `make lint`: run formatter + linter (e.g., `ruff`/`black` or `eslint`/`prettier` depending on language).
  - `make test`: execute the automated test suite headlessly.
  - `make run`: launch the primary entrypoint (CLI/server) for local development.
- Keep commands fast and idempotent; document language-specific details in `README` once tooling is chosen.

## Coding Style & Naming Conventions
- Prefer 4-space indentation, ~100-character lines, and final newline. Avoid mixed tabs/spaces.
- Use `snake_case` for modules/functions, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.
- Add type hints and docstrings for public functions; keep functions small and pure when possible.
- Enforce formatting/linting locally and in CI (formatter → linter → tests) before opening PRs.

## Testing Guidelines
- Co-locate tests under `tests/` mirroring module paths; name files `test_<module>.py` (or language-appropriate equivalent).
- Favor unit tests for logic; add integration tests for IO, network, or external services.
- Keep tests deterministic: mock external calls, time, and randomness; include edge cases and fixtures.
- Target >80% coverage once code exists; add regression tests for every bug fix.

## Commit & Pull Request Guidelines
- Use concise commits following Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- PR descriptions should state intent, list major changes, and note tests run; link issues/tasks.
- Include screenshots or logs for user-facing changes; update docs/tests alongside feature work.
- Seek early review for large efforts; keep PRs focused, with minimal unrelated refactors.

## Security & Configuration
- Store secrets in environment variables; publish `.env.example` with safe placeholders and setup notes.
- Do not commit API keys, tokens, or large data; extend `.gitignore` for local artifacts and build outputs.
- Document required external services or permissions next to setup steps in `README`.
