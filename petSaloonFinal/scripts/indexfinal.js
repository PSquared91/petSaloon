/* ==========================================================================
   Paw Patrol Pet Salon — App Logic (Merged + Option B + jQuery service form)
   - Pets app (cards/table/search/delete/localStorage)
   - Services page: deep-link to registration with ?service=
   - Registration page: prefill service from ?service=
   - Service Registration form (assignment): jQuery red-border validation (no alerts),
     create Service object, clear form, remove borders
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- 0) Global guard: disable alert() by policy ---------- */
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
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
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

  // Build registration URL with ?service=
  function linkToRegistration(serviceName = "") {
    const url = new URL("registration.html", window.location.href);
    if (serviceName && typeof serviceName === "string") {
      url.searchParams.set("service", serviceName);
    }
    return url.toString();
  }

  // Prefill the Service <select> from ?service= (supports id="service" or "petService")
  function prefillServiceFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("service");
    const svc = raw ? decodeURIComponent(raw).replace(/\+/g, " ").trim() : "";
    if (!svc) return;

    const sel = byId("service") || byId("petService");
    if (!sel) return;

    const options = Array.from(sel.options);
    // Try visible text (case-insensitive)
    const matchText = options.find(o => o.text.trim().toLowerCase() === svc.toLowerCase());
    if (matchText) { sel.value = matchText.value; return; }
    // Fallback: value match
    const matchVal = options.find(o => (o.value || "").trim().toLowerCase() === svc.toLowerCase());
    if (matchVal) sel.value = matchVal.value;
  }

  /* ---------- 5) Persistence ---------- */
  function loadPets() {
    try { pets = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { pets = []; }
  }
  function savePets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
    refreshUI();
  }

  /* ---------- 6) CRUD ---------- */
  function addPet(p) { pets.push(p); savePets(); }
  function deletePet(id) { pets = pets.filter(p => p.id !== id); savePets(); }

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
    tbody.innerHTML = list.map(p => `
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
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" onclick="handleDelete('${p.id}', this)">Delete</button></td>
      </tr>
    `).join("");
  }

  function refreshStats(list) {
    const total = byId("statTotal");
    const dogs = byId("statDogs");
    const cats = byId("statCats");
    if (total) total.textContent = list.length;
    if (dogs) dogs.textContent = list.filter(p => p.type === "Dog").length;
    if (cats) cats.textContent = list.filter(p => p.type === "Cat").length;

    const petCount = byId("petCount");
    const avgAge = byId("avgAge");
    if (petCount) petCount.textContent = list.length;
    if (avgAge) {
      const ages = list.map(p => Number(p.age) || 0);
      const mean = ages.length ? (ages.reduce((a,b)=>a+b,0)/ages.length) : 0;
      avgAge.textContent = Number.isFinite(mean) ? mean.toFixed(1) : "0";
    }
  }

  function refreshUI() {
    const qEl = byId("search");
    const q = qEl ? qEl.value.trim().toLowerCase() : "";
    const filtered = !q ? pets : pets.filter(p => {
      const hay = [p.name, p.type, p.owner, p.phone, p.service, p.breed, p.notes, p.colorName]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });

    renderCards(filtered);
    renderTable(filtered);
    refreshStats(filtered);
  }

  /* ---------- 8) Form helpers (pet form) ---------- */
  function getFormData() {
    return {
      id: uid(),
      name: byId("name")?.value.trim() || "",
      type: byId("type")?.value || "",
      age: parseInt(byId("age")?.value, 10) || 0,
      breed: byId("breed")?.value.trim() || "",
      service: byId("service")?.value || byId("petService")?.value || "",
      owner: byId("owner")?.value.trim() || "",
      phone: byId("phone")?.value.trim() || "",
      color: byId("color")?.value || "#ccc",
      colorName: byId("colorName")?.value.trim() || "",
      notes: byId("notes")?.value.trim() || "",
    };
  }

  function clearForm() {
    const form = byId("petForm");
    if (form) form.reset();
    if (byId("color")) byId("color").value = "#6f42c1";
    if (byId("colorName")) byId("colorName").value = "";
    removeInvalids(form || document);
  }

  /* ---------- 8.1) Visual validation (pet form) ---------- */
  function markInvalid(el) { if (el) el.classList.add("is-invalid"); }
  function unmarkInvalid(el) { if (el) el.classList.remove("is-invalid"); }
  function removeInvalids(scope = document) {
    scope.querySelectorAll(".is-invalid").forEach(n => n.classList.remove("is-invalid"));
  }

  function validatePetForm() {
    const requiredIds = ["name", "type", "age", "service", "owner", "phone"];
    let ok = true;
    requiredIds.forEach((id) => {
      const el = byId(id) || byId(id === "service" ? "petService" : "");
      if (!el) return;
      const val = (el.value || "").trim();
      unmarkInvalid(el);

      if (!val) { markInvalid(el); ok = false; return; }
      if (id === "age") {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) { markInvalid(el); ok = false; }
      }
      if (id === "phone" && val.length < 7) { markInvalid(el); ok = false; }
    });
    return ok;
  }

  /* ---------- 9) Events & Wiring (pets, services deep links, registration prefill) ---------- */
  function armButtonForConfirm(btn, armedLabel = "Confirm", originalLabel = "Delete") {
    if (!btn) return;
    if (btn.dataset.arm === "1") return true;
    btn.dataset.arm = "1";
    btn.dataset.orig = originalLabel;
    btn.textContent = armedLabel;
    btn.classList.add("btn-danger");
    const t = setTimeout(() => { disarmButton(btn); }, CONFIRM_TIMEOUT_MS);
    confirmArmed.set(btn, t);
    return false;
  }
  function disarmButton(btn) {
    if (!btn) return;
    btn.dataset.arm = "";
    btn.textContent = btn.dataset.orig || "Delete";
    btn.classList.remove("btn-danger");
    const t = confirmArmed.get(btn);
    if (t) { clearTimeout(t); confirmArmed.delete(btn); }
  }

  // Services page deep-links
  function wireServicesDeepLinks() {
    $$(".js-book-link").forEach((a) => {
      const svc = a.getAttribute("data-service") || "";
      a.setAttribute("href", linkToRegistration(svc)); // enable open-in-new-tab
      a.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = linkToRegistration(svc);
      });
    });

    const topBtn = byId("bookTopBtn");
    if (topBtn) {
      topBtn.setAttribute("href", linkToRegistration(""));
      topBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = linkToRegistration("");
      });
    }
  }

  // jQuery Service Registration form (assignment)
  // Expects a form with id="serviceForm" and inputs:
  //   #svcName, #svcDesc, #svcPrice
  // Behavior:
  //   - red border on empty/invalid fields (no alerts)
  //   - create Service object
  //   - clear form and remove borders on success
  function wireServiceRegistrationForm() {
    // Only run on pages that actually include the form
    if (!byId("serviceForm")) return;

    // Prefer jQuery if available
    if (window.jQuery) {
      // Constructor for the assignment
      function Service(name, desc, price) {
        this.id = "svc_" + uid();
        this.name = name;
        this.desc = desc;
        this.price = Number(price);
      }

      $(document).ready(function () {
        const $form = $("#serviceForm");
        const $inputs = $("#svcName, #svcDesc, #svcPrice");

        $form.on("submit", function (e) {
          e.preventDefault();

          // Remove old borders
          $inputs.css("border", "");

          const name  = $("#svcName").val().trim();
          const desc  = $("#svcDesc").val().trim();
          const price = $("#svcPrice").val().trim();

          let valid = true;
          if (name === "")  { $("#svcName").css("border", "1px solid red"); valid = false; }
          if (desc === "")  { $("#svcDesc").css("border", "1px solid red"); valid = false; }
          if (price === "" || isNaN(price) || Number(price) <= 0) {
            $("#svcPrice").css("border", "1px solid red"); valid = false;
          }

          if (!valid) return;

          const svc = new Service(name, desc, price);
          console.log("Service registered:", svc);

          // Reset form & borders
          (e.currentTarget).reset();
          $inputs.css("border", "");
        });

        // Live typing removes border
        $inputs.on("input change", function () { $(this).css("border", ""); });
      });
      return;
    }

    // Fallback (vanilla) if jQuery isn't present
    const form = byId("serviceForm");
    const nameEl = byId("svcName");
    const descEl = byId("svcDesc");
    const priceEl = byId("svcPrice");
    const inputs = [nameEl, descEl, priceEl];

    function setBorder(el, bad) { if (el) el.style.border = bad ? "1px solid red" : ""; }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      inputs.forEach(el => setBorder(el, false));
      const name = nameEl?.value.trim() || "";
      const desc = descEl?.value.trim() || "";
      const price = priceEl?.value.trim() || "";

      let valid = true;
      if (!name) { setBorder(nameEl, true); valid = false; }
      if (!desc) { setBorder(descEl, true); valid = false; }
      if (!price || isNaN(price) || Number(price) <= 0) { setBorder(priceEl, true); valid = false; }
      if (!valid) return;

      const svc = { id: "svc_" + uid(), name, desc, price: Number(price) };
      console.log("Service registered:", svc);

      form.reset();
      inputs.forEach(el => setBorder(el, false));
    });

    inputs.forEach(el => el?.addEventListener("input", () => setBorder(el, false)));
  }

  function wireUI() {
    // Footer year
    const year = byId("year");
    if (year) year.textContent = new Date().getFullYear();

    // View toggles
    const btnCards = byId("btnCards");
    const btnTable = byId("btnTable");
    if (btnCards) btnCards.addEventListener("click", () => {
      byId("cardsView")?.classList.remove("d-none");
      byId("tableView")?.classList.add("d-none");
      refreshUI();
    });
    if (btnTable) btnTable.addEventListener("click", () => {
      byId("cardsView")?.classList.add("d-none");
      byId("tableView")?.classList.remove("d-none");
      refreshUI();
    });

    // Bulk clear (two-click confirm, no popups)
    const btnClearAll = byId("btnClearAll");
    if (btnClearAll) {
      btnClearAll.addEventListener("click", () => {
        if (!armButtonForConfirm(btnClearAll, "Confirm", "Clear All")) return;
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
      btnClearSearch.addEventListener("click", () => { if (search) search.value = ""; refreshUI(); });
    }

    // Pet registration form
    const form = byId("petForm");
    if (form) {
      form.addEventListener("input", (e) => {
        const t = e.target;
        if (t && (t.matches("input,select,textarea"))) t.classList.remove("is-invalid");
      });
      form.addEventListener("change", (e) => {
        const t = e.target;
        if (t && (t.matches("input,select,textarea"))) t.classList.remove("is-invalid");
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        form.classList.remove("was-validated");
        removeInvalids(form);
        if (!validatePetForm()) return;
        addPet(getFormData());
        clearForm();
      });
    }

    // Services deep links (only if those elements exist)
    if ($(".js-book-link") || byId("bookTopBtn")) wireServicesDeepLinks();

    // Registration: prefill service if select exists
    if (byId("service") || byId("petService")) prefillServiceFromQuery();

    // Assignment: jQuery service registration form (only if that form exists)
    wireServiceRegistrationForm();
  }

  /* ---------- 10) Global for inline delete handlers ---------- */
  window.handleDelete = (id, btn) => {
    if (!armButtonForConfirm(btn, "Confirm", "Delete")) return;
    deletePet(id);
    disarmButton(btn);
  };

  /* ---------- 11) Init ---------- */
  function init() { loadPets(); wireUI(); refreshUI(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

