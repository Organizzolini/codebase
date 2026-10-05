---
type: Domain
title: Codebase Projects and Workflows
description: Detailed overview of applications, shared packages, tooling, and operational workflows.
tags: [domain, projects, workflows, nx]
---

# Codebase Projects and Workflows

This document outlines the core applications and packages managed within the codebase workspace.

## Applications

- **lexico**: TanStack Start web application providing dictionary search and interactive lexicon features. It connects with [lexico-entities](/openwiki/architecture/overview.md) for data access.
- **affirmations**: Python-based LangChain and Ollama affirmation generator utilizing LangGraph ReAct agents.
- **caelundas**: CLI ephemeris calendar generator performing precise astronomical calculations.
- **lexico-ingestion**: NestJS CLI application responsible for ingesting structured Latin dictionary corpora.

## Packages & Tooling

- **components-web**: Shared React UI component library built on shadcn/ui and Tailwind CSS.
- **lexico-entities**: TypeORM entities and GraphQL schema definitions shared across backend services.
- **synchronization**: Synchronization tooling ensuring codebase configuration consistency across packages.

Related documentation:
- Review the [Architecture Overview](/openwiki/architecture/overview.md) for system dependency graphs.
- Back to [Codebase Quickstart](/openwiki/quickstart.md).
