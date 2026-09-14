/**
 * DecodeLabs Full Stack Training - Project 4
 * Frontend & Backend Integration - Frontend (Stage 1 & 3: "Sensory Interface" / "Motor Output")
 *
 * Demonstrates, end to end:
 *  - fetch() with method/headers/body (POST, PUT, PATCH, DELETE)
 *  - async/await instead of chained .then()
 *  - checking response.ok / status before trusting a response
 *  - JSON.stringify() (request) / response.json() (response)
 *  - defensive try/catch/finally around every network call
 *  - dynamic DOM injection using createElement + textContent (never innerHTML
 *    with server data, to avoid XSS)
 */

const API_BASE = "http://localhost:5000/api";

// --- DOM references --------------------------------------------------------

const els = {
  connDot: document.getElementById("connDot"),
  connLabel: document.getElementById("connLabel"),
  feOrigin: document.getElementById("feOrigin"),
  apiBase: document.getElementById("apiBase"),
  errorBanner: document.getElementById("errorBanner"),
  errorText: document.getElementById("errorText"),
  errorRetry: document.getElementById("errorRetry"),
  errorDismiss: document.getElementById("errorDismiss"),
  addForm: document.getElementById("addForm"),
  internsBody: document.getElementById("internsBody"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  rowTemplate: document.getElementById("rowTemplate"),
  roleFilter: document.getElementById("roleFilter"),
  simulateErrorBtn: document.getElementById("simulateErrorBtn"),
};

els.feOrigin.textContent = window.location.origin || "file://";
els.apiBase.textContent = API_BASE;

let lastAction = () => loadInterns(); // used by the banner's "Retry" button
let filterDebounce = null;

// --- UI helpers -------------------------------------------------------------

function setConnection(state) {
  els.connDot.className = `dot dot--${state}`;
  els.connLabel.textContent =
    state === "ok" ? "Backend connected" : state === "bad" ? "Backend unreachable" : "Checking backend\u2026";
}

function showError(message, retryFn) {
  els.errorText.textContent = message;
  els.errorBanner.hidden = false;
  if (retryFn) lastAction = retryFn;
}

function clearError() {
  els.errorBanner.hidden = true;
}

function setLoading(isLoading) {
  els.loadingState.hidden = !isLoading;
  if (isLoading) els.emptyState.hidden = true;
}

function setButtonBusy(button, isBusy) {
  const label = button.querySelector(".btn-label");
  const spinner = button.querySelector(".btn-spinner");
  button.disabled = isBusy;
  if (spinner) spinner.hidden = !isBusy;
  if (label) label.style.opacity = isBusy ? 0.5 : 1;
}

// --- Core fetch wrapper ------------------------------------------------------
// Every call in this file goes through here, so error handling and JSON
// parsing rules are defined exactly once.

async function apiRequest(path, { method = "GET", body } = {}) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body); // Serialization: JS object -> wire text
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (networkErr) {
    // fetch() only rejects on a genuine network failure (offline, DNS,
    // CORS block) - never on a 4xx/5xx, which still resolves normally.
    throw new Error("Could not reach the backend. Is the server running?");
  }

  // Deserialization: wire text -> JS object. Guard against an empty 204 body.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (data && data.error) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// --- Rendering ---------------------------------------------------------------

function renderInterns(interns) {
  els.internsBody.innerHTML = ""; // clearing is fine; we never inject raw HTML back in

  if (interns.length === 0) {
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  interns.forEach((intern) => {
    const row = els.rowTemplate.content.firstElementChild.cloneNode(true);

    row.dataset.id = intern.id;
    row.querySelector(".col-id code").textContent = `#${intern.id}`;
    row.querySelector(".cell-name").textContent = intern.name;
    row.querySelector(".cell-email").textContent = intern.email;
    row.querySelector(".cell-role").textContent = intern.role;
    row.querySelector(".cell-contact").textContent = intern.contact || "\u2014";

    row.querySelector(".btn--edit").addEventListener("click", () => enterEditMode(row, intern));
    row.querySelector(".btn--delete").addEventListener("click", () => handleDelete(intern));

    els.internsBody.appendChild(row); // DOM injection via a real node, not innerHTML
  });
}

function enterEditMode(row, intern) {
  const nameCell = row.querySelector(".cell-name");
  const roleCell = row.querySelector(".cell-role");
  const contactCell = row.querySelector(".cell-contact");
  const actionsCell = row.querySelector(".col-actions");

  const nameInput = document.createElement("input");
  nameInput.value = intern.name;
  const roleInput = document.createElement("input");
  roleInput.value = intern.role;
  const contactInput = document.createElement("input");
  contactInput.value = intern.contact || "";

  nameCell.textContent = "";
  nameCell.appendChild(nameInput);
  roleCell.textContent = "";
  roleCell.appendChild(roleInput);
  contactCell.textContent = "";
  contactCell.appendChild(contactInput);

  actionsCell.innerHTML = ""; // safe here: no server-controlled data involved
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn--small btn--save";
  saveBtn.textContent = "Save";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--small btn--ghost";
  cancelBtn.textContent = "Cancel";

  cancelBtn.addEventListener("click", () => loadInterns());
  saveBtn.addEventListener("click", () =>
    handlePatch(intern.id, {
      name: nameInput.value.trim(),
      role: roleInput.value.trim(),
      contact: contactInput.value.trim(),
    })
  );

  actionsCell.appendChild(saveBtn);
  actionsCell.appendChild(cancelBtn);
}

// --- Actions (each: try -> await -> update UI -> catch -> finally) ----------

async function loadInterns() {
  clearError();
  setLoading(true);
  const role = els.roleFilter.value.trim();
  const query = role ? `?role=${encodeURIComponent(role)}` : "";

  try {
    const { data } = await apiRequest(`/interns${query}`);
    renderInterns(data);
    setConnection("ok");
  } catch (err) {
    setConnection("bad");
    showError(err.message, loadInterns);
    renderInterns([]);
  } finally {
    setLoading(false);
  }
}

async function handleAddSubmit(event) {
  event.preventDefault();
  clearError();
  const form = event.target;
  const submitBtn = form.querySelector("button[type=submit]");
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    role: form.role.value.trim(),
    contact: form.contact.value.trim(),
  };

  setButtonBusy(submitBtn, true);
  try {
    await apiRequest("/interns", { method: "POST", body: payload });
    form.reset();
    await loadInterns();
  } catch (err) {
    showError(err.message, () => handleAddSubmit(event));
  } finally {
    setButtonBusy(submitBtn, false);
  }
}

async function handlePatch(id, partialBody) {
  clearError();
  try {
    await apiRequest(`/interns/${id}`, { method: "PATCH", body: partialBody });
    await loadInterns();
  } catch (err) {
    showError(err.message, () => handlePatch(id, partialBody));
  }
}

async function handleDelete(intern) {
  const confirmed = window.confirm(`Remove ${intern.name} from the directory?`);
  if (!confirmed) return;

  clearError();
  try {
    await apiRequest(`/interns/${intern.id}`, { method: "DELETE" });
    await loadInterns();
  } catch (err) {
    showError(err.message, () => handleDelete(intern));
  }
}

async function handleSimulateError() {
  clearError();
  try {
    await apiRequest("/simulate-error");
  } catch (err) {
    // Expected: the backend deliberately returns a 500 on this route.
    showError(`Simulated failure handled gracefully: ${err.message}`, null);
  }
}

async function checkHealth() {
  try {
    await apiRequest("/health");
    setConnection("ok");
  } catch (err) {
    setConnection("bad");
  }
}

// --- Wiring -------------------------------------------------------------

els.addForm.addEventListener("submit", handleAddSubmit);
els.errorRetry.addEventListener("click", () => {
  clearError();
  lastAction();
});
els.errorDismiss.addEventListener("click", clearError);
els.simulateErrorBtn.addEventListener("click", handleSimulateError);

els.roleFilter.addEventListener("input", () => {
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(loadInterns, 300); // avoid firing a request per keystroke
});

checkHealth();
loadInterns();
