---
type: Architecture
title: Codebase Architecture Overview
description: High-level architectural design of the Nx codebase, packages, services, and tooling integration.
tags: [architecture, codebase, nx, TypeScript, Python]
---

# Architecture Overview

```mermaid
flowchart TD
    subgraph Apps [Applications]
        Lexico[lexico - TanStack Start]
        Affirmations[affirmations - Python]
        Caelundas[caelundas - CLI]
        LexicoIngestion[lexico-ingestion - NestJS]
    end

    subgraph Packages [Shared Packages]
        ComponentsWeb[components-web]
        LexicoEntities[lexico-entities]
    end

    subgraph Tools [Nx & Synchronization Tools]
        Synchronization[synchronization]
        Conformance[conformance]
    end

    Lexico --> ComponentsWeb
    Lexico --> LexicoEntities
    LexicoIngestion --> LexicoEntities
    Synchronization --> Apps
    Synchronization --> Packages
```

## System Structure

The codebase uses `pnpm` workspaces and `Nx` to coordinate builds, tests, and linting across TypeScript and Python workloads.

- **Frontend & Web**: [`lexico`](applications/lexico) depends on shared packages like [`components-web`](packages/components-web) and [`lexico-entities`](packages/lexico-entities).
- **Backend & Data**: [`lexico-ingestion`](applications/lexico-ingestion) manages data persistence using TypeORM and PostgreSQL.
- **Python Workloads**: [`affirmations`](applications/affirmations) integrates LangChain, Ollama, and LangGraph.

Related documentation:
- See [Codebase Projects & Workflows](/openwiki/domain/projects.md) for detailed task execution and tool integrations.
- Return to [Codebase Quickstart](/openwiki/quickstart.md) for the main navigation hub.
