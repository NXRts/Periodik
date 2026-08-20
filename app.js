// Aplikasi SPA Tabel Periodik Unsur Kimia Interaktif

// State global
let currentViewMode = "category"; // category, electronegativity, mass, state
let currentCategoryFilter = "all";
let searchQuery = "";
let compareSelection = [];
let compareModeActive = false;
let bohrAnimFrameId = null;

// Quiz State
let quizScore = 0;
let quizCurrentQuestion = null;

// Inisialisasi saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  renderPeriodicTable();
});

// Render Grid Utama Tabel Periodik (18 Kolom x 10 Baris)
function renderPeriodicTable() {
  const tableContainer = document.getElementById("periodicTable");
  tableContainer.innerHTML = "";

  // Map posisi unsur
  elementsData.forEach(el => {
    let gridCol = el.group;
    let gridRow = el.period;

    // Pisahkan Lanthanides (57-71) dan Actinides (89-103) ke baris terpisah
    if (el.number >= 57 && el.number <= 71) {
      gridRow = 9;
      gridCol = (el.number - 57) + 4; // Mulai dari kolom 4
    } else if (el.number >= 89 && el.number <= 103) {
      gridRow = 10;
      gridCol = (el.number - 89) + 4; // Mulai dari kolom 4
    }

    const card = createElementCard(el);
    card.style.gridColumn = gridCol;
    card.style.gridRow = gridRow;

    tableContainer.appendChild(card);
  });

  // Tambahkan Kartu Placeholder untuk Lantanida & Aktinida pada Grid Utama (Periode 6 & 7, Golongan 3)
  const lantanidaPlaceholder = document.createElement("div");
  lantanidaPlaceholder.className = "element-placeholder";
  lantanidaPlaceholder.style.gridColumn = 3;
  lantanidaPlaceholder.style.gridRow = 6;
  lantanidaPlaceholder.innerHTML = `
    <div class="placeholder-range">57-71</div>
    <div class="placeholder-label">Lantanida</div>
  `;
  lantanidaPlaceholder.onclick = () => filterCategory("lanthanide");
  tableContainer.appendChild(lantanidaPlaceholder);

  const aktinidaPlaceholder = document.createElement("div");
  aktinidaPlaceholder.className = "element-placeholder";
  aktinidaPlaceholder.style.gridColumn = 3;
  aktinidaPlaceholder.style.gridRow = 7;
  aktinidaPlaceholder.innerHTML = `
    <div class="placeholder-range">89-103</div>
    <div class="placeholder-label">Aktinida</div>
  `;
  aktinidaPlaceholder.onclick = () => filterCategory("actinide");
  tableContainer.appendChild(aktinidaPlaceholder);

  // Separator Gap
  const gap = document.createElement("div");
  gap.className = "sub-table-gap";
  gap.style.gridRow = 8;
  tableContainer.appendChild(gap);

  // Terapkan filter awal
  applyFilters();
}

// Buat Kartu Unsur
function createElementCard(el) {
  const card = document.createElement("div");
  card.className = "element-card";
  card.setAttribute("data-number", el.number);
  card.setAttribute("data-category", el.category);
  card.setAttribute("data-state", el.state);

  // Hitung Style jika dalam Mode Heatmap
  let customStyle = "";
  if (currentViewMode === "electronegativity" && el.electronegativity) {
    // Elektronegativitas (0.7 - 3.98)
    const ratio = (el.electronegativity - 0.7) / (3.98 - 0.7);
    const hue = (1 - ratio) * 210; // Biru pastel ke Merah/Orange
    customStyle = `background: hsla(${hue}, 45%, 22%, 0.85); border-top-color: hsl(${hue}, 60%, 55%);`;
  } else if (currentViewMode === "mass") {
    // Massa Atom (1.008 - 294)
    const ratio = Math.min(el.mass / 294, 1);
    const hue = (1 - ratio) * 180;
    customStyle = `background: hsla(${hue}, 40%, 20%, 0.85); border-top-color: hsl(${hue}, 55%, 50%);`;
  } else if (currentViewMode === "state") {
    // State of matter
    const stateColors = {
      solid: "#1e293b",
      liquid: "#1e3a8a",
      gas: "#701a75",
      synthetic: "#334155"
    };
    const stateBorders = {
      solid: "#64748b",
      liquid: "#3b82f6",
      gas: "#d946ef",
      synthetic: "#94a3b8"
    };
    customStyle = `background: ${stateColors[el.state]}; border-top-color: ${stateBorders[el.state]};`;
  }

  if (customStyle) {
    card.style.cssText += customStyle;
  }

  card.innerHTML = `
    <div class="tile-top">
      <span class="tile-num">${el.number}</span>
      <span class="tile-state">${getStateIcon(el.state)}</span>
    </div>
    <div class="tile-symbol">${el.symbol}</div>
    <div class="tile-bottom">
      <span class="tile-name">${el.name}</span>
      <span class="tile-mass">${formatMass(el.mass, el.number)}</span>
    </div>
  `;

  card.addEventListener("click", () => handleElementClick(el));

  return card;
}

// Icon Wujud Zat
function getStateIcon(state) {
  switch (state) {
    case "solid": return "🧊";
    case "liquid": return "💧";
    case "gas": return "💨";
    case "synthetic": return "⚛";
    default: return "";
  }
}

// Format Massa Atom
function formatMass(mass, number) {
  if (number > 92 && Number.isInteger(mass)) {
    return `[${mass}]`;
  }
  return typeof mass === "number" ? mass.toFixed(2) : mass;
}

// Handler Klik Unsur (Detail / Komparasi)
function handleElementClick(el) {
  if (compareModeActive) {
    toggleCompareElement(el.number);
  } else {
    openElementModal(el);
  }
}

// Buka Modal Detail Unsur (<dialog>)
function openElementModal(el) {
  const modal = document.getElementById("elementModal");
  const modalContent = document.getElementById("modalContent");

  // Hentikan animasi canvas lama jika ada
  if (bohrAnimFrameId) {
    cancelAnimationFrame(bohrAnimFrameId);
  }

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-header-info">
        <div class="modal-symbol-badge" style="--modal-accent-color: var(--cat-${el.category})">
          <span class="num">${el.number}</span>
          <span class="sym">${el.symbol}</span>
        </div>
        <div class="modal-title-box">
          <h2>${el.name} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">(${el.latinName})</span></h2>
          <span class="modal-category-tag">${el.categoryName} • Blok ${el.block.toUpperCase()}</span>
        </div>
      </div>
      <button class="close-btn" onclick="closeElementModal()">✕</button>
    </div>

    <div class="modal-body">
      <!-- Visualisasi Model Atom Bohr 2D -->
      <div class="bohr-container">
        <canvas id="bohrCanvas" width="280" height="280"></canvas>
        <div class="bohr-caption">
          <strong>Model Atom Bohr 2D</strong><br>
          Jumlah Kulit: ${el.shells.length} • Elektron per kulit: [${el.shells.join(", ")}]
        </div>
      </div>

      <!-- Detail Properti Kimia & Fisika -->
      <div class="property-grid">
        <div class="prop-card">
          <div class="prop-label">Nomor Atom</div>
          <div class="prop-value">${el.number}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Massa Atom</div>
          <div class="prop-value">${el.mass} u</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Golongan & Periode</div>
          <div class="prop-value">Gol. ${el.group || '-'}, Per. ${el.period}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Wujud (Suhu Ruang)</div>
          <div class="prop-value">${formatState(el.state)}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Konfig. Elektron</div>
          <div class="prop-value" style="font-size: 0.85rem;">${el.config}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Elektronegativitas</div>
          <div class="prop-value">${el.electronegativity !== null ? el.electronegativity + ' (Pauling)' : '-'}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Titik Lebur</div>
          <div class="prop-value">${el.meltingPoint !== null ? el.meltingPoint + ' °C' : '-'}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Titik Didih</div>
          <div class="prop-value">${el.boilingPoint !== null ? el.boilingPoint + ' °C' : '-'}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Tahun Ditemukan</div>
          <div class="prop-value">${el.discovered}</div>
        </div>
        <div class="prop-card">
          <div class="prop-label">Penemu</div>
          <div class="prop-value" style="font-size: 0.8rem;">${el.discoverer}</div>
        </div>

        <div class="summary-box">
          <h4>Ringkasan & Fakta Unik</h4>
          <p>${el.summary}</p>
        </div>
      </div>
    </div>
  `;

  modal.showModal();

  // Inisialisasi Animasi Atom Bohr di Canvas
  const canvas = document.getElementById("bohrCanvas");
  if (canvas) {
    initBohrAnimation(canvas, el.shells, el.symbol);
  }
}

function closeElementModal() {
  const modal = document.getElementById("elementModal");
  if (bohrAnimFrameId) {
    cancelAnimationFrame(bohrAnimFrameId);
  }
  modal.close();
}

function formatState(state) {
  switch (state) {
    case "solid": return "Padat 🧊";
    case "liquid": return "Cair 💧";
    case "gas": return "Gas 💨";
    case "synthetic": return "Sintetis ⚛";
    default: return state;
  }
}

// Inisialisasi Canvas Animasi Orbit Elektron (Bohr Model 2D)
function initBohrAnimation(canvas, shells, symbol) {
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.min(centerX, centerY) - 20;

  let angle = 0;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gambar Inti Atom (Nucleus)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, centerX, centerY);

    // Gambar Lintasan & Elektron tiap Kulit
    const numShells = shells.length;
    const radiusStep = maxRadius / (numShells + 1);

    shells.forEach((electronCount, shellIdx) => {
      const radius = 30 + (shellIdx + 1) * (radiusStep * 0.85);

      // Gambar Lingkaran Orbit Kulit
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gambar Elektron pada Orbit
      const speedMultiplier = (numShells - shellIdx) * 0.6;
      for (let i = 0; i < electronCount; i++) {
        const electronAngle = angle * speedMultiplier + (i * (Math.PI * 2 / electronCount));
        const x = centerX + radius * Math.cos(electronAngle);
        const y = centerY + radius * Math.sin(electronAngle);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f43f5e";
        ctx.fill();
      }
    });

    angle += 0.015;
    bohrAnimFrameId = requestAnimationFrame(animate);
  }

  animate();
}

// Mode Tampilan & Heatmap Filter
function setViewMode(mode) {
  currentViewMode = mode;
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === mode);
  });
  renderPeriodicTable();
}

// Filter Kategori
function filterCategory(category) {
  currentCategoryFilter = category;
  document.querySelectorAll(".pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.category === category);
  });
  applyFilters();
}

// Search Input Handler
function handleSearchFilter() {
  searchQuery = document.getElementById("searchInput").value.trim().toLowerCase();
  applyFilters();
}

// Terapkan logika penyaringan pencarian & kategori
function applyFilters() {
  const cards = document.querySelectorAll(".element-card");

  cards.forEach(card => {
    const num = card.getAttribute("data-number");
    const el = elementsData.find(e => e.number == num);
    if (!el) return;

    const matchesCategory = (currentCategoryFilter === "all") || (el.category === currentCategoryFilter);
    const matchesSearch = !searchQuery || (
      el.name.toLowerCase().includes(searchQuery) ||
      el.symbol.toLowerCase().includes(searchQuery) ||
      el.number.toString() === searchQuery
    );

    if (matchesCategory && matchesSearch) {
      card.classList.remove("dimmed");
    } else {
      card.classList.add("dimmed");
    }
  });
}

// === LOGIKA KOMPARASI UNSUR ===
function toggleCompareMode() {
  compareModeActive = !compareModeActive;
  const btn = document.getElementById("btnCompareToggle");
  btn.classList.toggle("btn-primary", compareModeActive);

  if (!compareModeActive && compareSelection.length === 0) {
    document.getElementById("compareTray").classList.remove("visible");
  }
}

function toggleCompareElement(num) {
  const idx = compareSelection.indexOf(num);
  if (idx >= 0) {
    compareSelection.splice(idx, 1);
  } else {
    if (compareSelection.length >= 4) {
      alert("Maksimal membandingkan 4 unsur secara bersamaan!");
      return;
    }
    compareSelection.push(num);
  }

  updateCompareUI();
}

function updateCompareUI() {
  document.getElementById("compareCount").innerText = compareSelection.length;
  const tray = document.getElementById("compareTray");
  const itemsContainer = document.getElementById("compareItems");

  if (compareSelection.length > 0) {
    tray.classList.add("visible");
    itemsContainer.innerHTML = compareSelection.map(num => {
      const el = elementsData.find(e => e.number === num);
      return `
        <div class="compare-chip">
          <span>${el.symbol} (${el.name})</span>
          <span class="remove-chip" onclick="toggleCompareElement(${el.number})">✕</span>
        </div>
      `;
    }).join("");
  } else {
    tray.classList.remove("visible");
  }

  // Update seleksi pada kartu
  document.querySelectorAll(".element-card").forEach(card => {
    const num = parseInt(card.getAttribute("data-number"));
    card.classList.toggle("selected-compare", compareSelection.includes(num));
  });
}

function clearCompareSelection() {
  compareSelection = [];
  updateCompareUI();
  toggleCompareMode();
}

function openCompareModal() {
  if (compareSelection.length < 2) {
    alert("Pilih minimal 2 unsur untuk dibandingkan!");
    return;
  }

  const modal = document.getElementById("compareModal");
  const wrapper = document.getElementById("compareTableWrapper");

  const selectedElements = compareSelection.map(num => elementsData.find(e => e.number === num));

  wrapper.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>Sifat / Atribut</th>
          ${selectedElements.map(el => `<th>${el.name} (${el.symbol})</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Nomor Atom</strong></td>
          ${selectedElements.map(el => `<td>${el.number}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Massa Atom</strong></td>
          ${selectedElements.map(el => `<td>${el.mass} u</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Kategori</strong></td>
          ${selectedElements.map(el => `<td>${el.categoryName}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Wujud (Suhu Ruang)</strong></td>
          ${selectedElements.map(el => `<td>${formatState(el.state)}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Elektronegativitas</strong></td>
          ${selectedElements.map(el => `<td>${el.electronegativity || '-'}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Titik Lebur (°C)</strong></td>
          ${selectedElements.map(el => `<td>${el.meltingPoint !== null ? el.meltingPoint : '-'}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Titik Didih (°C)</strong></td>
          ${selectedElements.map(el => `<td>${el.boilingPoint !== null ? el.boilingPoint : '-'}</td>`).join("")}
        </tr>
        <tr>
          <td><strong>Konfigurasi Elektron</strong></td>
          ${selectedElements.map(el => `<td><code>${el.config}</code></td>`).join("")}
        </tr>
        <tr>
          <td><strong>Tahun Ditemukan</strong></td>
          ${selectedElements.map(el => `<td>${el.discovered}</td>`).join("")}
        </tr>
      </tbody>
    </table>
  `;

  modal.showModal();
}

function closeCompareModal() {
  document.getElementById("compareModal").close();
}

// === LOGIKA KUIS INTERAKTIF ===
function startQuiz() {
  quizScore = 0;
  document.getElementById("quizScore").innerText = quizScore;
  document.getElementById("quizOverlay").classList.add("active");
  generateQuizQuestion();
}

function closeQuiz() {
  document.getElementById("quizOverlay").classList.remove("active");
}

function generateQuizQuestion() {
  const targetElement = elementsData[Math.floor(Math.random() * elementsData.length)];
  quizCurrentQuestion = targetElement;

  const questionTypes = ["symbol_to_name", "number_to_symbol", "category_to_element"];
  const qType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  const optionsContainer = document.getElementById("quizOptions");
  optionsContainer.innerHTML = "";

  let options = [targetElement];
  while (options.length < 4) {
    const rand = elementsData[Math.floor(Math.random() * elementsData.length)];
    if (!options.find(o => o.number === rand.number)) {
      options.push(rand);
    }
  }

  // Acak opsi
  options.sort(() => Math.random() - 0.5);

  if (qType === "symbol_to_name") {
    document.getElementById("quizQuestion").innerText = "Tebak NAMA UNSUR untuk simbol berikut:";
    document.getElementById("quizPrompt").innerText = targetElement.symbol;

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt-btn";
      btn.innerText = opt.name;
      btn.onclick = () => checkQuizAnswer(opt.number === targetElement.number, btn);
      optionsContainer.appendChild(btn);
    });
  } else if (qType === "number_to_symbol") {
    document.getElementById("quizQuestion").innerText = "Tebak SIMBOL UNSUR dengan Nomor Atom:";
    document.getElementById("quizPrompt").innerText = `No. Atom: ${targetElement.number}`;

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt-btn";
      btn.innerText = `${opt.symbol} (${opt.name})`;
      btn.onclick = () => checkQuizAnswer(opt.number === targetElement.number, btn);
      optionsContainer.appendChild(btn);
    });
  } else {
    document.getElementById("quizQuestion").innerText = `Manakah unsur yang termasuk kategori ${targetElement.categoryName}?`;
    document.getElementById("quizPrompt").innerText = targetElement.categoryName;

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt-btn";
      btn.innerText = `${opt.name} (${opt.symbol})`;
      btn.onclick = () => checkQuizAnswer(opt.category === targetElement.category, btn);
      optionsContainer.appendChild(btn);
    });
  }
}

function checkQuizAnswer(isCorrect, btn) {
  if (isCorrect) {
    btn.classList.add("correct");
    quizScore += 10;
    document.getElementById("quizScore").innerText = quizScore;
  } else {
    btn.classList.add("wrong");
  }

  // Disabel tombol opsi sebentar lalu lanjut ke soal berikutnya
  document.querySelectorAll(".quiz-opt-btn").forEach(b => b.disabled = true);
  setTimeout(() => {
    generateQuizQuestion();
  }, 1000);
}
