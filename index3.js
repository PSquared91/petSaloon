// ----- Object Literal: salon -----
const salon = {
  name: "Paw Patrol Pet Saloon",
  phone: "555-123-4567",
  address: { street: "123 Paws Ave", city: "San Diego", state: "CA" },
  hours: { open: "9:00 AM", close: "6:00 PM" },
  pets: []
};

// ----- Storage helpers -----
function savePets() {
  localStorage.setItem("salonPets", JSON.stringify(salon.pets));
}
function loadPets() {
  const saved = localStorage.getItem("salonPets");
  if (saved) {
    try { salon.pets = JSON.parse(saved) || []; } catch { salon.pets = []; }
  }
}

// ----- Pet constructor/class -----
class Pet {
  constructor({ name, age, gender, breed, service, type }) {
    this.id = (crypto?.randomUUID?.() ?? String(Date.now()));
    this.name = (name || "").trim();
    this.age = Number(age) || 0;
    this.gender = gender || "Unknown";
    this.breed = (breed || "").trim();
    this.service = service || "Other";
    this.type = type || "Other";
    this.createdAt = new Date().toISOString();
  }
}

// ----- Seed 3 pets on first run -----
function seedPetsIfEmpty() {
  if (salon.pets.length === 0) {
    const p1 = new Pet({ name: "Bella", age: 3, gender: "Female", breed: "Labrador",  service: "Grooming",   type: "Dog" });
    const p2 = new Pet({ name: "Max",   age: 2, gender: "Male",   breed: "Tabby",     service: "Nail Trim",  type: "Cat" });
    const p3 = new Pet({ name: "Coco",  age: 1, gender: "Female", breed: "Parakeet",  service: "Wing Trim",  type: "Bird" });
    salon.pets.push(p1, p2, p3);
    savePets();
  }
}

// ----- UI: render salon info into <ul id="salonInfo"> -----
function renderSalonInfo() {
  const ul = document.getElementById("salonInfo");
  if (!ul) return;
  ul.innerHTML = `
    <li><strong>Name:</strong> ${salon.name}</li>
    <li><strong>Phone:</strong> ${salon.phone}</li>
    <li><strong>Address:</strong> ${salon.address.street}, ${salon.address.city}, ${salon.address.state}</li>
    <li><strong>Hours:</strong> ${salon.hours.open} – ${salon.hours.close}</li>
  `;
  const hoursText = document.getElementById("salonHours");
  if (hoursText) hoursText.textContent = `Open ${salon.hours.open} – ${salon.hours.close}`;
}

// ----- Table row renderer (replaces displayPet) -----
function displayRow(p) {
  const tbody = document.getElementById("petTableBody");
  if (!tbody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="fw-semibold">${p.name}</td>
    <td>${p.age}</td>
    <td>${p.gender}</td>
    <td>${p.breed}</td>
    <td>${p.type}</td>
    <td>${p.service}</td>
  `;
  tbody.appendChild(tr);
}

// ----- Render stats + fill table with all pets -----
function renderStatsAndList() {
  const countEl = document.getElementById("petCount");
  const avgEl   = document.getElementById("avgAge");
  const tbody   = document.getElementById("petTableBody");

  if (tbody) {
    tbody.innerHTML = "";
    salon.pets.forEach(displayRow);
  }

  if (countEl) countEl.textContent = salon.pets.length;

  if (avgEl) {
    const totalAge = salon.pets.reduce((sum, p) => sum + (Number(p.age) || 0), 0);
    avgEl.textContent = salon.pets.length ? (totalAge / salon.pets.length).toFixed(1) : "0";
  }
}

// ----- Registration form handler (registration.html) -----
function attachRegistrationHandler() {
  const form = document.getElementById("petForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const pet = new Pet({
      name:   fd.get("name"),
      age:    fd.get("age"),
      gender: fd.get("gender"),
      breed:  fd.get("breed"),
      service:fd.get("service"),
      type:   fd.get("type")
    });

    salon.pets.push(pet);
    savePets();

    // Clear & focus
    form.reset();
    form.querySelector('[name="name"]').focus();

    // Toast
    const toastEl = document.getElementById("saveToast");
    const msgEl   = document.getElementById("saveMsg");
    if (msgEl) msgEl.textContent = `${pet.name} registered!`;
    if (toastEl && window.bootstrap?.Toast) new bootstrap.Toast(toastEl).show();

    // If index table is visible (same page in some setups), append row
    displayRow(pet);
    renderStatsAndList();
  });
}

// ----- Init -----
document.addEventListener("DOMContentLoaded", () => {
  loadPets();
  seedPetsIfEmpty();
  renderSalonInfo();
  renderStatsAndList();
  attachRegistrationHandler();
});
