---
type: Reference
title: Codebase Quickstart
description: Quickstart entrypoint for OpenWiki knowledge base covering repository structure, projects, and local development.
tags: [quickstart, overview, codebase]
---

# Codebase Quickstart

Welcome to the OpenWiki knowledge base for the modern TypeScript codebase managed with Nx.

## Overview

This codebase contains a comprehensive set of TypeScript and Python packages and applications, including:
- **[affirmations](applications/affirmations)** - Python LangChain + Ollama affirmation generator
- **[caelundas](applications/caelundas)** - CLI ephemeris calendar generator
- **[lexico](applications/lexico)** - TanStack Start dictionary web application
- **[components-web](packages/components-web)** - Shared React UI components
- **[lexico-entities](packages/lexico-entities)** - TypeORM entities and GraphQL types
- **[lexico-ingestion](applications/lexico-ingestion)** - NestJS CLI app for dictionary ingestion
- **[synchronization](tools/synchronization)** - Codebase configuration synchronization tool

## Architecture & Workflows

For details on the system design and workflows, refer to:
- [Architecture Overview](/openwiki/architecture/overview.md)
- [Codebase Projects & Workflows](/openwiki/domain/projects.md)

## Backlog
- Add comprehensive API service mapping.
