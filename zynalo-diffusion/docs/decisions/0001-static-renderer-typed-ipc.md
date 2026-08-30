# ADR 0001: Static renderer with typed Electron IPC

- Status: Accepted
- Date: 2026-08-26

## Context

Zynalo Diffusion is a packaged desktop application whose first milestone needs a local generation workflow and no web-service features. Running a bundled Next or local HTTP server would add a second application lifecycle, a listening network port, server routing, and a larger attack and packaging surface without helping the current desktop use case.

## Decision

Build React with Vite as static assets and load those assets through a privileged, secure `zynalo://app` protocol. The sandboxed renderer communicates with Electron only through a narrow typed preload bridge. The main process validates the sender and payload of every request before calling the `DiffusionEngine` abstraction.

Generated files are represented as asset references. The mock implementation uses `zynalo-asset://mock`; a production implementation can substitute validated references backed by application-managed storage.

## Consequences

The application packages and starts without a Next process, a local HTTP listener, or `file://` navigation. Process responsibilities remain clear and the engine can later be shared with Zynalo Studio behind the same contracts. Features that genuinely require server rendering or remote services must be evaluated separately instead of inheriting a server by default.
