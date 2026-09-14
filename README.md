# Project 4 — Frontend & Backend Integration
DecodeLabs Full Stack Development Industrial Training Kit

A small but complete **Intern Directory** app. The frontend (vanilla HTML/CSS/JS)
talks to a real Express REST API over the network — this is the "nervous system"
described in the training deck, built and wired end to end.

## What it demonstrates

| Requirement (from the brief) | Where it lives |
|---|---|
| Send requests from frontend to backend | `frontend/script.js` → `apiRequest()`, used by every action |
| Display dynamic data on UI | `renderInterns()` — builds table rows from the API's JSON response |
| Handle basic errors and responses | `apiRequest()` checks `response.ok`; every action wraps its call in `try/catch/finally`; a dismissible error banner with **Retry** appears on failure |
| API integration | Full REST verb set — `GET / POST / PUT / PATCH / DELETE` — against `/api/interns` |
| Asynchronous requests | `async/await` throughout, no `.then()` chains |
| Full stack flow | Express server (Node) ↔ fetch() (browser), CORS-enabled, JSON in both directions |

Extra touches that map to the deck's specific talking points:
- **HTTP status codes drive logic**, not string-matching: 200/201 success, 400 bad input, 404 not found, 500 server error.
- **CORS is actually exercised** — run the frontend on a different port than the API (instructions below) and you'll see the real preflight `OPTIONS` request in the Network tab for `PUT`/`PATCH`/`DELETE`.
- **DOM injection uses `createElement` + `textContent`**, never `innerHTML` on server data, exactly per the deck's XSS warning.
- A **"Simulate a failed request"** button intentionally triggers a `500` so you can see the error-handling path fire without needing to unplug anything.

## Project structure

```
project4/
├── backend/
│   ├── server.js       # Express REST API (in-memory "database")
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js        # all fetch() calls live here
└── README.md
```

## Running it

**1. Start the backend**
```bash
cd backend
npm install
npm start
```
This starts the API at `http://localhost:5000`. Try it directly:
```bash
curl http://localhost:5000/api/interns
```

**2. Serve the frontend**
Because `fetch()` calls a different port, open `frontend/index.html` with any
static file server (opening it as a bare `file://` URL also works for this demo,
since the API allows all origins). For example, with Node already installed:
```bash
cd frontend
npx serve .
```
Then open the printed local URL (e.g. `http://localhost:3000`) in your browser.

**3. Use the app**
- The sidebar shows a live **connection status** (checks `GET /api/health` on load).
- Add an intern with the form — this fires a `POST`.
- Click **Edit** on any row to turn it into inputs, then **Save** to fire a `PATCH`.
- Click **Delete** to fire a `DELETE` (with a confirmation prompt).
- Type in **Filter by role** to fire a `GET` with a query string (`?role=...`).
- Click **Simulate a failed request** to see the error banner and Retry flow.

## API reference

| Method | Route | Purpose | Idempotent? |
|---|---|---|---|
| GET | `/api/interns` | List all interns (optional `?role=` filter) | Yes |
| GET | `/api/interns/:id` | Get one intern | Yes |
| POST | `/api/interns` | Create an intern | No |
| PUT | `/api/interns/:id` | Replace an intern fully | Yes |
| PATCH | `/api/interns/:id` | Update part of an intern | No |
| DELETE | `/api/interns/:id` | Remove an intern | Yes |
| GET | `/api/simulate-error` | Always returns 500, for testing | Yes |
| GET | `/api/health` | Health check | Yes |

All error responses are JSON: `{ "error": "message" }`, with the matching HTTP status code.

## Concepts reference

Every concept from the training deck — I-P-O architecture, REST & idempotency,
async/await, fetch() anatomy, CORS & preflight, HTTP status codes, JSON
serialization, DOM injection, defensive `try/catch`, and the intern
anti-patterns table — is written up in [`docs/CONCEPTS.md`](docs/CONCEPTS.md),
each with a pointer to where it's implemented in this code.

## Notes

- The "database" is an in-memory array, so data resets whenever the server restarts — this keeps the project runnable anywhere with zero setup, while every concept (validation, status codes, async flow) works exactly as it would against a real database.
- To point the frontend at a different backend URL (e.g. after deploying), change the single `API_BASE` constant at the top of `script.js`.
