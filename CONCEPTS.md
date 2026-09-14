# Concepts Reference — Frontend & Backend Integration

This document captures every concept from the DecodeLabs Project 4 training kit,
in the same order as the deck, with a note on exactly where each one is used in
this repo's code.

---

## 1. The Missing Link in Modern Applications

A UI with no backend is a static facade; a database with no frontend is an
inaccessible vault. Project 4 is about the bridge between the two — sending
requests, handling responses, and keeping the system usable when something
goes wrong.

> In this repo: `backend/` is the vault, `frontend/` is the facade, and
> `frontend/script.js` is the bridge.

## 2. The I-P-O Architecture (Input → Process → Output)

A full-stack request/response cycle has three stages:

1. **Input (Sensory / Frontend):** the browser initiates an HTTP request
   across the network (e.g. `GET /api/interns`).
2. **Process (Cognitive / Backend):** the server receives the request, runs
   routing/validation, queries the "database", and packages the result as
   JSON.
3. **Output (Motor / Frontend):** the frontend receives the payload and
   updates the DOM to reflect it.

Client and server are on separate hardware, communicating only through
stateless request/response messages — neither side remembers the other
between calls.

> In this repo: Stage 1 & 3 are `frontend/script.js`; Stage 2 is
> `backend/server.js`. Every route handler is commented with which stage it
> belongs to.

## 3. RESTful Principles & Idempotency

| Method | Action | Idempotent? | Used for |
|---|---|---|---|
| GET | Retrieve data | Yes | Listing / fetching one intern |
| POST | Create a resource | No | Adding a new intern |
| PUT | Replace a resource fully | Yes | (available; not wired to a button in the UI, but implemented in the API) |
| PATCH | Partial update | No | Editing a single intern's fields |
| DELETE | Remove a resource | Yes | Removing an intern |

**Core rule:** REST URIs use nouns, not verbs (`/interns`, never `/getInterns`),
and the server is stateless — every request must carry all context it needs
(no memory of the previous call).

> In this repo: see the route table in `backend/server.js` and the API
> reference table in `README.md`.

## 4. The Problem of the Frozen Webpage

JavaScript is single-threaded. If it stopped and waited for a network
response, the whole page would freeze. The fix is the **event loop** plus
**Promises** — a placeholder for a value that will exist later, in one of
three states: **pending → fulfilled or rejected**.

## 5. The Modern Mechanism: async/await

`async/await` is syntactic sugar over Promises. `await` pauses a function's
own execution until its Promise resolves, without blocking the browser's main
thread — and it only works inside a function marked `async`.

```js
// outdated: promise chains (deep nesting, hard to read)
fetch('/api/interns')
  .then(res => res.json())
  .then(data => renderInterns(data))
  .catch(err => showError(err));

// modern: async/await (this repo's style)
async function loadInterns() {
  try {
    const res = await fetch('/api/interns');
    const data = await res.json();
    renderInterns(data);
  } catch (err) {
    showError(err.message);
  }
}
```

> In this repo: every function in `frontend/script.js` that talks to the
> network is `async` and uses `await` — see `apiRequest()`.

## 6. The Native Skeleton: fetch()

`fetch()` is the browser's built-in tool for cross-network requests without a
page reload. It always returns a Promise. A full call has four parts:

- **Endpoint** — the URI being targeted (`/api/interns/3`)
- **Configuration** — the HTTP method (`GET`, `POST`, …)
- **Headers** — metadata like `Content-Type: application/json`
- **Payload** — the serialized body (`JSON.stringify(data)`)

> In this repo: `apiRequest()` in `frontend/script.js` builds exactly these
> four parts for every call.

## 7. Network Security & the CORS Barrier

The browser's Same-Origin Policy blocks a frontend from reading a response
from a different origin (domain/port) unless the server explicitly allows it
via the `Access-Control-Allow-Origin` header. For "non-simple" requests
(custom headers, or methods like `PUT`/`PATCH`/`DELETE`), the browser first
sends an invisible **preflight** `OPTIONS` request to ask permission before
sending the real one. If the server doesn't answer that preflight correctly,
the real request never leaves the browser.

> In this repo: `backend/server.js` uses the `cors` middleware so the API can
> be called from a frontend running on a different port. Run the frontend and
> backend on different ports (see `README.md`) and watch the `OPTIONS`
> request appear in your browser's Network tab before any `PATCH`/`DELETE`.

## 8. The Diagnostic Vocabulary: HTTP Status Codes

Professional code branches on the numeric status code, never by parsing an
error string.

| Range | Meaning | Examples used here |
|---|---|---|
| 2xx | Success | `200 OK`, `201 Created` |
| 4xx | Client error ("you messed up") | `400 Bad Request`, `404 Not Found` |
| 5xx | Server error ("we messed up") | `500 Internal Server Error` |

Always check `response.ok` (true only for 2xx) before trusting a response body.

> In this repo: every backend route returns a deliberate status code, and
> `apiRequest()` on the frontend checks `response.ok` before parsing further.

## 9. The Border Crossing: JSON Parsing & Serialization

Data travels the network only as raw text. JSON is the shared translator:

- `JSON.stringify(obj)` — **serialize** a JS object into text to send.
- `response.json()` — **deserialize** text back into a JS object on arrival.

JSON syntax is strict (double-quoted keys, no trailing commas), and
`JSON.stringify` silently drops functions, `undefined`, and `Symbol` values.

> In this repo: `apiRequest()` calls `JSON.stringify(body)` on the way out and
> `JSON.parse(text)` (equivalent to `response.json()`) on the way in.

## 10. UI Injection: Closing the I-P-O Loop

Once JSON is parsed into a JS array, the DOM is updated by looping over it
(e.g. with `.map()` or `forEach`) and creating real elements —
`document.createElement`, then `.textContent`, then `appendChild`. This forms
a **unidirectional data flow**: State → UI → Event → New State → …

**Security rule:** prefer `textContent` over `innerHTML` when inserting
server- or user-supplied data, to avoid Cross-Site Scripting (XSS).

> In this repo: `renderInterns()` in `frontend/script.js` builds every table
> row with `cloneNode` + `textContent`, never by injecting a data string as
> HTML.

## 11. The Shield: Defensive Programming with try/catch

Network requests are high-hazard: they can fail from a dropped connection, a
5xx error, or malformed JSON. The rules of engagement:

- **No silent failures** — never swallow an error into a blank screen.
- **Graceful degradation** — show a fallback UI or an actionable error message.
- **The `finally` block** — clean up (hide spinners, reset buttons) whether
  the call succeeded or failed.

> In this repo: every action (`loadInterns`, `handleAddSubmit`, `handlePatch`,
> `handleDelete`) wraps its `await` calls in `try/catch`, and uses `finally`
> to turn off loading/busy states. The error banner with **Retry** is the
> "graceful degradation" UI.

## 12. Intern Anti-Patterns → Senior Solutions

| Mistake | Result | Fix used in this repo |
|---|---|---|
| Forgetting `await` | UI tries to render a pending Promise | Every `fetch`/`.json()` call is `await`-ed |
| `await` inside a `for` loop | Requests run serially, one at a time | Not needed here (no batch calls), but `Promise.all()` is the fix when it comes up |
| Assuming a 404 won't throw | App crashes trying to parse HTML as JSON | `apiRequest()` checks `response.ok` and throws a clean `Error` before the caller ever touches the body |
| `console.log(error)` in production | Errors vanish silently for the user | Errors are surfaced in the UI's error banner, not just logged |

## 13. Synthesis — The Full Lifecycle in This App

1. User clicks an action (Add / Edit / Delete / Filter) → triggers an `async` handler.
2. `try` block opens (the "shield" activates).
3. `fetch()` fires; for non-GET requests the browser runs a CORS preflight first.
4. `await` pauses the function without freezing the page.
5. The response's status is checked (`response.ok`).
6. `response.json()` (well, `JSON.parse`) translates the reply back into a JS object.
7. On success: the DOM is updated via `createElement`/`textContent`.
   On failure: `catch` shows the error banner with a **Retry** button.
8. `finally` clears loading/busy state either way.

This is the same loop, repeated for every button in the UI.
