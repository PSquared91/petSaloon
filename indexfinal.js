/* ==========================================================================
   Paw Patrol Pet Salon — App Logic
   Features: Register pets, list as cards/table, search, delete, stats, localStorage
   Files: script.js (custom), Bootstrap 5 via CDN
   ========================================================================== */

(() => {
  "use strict";

  /* ---------- 1) Constants ---------- */
  const STORAGE_KEY = "pet-salon:pets";

  /* ---------- 2) State ---------- */
  /** @type {Array<{
   *  id:string, name:string, type:string, age:number, breed?:string,
   *  service:string, owner:string, phone:string,
   *  color?:string, colorName?:string, notes?:string
   * }>} */
  let pets = [];

  /* ---------- 3) DOM (lazy) ---------- */
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
            <button class="btn btn-sm btn-outline-danger" onclick="handleDelete('${p.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCards(list) {
    byId("cardsView").innerHTML = list.map(petCard).join("");
  }

  function renderTable(list) {
    byId("tableBody").innerHTML = list
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
            <button class="btn btn-sm btn-outline-danger" onclick="handleDelete('${p.id}')">Delete</button>
          </td>
        </tr>`
      )
      .join("");
  }

  function refreshStats(list) {
    byId("statTotal").textContent = list.length;
    byId("statDogs").textContent = list.filter((p) => p.type === "Dog").length;
    byId("statCats").textContent = list.filter((p) => p.type === "Cat").length;
  }

  function refreshUI() {
    const q = byId("search").value.trim().toLowerCase();
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

  /* ---------- 8) Form Helpers ---------- */
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
    byId("petForm").reset();
    byId("color").value = "#6f42c1";
    byId("colorName").value = "";
  }

  /* ---------- 9) Events & Wiring ---------- */
  function wireUI() {
    byId("year").textContent = new Date().getFullYear();

    // View toggles
    byId("btnCards").addEventListener("click", () => {
      byId("cardsView").classList.remove("d-none");
      byId("tableView").classList.add("d-none");
      refreshUI();
    });

    byId("btnTable").addEventListener("click", () => {
      byId("cardsView").classList.add("d-none");
      byId("tableView").classList.remove("d-none");
      refreshUI();
    });

    // Bulk clear
    byId("btnClearAll").addEventListener("click", () => {
      if (!pets.length) return;
      if (confirm("Delete ALL pets? This cannot be undone.")) {
        pets = [];
        savePets();
      }
    });

    // Search (debounced)
    const onSearch = debounce(refreshUI, 150);
    byId("search").addEventListener("input", onSearch);
    byId("btnClearSearch").addEventListener("click", () => {
      byId("search").value = "";
      refreshUI();
    });

    // Form validation + submit
    const form = byId("petForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      addPet(getFormData());
      clearForm();
      form.classList.remove("was-validated");
    });
  }

  /* ---------- 10) Global for inline handlers ---------- */
  // Keep this on window because the Delete buttons use onclick=""
  window.handleDelete = (id) => {
    if (confirm("Delete this pet?")) deletePet(id);
  };

  /* ---------- 11) Init ---------- */
