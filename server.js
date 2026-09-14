/**
 * DecodeLabs Full Stack Training - Project 4
 * Frontend & Backend Integration - Backend (Stage 2: "Process / Cognitive Vault")
 *
 * Responsibilities (per the I-P-O architecture):
 *   1. Receive the client's HTTP request (Input)
 *   2. Route it, validate it, and "query the database" (here: an in-memory array)
 *   3. Package the result into a JSON response (Output)
 *
 * Implements the REST method matrix from the training deck:
 *   GET    /api/interns       -> Retrieve all interns        (safe, idempotent)
 *   GET    /api/interns/:id   -> Retrieve one intern         (safe, idempotent)
 *   POST   /api/interns       -> Create a new intern         (NOT idempotent)
 *   PUT    /api/interns/:id   -> Replace an intern fully     (idempotent)
 *   PATCH  /api/interns/:id   -> Update part of an intern    (NOT idempotent)
 *   DELETE /api/interns/:id   -> Remove an intern            (idempotent)
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware -----------------------------------------------------------

// CORS: without this, a frontend running on a different origin (e.g. a
// live-server on port 5500) would be blocked by the browser's Same-Origin
// Policy, and every non-simple request (PUT/PATCH/DELETE, or POST with a
// JSON body) would fail its preflight OPTIONS check.
app.use(cors());

// Parse incoming JSON bodies (the "border crossing" - raw text -> JS object)
app.use(express.json());

// Tiny request logger so you can see the Input -> Process -> Output flow live
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// --- "Database" (in-memory store, stands in for a real DB) ----------------

let interns = [
  { id: 1, name: "Aarav Sharma", email: "aarav@example.com", role: "Frontend Intern", contact: "9876543210" },
  { id: 2, name: "Priya Nair", email: "priya@example.com", role: "Backend Intern", contact: "9876500011" },
  { id: 3, name: "Kabir Singh", email: "kabir@example.com", role: "Full Stack Intern", contact: "9876500022" },
];
let nextId = 4;

// --- Helpers ----------------------------------------------------------

function findInternIndex(id) {
  return interns.findIndex((i) => i.id === Number(id));
}

function isValidIntern(body, { partial = false } = {}) {
  const required = ["name", "email", "role"];
  if (partial) return true; // PATCH may send any subset of fields
  return required.every((field) => typeof body[field] === "string" && body[field].trim().length > 0);
}

// Simulates real-world latency so the frontend's loading state is visible
// (in production this delay is just "the network").
const NETWORK_DELAY_MS = 500;
function withDelay(fn) {
  return (req, res) => setTimeout(() => fn(req, res), NETWORK_DELAY_MS);
}

// --- Routes -----------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// GET /api/interns - list all (supports ?role= filter to show query params)
app.get(
  "/api/interns",
  withDelay((req, res) => {
    const { role } = req.query;
    const result = role
      ? interns.filter((i) => i.role.toLowerCase().includes(String(role).toLowerCase()))
      : interns;
    res.status(200).json({ count: result.length, data: result });
  })
);

// GET /api/interns/:id - single record
app.get(
  "/api/interns/:id",
  withDelay((req, res) => {
    const idx = findInternIndex(req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Intern not found" });
    }
    res.status(200).json({ data: interns[idx] });
  })
);

// POST /api/interns - create (201 Created, NOT idempotent)
app.post(
  "/api/interns",
  withDelay((req, res) => {
    const body = req.body || {};
    if (!isValidIntern(body)) {
      return res.status(400).json({ error: "name, email and role are required fields" });
    }
    const newIntern = {
      id: nextId++,
      name: body.name.trim(),
      email: body.email.trim(),
      role: body.role.trim(),
      contact: body.contact ? String(body.contact).trim() : "",
    };
    interns.push(newIntern);
    res.status(201).json({ data: newIntern });
  })
);

// PUT /api/interns/:id - full replace (idempotent)
app.put(
  "/api/interns/:id",
  withDelay((req, res) => {
    const idx = findInternIndex(req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Intern not found" });
    }
    const body = req.body || {};
    if (!isValidIntern(body)) {
      return res.status(400).json({ error: "name, email and role are required fields" });
    }
    interns[idx] = {
      id: interns[idx].id,
      name: body.name.trim(),
      email: body.email.trim(),
      role: body.role.trim(),
      contact: body.contact ? String(body.contact).trim() : "",
    };
    res.status(200).json({ data: interns[idx] });
  })
);

// PATCH /api/interns/:id - partial update (NOT idempotent in general)
app.patch(
  "/api/interns/:id",
  withDelay((req, res) => {
    const idx = findInternIndex(req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Intern not found" });
    }
    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update" });
    }
    interns[idx] = { ...interns[idx], ...body, id: interns[idx].id };
    res.status(200).json({ data: interns[idx] });
  })
);

// DELETE /api/interns/:id - remove (idempotent: deleting twice still "succeeds"
// from the client's perspective the 2nd time returns 404, which is expected)
app.delete(
  "/api/interns/:id",
  withDelay((req, res) => {
    const idx = findInternIndex(req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Intern not found" });
    }
    const [removed] = interns.splice(idx, 1);
    res.status(200).json({ data: removed });
  })
);

// Demo-only route: always throws a 500, so the frontend's error-handling
// path (the "Shield" / try-catch-finally from the training deck) can be
// exercised on purpose.
app.get(
  "/api/simulate-error",
  withDelay((req, res) => {
    res.status(500).json({ error: "Simulated internal server error" });
  })
);

// 404 fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Centralized error handler (5xx - "We messed up")
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend (Cognitive Vault) listening on http://localhost:${PORT}`);
});
