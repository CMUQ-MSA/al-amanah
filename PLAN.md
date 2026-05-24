# CMU Qatar MSA Task Tracker

A lightweight task tracking system for the CMU Qatar Muslim Students Association (MSA) to manage event rosters, task assignments, and team coordination.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Core Logic Flows](#core-logic-flows)
- [Frontend Architecture](#frontend-architecture)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Security](#security)
- [Implementation Order](#implementation-order)

---

## Overview

### Constraints & Environment

- **Host**: Old laptop running Ubuntu Server (residential)
- **Goal**: Simple, lightweight, low-maintenance "vibe coding" project
- **Configuration**: All secrets managed via `.env` file
- **Deployment**: Docker-based for easy setup and maintenance

### Domain Model

We manage **Event Rosters** with the following hierarchy:

```
Semester (e.g., "Fall 2024")
  └── Week
       └── Event (e.g., "Jumuah", "Eid Prep")
            └── Task
```

### User Roles & Teams

| Role | Permissions |
|------|-------------|
| **Admin (Board)** | Create/edit everything, see all tasks |
| **Member** | See only tasks assigned to them |
| **Media Team** | Special group - tasks assigned to 'Media Team' visible to all media members, any can mark done |

### Task Types

| Type | Behavior |
|------|----------|
| **Standard** | Must be marked 'Done' |
| **Setup** | Informational only, no completion required |
| **Cannot Do** | Flag for blocked tasks (notifies admin) |

### Notification System (Discord Webhooks)

- **No creation spam**: Users not notified when tasks are created
- **Reminders**: User sets specific reminder time → system pings via Discord `<@userID>`
- **Admin Alerts**: "Cannot Do" immediately fires to private admin webhook

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Backend** | FastAPI (Python) | Async, fast, auto OpenAPI docs, minimal boilerplate |
| **Database** | SQLite | Zero config, single file, perfect for low-traffic |
| **ORM** | SQLAlchemy 2.0 | Mature, works great with SQLite and FastAPI |
| **Scheduler** | APScheduler | Lightweight, in-process, no Redis/Celery needed |
| **Frontend** | Vite + React + Tailwind | Fast builds, small bundle, utility-first CSS |
| **Auth** | Session cookies | Simpler than JWT for small teams |
| **Deployment** | Docker Compose + nginx | Easy to run and maintain |

### Why NOT other options?

- **Node/Express**: More boilerplate, async less elegant than FastAPI
- **PostgreSQL/MySQL**: Overkill for ~20-50 users
- **Celery/Redis**: Too heavy for simple scheduled reminders
- **Next.js/Nuxt**: SSR unnecessary, adds complexity

---

## Project Structure

```
al-amanah/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Pydantic settings from .env
│   │   ├── database.py             # SQLite connection & session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py             # User, Team, Role
│   │   │   ├── semester.py         # Semester
│   │   │   ├── week.py             # Week
│   │   │   ├── event.py            # Event
│   │   │   └── task.py             # Task (with types, flags)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── semester.py
│   │   │   ├── week.py
│   │   │   ├── event.py
│   │   │   └── task.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Login/logout/session
│   │   │   ├── semesters.py
│   │   │   ├── weeks.py
│   │   │   ├── events.py
│   │   │   └── tasks.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── discord.py          # Webhook utilities
│   │   │   └── scheduler.py        # APScheduler reminder logic
│   │   ├── middleware/
│   │   │   └── auth.py             # Session/cookie auth middleware
│   │   └── utils/
│   │       └── dates.py            # Week calculation helpers
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic/                    # Optional: DB migrations
│       └── ...
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts           # Fetch wrapper for API calls
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── WeekAccordion.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskBadge.tsx
│   │   │   └── CannotDoModal.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── AdminPanel.tsx      # Semester/Week/Event/Task CRUD
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useDashboard.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css         # Tailwind imports
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf                  # Reverse proxy config
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│    User      │
├──────────────┤
│ id (PK)      │
│ username     │
│ password_hash│
│ display_name │
│ discord_id   │◄──── For <@discord_id> pings
│ role         │◄──── ADMIN | MEMBER
│ team         │◄──── NULL | MEDIA
│ created_at   │
└──────┬───────┘
       │
       │ assigned_to (FK)
       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Semester   │──1:N─│    Week      │──1:N─│    Event     │──1:N─│    Task      │
├──────────────┤      ├──────────────┤      ├──────────────┤      ├──────────────┤
│ id (PK)      │      │ id (PK)      │      │ id (PK)      │      │ id (PK)      │
│ name         │      │ semester_id  │      │ week_id (FK) │      │ event_id(FK) │
│ start_date   │      │ week_number  │      │ name         │      │ title        │
│ end_date     │      │ start_date   │      │ datetime     │      │ description  │
│ is_active    │      │ end_date     │      │ location     │      │ task_type    │◄── STANDARD | SETUP
└──────────────┘      └──────────────┘      └──────────────┘      │ status       │◄── PENDING | DONE | CANNOT_DO
                                                                   │ assigned_to  │◄── user_id (FK) OR NULL
                                                                   │ assigned_team│◄── NULL | MEDIA
                                                                   │ reminder_time│◄── DateTime (nullable)
                                                                   │ reminder_sent│◄── Boolean
                                                                   │ cannot_do_reason│
                                                                   │ created_at   │
                                                                   │ updated_at   │
                                                                   └──────────────┘
```

### Key Design Decisions

1. **Team Assignment**: `assigned_team = "MEDIA"` means any Media member sees it. `assigned_to` is for individual assignment.
2. **Task Types**: `STANDARD` requires completion tick. `SETUP` is informational only.
3. **Status Flow**: `PENDING` → `DONE` or `PENDING` → `CANNOT_DO` (with reason).
4. **Reminder Logic**: `reminder_time` is set by user. `reminder_sent` prevents duplicate pings.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with username/password | Public |
| POST | `/api/auth/logout` | Clear session | User |
| GET | `/api/auth/me` | Get current user info | User |

### Semesters (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/semesters` | List all semesters |
| POST | `/api/semesters` | Create semester |
| PUT | `/api/semesters/{id}` | Update semester |
| DELETE | `/api/semesters/{id}` | Delete semester |

### Weeks (Admin Only for CUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/semesters/{id}/weeks` | List weeks in semester |
| POST | `/api/semesters/{id}/weeks` | Create week |
| PUT | `/api/weeks/{id}` | Update week |
| DELETE | `/api/weeks/{id}` | Delete week |

### Events (Admin Only for CUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weeks/{id}/events` | List events in week |
| POST | `/api/weeks/{id}/events` | Create event |
| PUT | `/api/events/{id}` | Update event |
| DELETE | `/api/events/{id}` | Delete event |

### Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/dashboard` | Get user's tasks (filtered view) | User |
| POST | `/api/events/{id}/tasks` | Create task | Admin |
| PUT | `/api/tasks/{id}` | Update task | Admin |
| DELETE | `/api/tasks/{id}` | Delete task | Admin |
| PATCH | `/api/tasks/{id}/done` | Mark task as done | Assignee |
| PATCH | `/api/tasks/{id}/cannot-do` | Flag task as blocked | Assignee |
| PATCH | `/api/tasks/{id}/reminder` | Set reminder time | Assignee |

### Users (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |

---

## Core Logic Flows

### A. Dashboard Data Flow

```
User opens Dashboard
        │
        ▼
GET /api/dashboard
        │
        ▼
┌───────────────────────────────────────┐
│ Backend Logic:                        │
│ 1. Get current user from session      │
│ 2. Get active semester                │
│ 3. Get all weeks in semester          │
│ 4. For each week, get events          │
│ 5. For each event, filter tasks:      │
│    - If user.role == ADMIN: all tasks │
│    - If user.team == MEDIA:           │
│      tasks where assigned_team=MEDIA  │
│      OR assigned_to=user.id           │
│    - Else: assigned_to=user.id only   │
│ 6. Calculate "current week" from date │
│ 7. Return structured JSON             │
└───────────────────────────────────────┘
        │
        ▼
Frontend renders:
- Past weeks: collapsed
- Current week: expanded
- Future weeks: collapsed but visible
```

### B. "Cannot Do" Flow

```
User clicks "Cannot Do" on Task
        │
        ▼
Modal opens → User enters reason
        │
        ▼
PATCH /api/tasks/{id}/cannot-do
Body: { "reason": "I have an exam" }
        │
        ▼
┌───────────────────────────────────────┐
│ Backend Logic:                        │
│ 1. Validate user is assignee          │
│ 2. Update task:                       │
│    - status = CANNOT_DO               │
│    - cannot_do_reason = reason        │
│ 3. IMMEDIATELY send Discord webhook:  │
│    POST to ADMIN_WEBHOOK_URL          │
│    Message: "⚠️ {user} flagged task   │
│    '{task.title}' as Cannot Do.       │
│    Reason: {reason}"                  │
│ 4. Return success                     │
└───────────────────────────────────────┘
```

### C. Reminder Scheduler Flow

```
┌─────────────────────────────────────────────┐
│ APScheduler Job (runs every 1 minute)       │
│                                             │
│ 1. Query tasks WHERE:                       │
│    - reminder_time <= NOW                   │
│    - reminder_sent = FALSE                  │
│    - status = PENDING                       │
│                                             │
│ 2. For each task:                           │
│    a. Get assigned user(s):                 │
│       - If assigned_to: get that user       │
│       - If assigned_team=MEDIA: get all     │
│         users where team=MEDIA              │
│    b. For each user with discord_id:        │
│       POST to REMINDER_WEBHOOK_URL          │
│       Message: "<@{discord_id}> Reminder:   │
│       Task '{task.title}' for event         │
│       '{event.name}' is due!"               │
│    c. Set task.reminder_sent = TRUE         │
└─────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ App                                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ AuthProvider (Context)                              │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Router                                          │ │ │
│ │ │  ├── /login → <Login />                         │ │ │
│ │ │  ├── /dashboard → <Dashboard />                 │ │ │
│ │ │  └── /admin → <AdminPanel /> (if admin)         │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "MSA Task Tracker"              [User ▼] [Logout]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Semester: Fall 2024 ──────────────────────────────────┐  │
│  │                                                        │  │
│  │  ┌─ Week 1 (Jan 13-19) ─────────────────── [▼ collapse]│  │
│  │  │  (Past - collapsed by default)                      │  │
│  │  └─────────────────────────────────────────────────────│  │
│  │                                                        │  │
│  │  ┌─ Week 2 (Jan 20-26) ★ CURRENT ──────── [▲ expanded]│  │
│  │  │                                                     │  │
│  │  │  ┌─ Event: Jumuah Prayer ─────────────────────────┐│  │
│  │  │  │  📍 HBKU Mosque | 🕐 Fri 12:30 PM              ││  │
│  │  │  │                                                 ││  │
│  │  │  │  ☐ Bring speaker equipment        [Set Reminder]││  │
│  │  │  │     └─ Assigned to: Ahmed                       ││  │
│  │  │  │                                                 ││  │
│  │  │  │  ☑ Setup chairs (Setup Task - no tick needed)  ││  │
│  │  │  │     └─ Assigned to: Media Team                  ││  │
│  │  │  │                                                 ││  │
│  │  │  │  ⚠️ Print flyers [CANNOT DO]                    ││  │
│  │  │  │     └─ Reason: "Printer broken"                 ││  │
│  │  │  └─────────────────────────────────────────────────┘│  │
│  │  │                                                     │  │
│  │  │  ┌─ Event: Halaqa ────────────────────────────────┐│  │
│  │  │  │  📍 LAS 2001 | 🕐 Thu 6:00 PM                  ││  │
│  │  │  │  ...                                            ││  │
│  │  │  └─────────────────────────────────────────────────┘│  │
│  │  └─────────────────────────────────────────────────────│  │
│  │                                                        │  │
│  │  ┌─ Week 3 (Jan 27 - Feb 2) ──────────── [▼ collapse]│  │
│  │  │  (Future - collapsed)                               │  │
│  │  └─────────────────────────────────────────────────────│  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Task Item States

```
Standard Task (Pending):
┌──────────────────────────────────────────────────┐
│ ☐ Task Title                      [⏰ Reminder]  │
│    Assigned to: You               [❌ Can't Do]  │
└──────────────────────────────────────────────────┘

Standard Task (Done):
┌──────────────────────────────────────────────────┐
│ ✅ Task Title (strikethrough)                    │
│    Completed by: You                             │
└──────────────────────────────────────────────────┘

Setup Task (Informational):
┌──────────────────────────────────────────────────┐
│ 🔧 Setup: Arrange chairs                         │
│    Assigned to: Media Team        (no checkbox)  │
└──────────────────────────────────────────────────┘

Cannot Do Task:
┌──────────────────────────────────────────────────┐
│ ⚠️ Task Title                      [BLOCKED]     │
│    Reason: "I have an exam that day"             │
└──────────────────────────────────────────────────┘
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# App
SECRET_KEY=your-super-secret-key-change-this
DEBUG=false

# Database
DATABASE_URL=sqlite:///./data/msa_tracker.db

# Discord Webhooks
REMINDER_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
ADMIN_WEBHOOK_URL=https://discord.com/api/webhooks/aaa/bbb

# First Admin User (created on first run)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
ADMIN_DISCORD_ID=<discord-user-id>
```

---

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=sqlite:///./data/msa_tracker.db
    env_file: .env
    volumes:
      - ./data:/app/data  # Persist SQLite DB
    expose:
      - "8000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    # Builds static files, copied to nginx

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - frontend_build:/usr/share/nginx/html
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  frontend_build:
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name _;

    # Serve React frontend
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to FastAPI
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Deployment Commands

```bash
# Clone and setup
git clone <repo-url>
cd al-amanah
cp .env.example .env
# Edit .env with your secrets

# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Security

| Concern | Solution |
|---------|----------|
| Passwords | Hashed with `bcrypt` via `passlib` |
| Sessions | Secure, HTTP-only cookies with `itsdangerous` signing |
| CORS | Locked to same origin (nginx handles both) |
| Input Validation | Pydantic schemas validate all input |
| SQL Injection | SQLAlchemy ORM prevents this |
| Rate Limiting | Optional: add `slowapi` if needed |

---

## Implementation Order

### Phase 1: Foundation
1. ✅ Set up project structure
2. ✅ Create `.env` and config loading
3. ✅ Set up SQLite + SQLAlchemy models
4. ✅ Create database initialization script

### Phase 2: Backend Core
5. ✅ Implement auth (login/logout/session)
6. ✅ Implement CRUD for Semesters, Weeks, Events
7. ✅ Implement Tasks with filtering logic
8. ✅ Implement Dashboard
