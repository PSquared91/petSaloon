/* ==========================================================================
   Paw Patrol Pet Salon — App Logic (Merged)
   Features: Register pets, list as cards/table, search, delete, stats, localStorage
   Assignment: Visual validation only (no alerts/confirm); red borders; reset on success
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- 0) Global guard: disable alert() by policy ---------- */
  // No popups; we only use visual cues.
  window.alert = function () { /* no-op */ };

  /* ---------- 1) Constants ---------- */
  const STORAGE_KEY = "pet-salon:pets";
  const CONFIRM_TIMEOUT_MS = 2000; // two-click confirm window

  /* ---------- 2) State ---------- */
  /** @type {Array<{
   *  id:string, name:string, type:string, age:number, breed?:string,
   *  service:string, owner:string, phone:string,
   *  color?:string, colorName?:string, notes?:string
   * }>} */
  let pets = [];

  // track arming state for confirm buttons (id -> timeoutId)
  const confirmArmed = new Map();

  /* ---------- 3) DOM helpers ---------- */
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  /* ---------- 4) Utils ---------- */
  const uid = () =>
    "p_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  const escapeHtml = (str) =>
    (str ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const debounce = (fn, wait = 180) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  /* ---------- 5) Persistence ---------- */
  function loadPets() {
    try {
      pets = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      pets = [];
    }
  }

  function savePets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
    refreshUI();
  }

  /* ---------- 6) CRUD ---------- */
  function addPet(p) {
    pets.push(p);
    savePets();
  }

  function deletePet(id) {
    pets = pets.filter((p) => p.id !== id);
    savePets();
  }

  /* ---------- 7) Rendering ---------- */
  function petCard(p) {
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card card-pet h-100">
          <div class="card-body">
            <div class="d-flex align-items-start justify-content-between">
              <div>
                <h5 class="card-title mb-1">
                  ${escapeHtml(p.name)}
                  <span class="badge badge-service">${escapeHtml(p.service)}</span>
                </h5>
                <div class="text-muted small">
                  ${escapeHtml(p.type)} • ${Number(p.age) || 0} yrs${p.breed ? " • " + escapeHtml(p.breed) : ""}
                </div>
              </div>
              <span class="color-dot ms-2" style="background:${p.color || "#ccc"}" title="${p.colorName || p.color || ""}"></span>
            </div>
            <hr/>
            <div class="small">
              <div><strong>Owner:</strong> ${escapeHtml(p.owner)} • ${escapeHtml(p.phone)}</div>
              ${p.notes ? `<div class="mt-1">${escapeHtml(p.notes)}</div>` : ""}
            </div>
          </div>
          <div class="card-footer bg-transparent d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-danger" onclick="handleDelete('${p.id}', this)">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCards(list) {
    const el = byId("cardsView");
    if (el) el.innerHTML = list.map(petCard).join("");
  }

  function renderTable(list) {
    const tbody = byId("tableBody");
    if (!tbody) return;
    tbody.innerHTML = list
      .map(
        (p) => `
        <tr>
          <td class="fw-semibold">${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.type)}</td>
          <td>${Number(p.age) || 0}</td>
          <td>${escapeHtml(p.breed || "")}</td>
          <td><span class="badge badge-service">${escapeHtml(p.service)}</span></td>
          <td>${escapeHtml(p.owner)}</td>
          <td>${escapeHtml(p.phone)}</td>
          <td><span class="color-dot" style="background:${p.color || "#ccc"}"></span> ${
            p.colorName ? `<span class="ms-1">${escapeHtml(p.colorName)}</span>` : ""
          }</td>
          <td>${escapeHtml(p.notes || "")}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" onclick="handleDelete('${p.id}', this)">Delete</button>
          </td>
        </tr>`
      )
      .join("");
  }

  function refreshStats(list) {
    const total = byId("statTotal");
    const dogs = byId("statDogs");
    const cats = byId("statCats");
    if (total) total.textContent = list.length;
    if (dogs) dogs.textContent = list.filter((p) => p.type === "Dog").length;
    if (cats) cats.textContent = list.filter((p) => p.type === "Cat").length;

    // Optional: home page stats (#petCount, #avgAge) if present
    const petCount = byId("petCount");
    const avgAge = byId("avgAge");
    if (petCount) petCount.textContent = list.length;
    if (avgAge) {
      const ages = list.map((p) => Number(p.age) || 0);
      const mean = ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      avgAge.textContent = Number.isFinite(mean) ? mean.toFixed(1) : "0";
    }
  }

  function refreshUI() {
    const qEl = byId("search");
    const q = qEl ? qEl.value.trim().toLowerCase() : "";
    const filtered = !q
      ? pets
      : pets.filter((p) => {
          const hay = [p.name, p.type, p.owner, p.phone, p.service, p.breed, p.notes, p.colorName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });

    renderCards(filtered);
    renderTable(filtered);
    refreshStats(filtered);
  }

  /* ---------- 8) Form helpers ---------- */
  function getFormData() {
    return {
      id: uid(),
      name: byId("name").value.trim(),
      type: byId("type").value,
      age: parseInt(byId("age").value, 10) || 0,
      breed: byId("breed").value.trim(),
      service: byId("service").value,
      owner: byId("owner").value.trim(),
      phone: byId("phone").value.trim(),
      color: byId("color").value || "#ccc",
      colorName: byId("colorName").value.trim(),
      notes: byId("notes").value.trim(),
    };
  }

  function clearForm() {
    const form = byId("petForm");
    if (form) form.reset();
    if (byId("color")) byId("color").value = "#6f42c1";
    if (byId("colorName")) byId("colorName").value = "";
    // remove invalid visuals
    removeInvalids(form || document);
  }

  /* ---------- 8.1) Visual validation (assignment) ---------- */
  function markInvalid(el) {
    if (!el) return;
    el.classList.add("is-invalid");
  }
  function unmarkInvalid(el) {
    if (!el) return;
    el.classList.remove("is-invalid");
  }
  function removeInvalids(scope = document) {
    scope.querySelectorAll(".is-invalid").forEach((n) => n.classList.remove("is-invalid"));
  }

  // Validate required fields without popups
  function validatePetForm() {
    const requiredIds = ["name", "type", "age", "service", "owner", "phone"];
    let ok = true;
    requiredIds.forEach((id) => {
      const el = byId(id);
      if (!el) return;
      const val = (el.value || "").trim();
      unmarkInvalid(el);

      if (!val) {
        markInvalid(el);
        ok = false;
        return;
      }

      if (id === "age") {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) {
          markInvalid(el);
          ok = false;
        }
      }
      if (id === "phone") {
        // very lenient phone check; adjust as you like
        if (val.length < 7) {
          markInvalid(el);
          ok = false;
        }
      }
    });
    return ok;
  }

  /* ---------- 9) Events & Wiring ---------- */
  function armButtonForConfirm(btn, armedLabel = "Confirm", originalLabel = "Delete") {
    if (!btn) return;

    // already armed? perform action on next handler call
    if (btn.dataset.arm === "1") return true;

    // arm it now
    btn.dataset.arm = "1";
    btn.dataset.orig = originalLabel;
    btn.textContent = armedLabel;
    btn.classList.add("btn-danger");

    // auto-disarm after timeout
    const t = setTimeout(() => {
      disarmButton(btn);
    }, CONFIRM_TIMEOUT_MS);

    confirmArmed.set(btn, t);
    return false;
  }

  function disarmButton(btn) {
    if (!btn) return;
    btn.dataset.arm = "";
    btn.textContent = btn.dataset.orig || "Delete";
    btn.classList.remove("btn-danger");
    const t = confirmArmed.get(btn);
    if (t) {
      clearTimeout(t);
      confirmArmed.delete(btn);
    }
  }

  function wireUI() {
    // footer year
    const year = byId("year");
    if (year) year.textContent = new Date().getFullYear();

    // View toggles
    const btnCards = byId("btnCards");
    const btnTable = byId("btnTable");
    if (btnCards) {
      btnCards.addEventListener("click", () => {
        const cards = byId("cardsView");
        const table = byId("tableView");
        if (cards) cards.classList.remove("d-none");
        if (table) table.classList.add("d-none");
        refreshUI();
      });
    }
    if (btnTable) {
      btnTable.addEventListener("click", () => {
        const cards = byId("cardsView");
        const table = byId("tableView");
        if (cards) cards.classList.add("d-none");
        if (table) table.classList.remove("d-none");
        refreshUI();
      });
    }

    // Bulk clear (two-click confirm, no popups)
    const btnClearAll = byId("btnClearAll");
    if (btnClearAll) {
      btnClearAll.addEventListener("click", () => {
        // first click arms the button
        if (!armButtonForConfirm(btnClearAll, "Confirm", "Clear All")) return;
        // second click (within timeout) performs the action
        pets = [];
        savePets();
        disarmButton(btnClearAll);
      });
    }

    // Search (debounced)
    const search = byId("search");
    const btnClearSearch = byId("btnClearSearch");
    if (search) search.addEventListener("input", debounce(refreshUI, 150));
    if (btnClearSearch) {
      btnClearSearch.addEventListener("click", () => {
        if (search) search.value = "";
        refreshUI();
      });
    }

    // Form validation + submit (visual only)
    const form = byId("petForm");
    if (form) {
      // clear invalid class while typing
      form.addEventListener("input", (e) => {
        const t = e.target;
        if (t && (t.matches("input,select,textarea"))) unmarkInvalid(t);
      });
      form.addEventListener("change", (e) => {
        const t = e.target;
        if (t && (t.matches("input,select,textarea"))) unmarkInvalid(t);
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // remove Bootstrap's was-validated pattern in favor of our visual style
        form.classList.remove("was-validated");
        removeInvalids(form);

        if (!validatePetForm()) {
          // just highlight invalid fields; no alerts
          return;
        }

        addPet(getFormData());
        clearForm(); // also removes red borders
      });
    }
  }

  /* ---------- 10) Global for inline delete handlers ---------- */
  // Inline buttons call handleDelete(id, this)
  window.handleDelete = (id, btn) => {
    // two-click confirm
    if (!armButtonForConfirm(btn, "Confirm", "Delete")) return;
    deletePet(id);
    disarmButton(btn);
  };

  /* ---------- 11) Init ---------- */
  function init() {
    loadPets();
    wireUI();
    refreshUI();
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
