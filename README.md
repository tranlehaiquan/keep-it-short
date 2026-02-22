# Keep It Short

A simple URL shortener with a React frontend and a Hono backend.

## Features

- Shorten long URLs.
- Generate QR codes for shortened URLs.
- Copy shortened URLs to the clipboard.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Hono, Node.js, TypeScript
- **Database:** PostgreSQL, Redis

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- pnpm
- Docker

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/keep-it-short.git
    cd keep-it-short
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Set up environment variables:
    - Navigate to `apps/api` and copy `.env.example` to `.env`.
    - Update the `.env` file with your database and Redis credentials.

### Running the development servers

1.  Start the database and Redis using Docker:
    ```bash
    docker-compose up -d
    ```
2.  Run the database migrations:
    ```bash
    pnpm db:migrate
    ```
3.  Start the development servers for both the `api` and `web` apps:
    ```bash
    pnpm dev
    ```

## Architecture

Below is a high-level flow of how the **web** and **api** components interact:

```mermaid
flowchart LR
    subgraph Web["Web Client"]
        U[User Browser]
        F[React/Vite Frontend]
    end
    subgraph API["Backend"]
        S[Hono Node Server]
        D[(PostgreSQL/Redis)]
    end
    U --> F
    F -->|HTTP requests| S
    S --> D
    S --> F
```

This diagram illustrates a user browsing the React frontend which calls the Hono-based API. The API handles business logic, interacts with the database/Redis, and returns responses back to the front end.

## Available Scripts

### Root

- `pnpm dev`: Starts the development servers for both the `api` and `web` apps.
- `pnpm build`: Builds both the `api` and `web` apps.
- `pnpm start`: Starts the `api` server.

### `apps/api`

- `pnpm dev`: Starts the `api` development server.
- `pnpm build`: Builds the `api` app.
- `pnpm start`: Starts the `api` app in production mode.
- `pnpm db:generate`: Generates database migration files.
- `pnpm db:push`: Pushes schema changes to the database.
- `pnpm db:migrate`: Runs database migrations.

### `apps/web`

- `pnpm dev`: Starts the `web` development server.
- `pnpm build`: Builds the `web` app.
- `pnpm preview`: Previews the `web` app in production mode.
