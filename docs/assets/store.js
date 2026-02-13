// docs/assets/store.js
const WORKER = "https://fluxlt-api.artisdaivoskinas.workers.dev";

const el = (id) => document.getElementById(id);

const log = (msg) => {
  const box = el("adminLog");
  if (!box) return;
  box.textContent = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
};

async function api(path, opts = {}) {
  const r = await fetch(`${WORKER}${path}`, {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json" },
  });

  const text = await r.text();
  let j = {};
  try { j = JSON.parse(text); } catch { j = { raw: text }; }

  if (!r.ok) throw new Error(`${r.status} ${j.error || j.raw || "request_failed"}`);
  return j;
}

let STATE = {
  me: null,
  store: null,
  activeCategory: null,
  activeSection: null,
  q: "",
};

function setButtons() {
  const loginA = el("discordLoginBtn");
  const logoutA = el("discordLogoutBtn");

  loginA.href = `${WORKER}/login`;
  logoutA.href = `${WORKER}/logout`;

  const loggedIn = !!STATE.me?.loggedIn;
  loginA.style.display = loggedIn ? "none" : "inline-flex";
  logoutA.style.display = loggedIn ? "inline-flex" : "none";

  el("adminPanel").style.display = STATE.me?.admin ? "block" : "none";
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSidebar() {
  const left = el("storeLeft");
  const store = STATE.store;
  if (!store) return;

  // set default selection
  if (!STATE.activeCategory && store.categories?.length) {
    STATE.activeCategory = store.categories[0].id;
    STATE.activeSection = store.categories[0].sections?.[0]?.id || null;
  }

  const cats = store.categories || [];
  let html = `<div class="sideTitle">Kategorijos</div>`;

  for (const c of cats) {
    const isCatActive = c.id === STATE.activeCategory;
    html += `
      <button class="sideCat ${isCatActive ? "active" : ""}" data-cat="${escapeHtml(c.id)}">
        <span>${escapeHtml(c.title)}</span>
        <span class="chev">${isCatActive ? "▾" : "▸"}</span>
      </button>
    `;

    if (isCatActive) {
      html += `<div class="sideSections">`;
      for (const s of (c.sections || [])) {
        const isSecActive = s.id === STATE.activeSection;
        html += `
          <button class="sideSec ${isSecActive ? "active" : ""}" data-sec="${escapeHtml(s.id)}">
            ${escapeHtml(s.title)}
          </button>
        `;
      }
      html += `</div>`;
    }
  }

  left.innerHTML = html;

  // events
  left.querySelectorAll("[data-cat]").forEach((b) => {
    b.onclick = () => {
      const cat = b.getAttribute("data-cat");
      STATE.activeCategory = cat;
      const catObj = (STATE.store.categories || []).find((x) => x.id === cat);
      STATE.activeSection = catObj?.sections?.[0]?.id || null;
      renderSidebar();
      renderGrid();
      syncAdminSelects();
    };
  });

  left.querySelectorAll("[data-sec]").forEach((b) => {
    b.onclick = () => {
      STATE.activeSection = b.getAttribute("data-sec");
      renderSidebar();
      renderGrid();
      syncAdminSelects();
    };
  });
}

function itemMatches(item) {
  if (!item) return false;
  if (STATE.activeCategory && item.category !== STATE.activeCategory) return false;
  if (STATE.activeSection && item.section !== STATE.activeSection) return false;

  const q = (STATE.q || "").trim().toLowerCase();
  if (!q) return true;

  const hay = `${item.name} ${item.desc}`.toLowerCase();
  return hay.includes(q);
}

function renderGrid() {
  const grid = el("storeGrid");
  const store = STATE.store;

  const items = (store?.items || []).filter(itemMatches);
  const catObj = (store?.categories || []).find((c) => c.id === STATE.activeCategory);
  const secObj = catObj?.sections?.find((s) => s.id === STATE.activeSection);

  el("crumb").textContent =
    `${catObj?.title || "Kategorija"} / ${secObj?.title || "Subkategorija"}`;

  if (!items.length) {
    grid.innerHTML = `<div class="empty">Čia kol kas tuščia. (Admin gali pridėti prekes.)</div>`;
    return;
  }

  grid.innerHTML = items.map((it) => `
    <article class="card">
      <div class="cardImg" style="background-image:url('${escapeHtml(it.image)}')"></div>
      <div class="cardBody">
        <div class="cardTop">
          <h3 class="cardTitle">${escapeHtml(it.name)}</h3>
          <div class="price">${escapeHtml(it.priceEur)} €</div>
        </div>
        <p class="cardDesc">${escapeHtml(it.desc)}</p>
        <div class="cardActions">
          <a class="buyBtn" href="${escapeHtml(it.stripeLink)}" target="_blank" rel="noreferrer">
            Pirkti
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

function syncAdminSelects() {
  const store = STATE.store;
  if (!store) return;

  const catSel1 = el("sectionCategory");
  const catSel2 = el("itemCategory");
  const secSel = el("itemSection");

  const cats = store.categories || [];

  const optCats = cats.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`).join("");

  if (catSel1) catSel1.innerHTML = optCats;
  if (catSel2) catSel2.innerHTML = optCats;

  // defaults to active
  if (STATE.activeCategory) {
    if (catSel1) catSel1.value = STATE.activeCategory;
    if (catSel2) catSel2.value = STATE.activeCategory;
  }

  const catForItems = (cats.find(c => c.id === (catSel2?.value || STATE.activeCategory)) || cats[0]);
  const secs = catForItems?.sections || [];
  secSel.innerHTML = secs.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`).join("");

  if (STATE.activeSection) {
    // if active section exists in this cat
    const exists = secs.some(s => s.id === STATE.activeSection);
    if (exists) secSel.value = STATE.activeSection;
  }
}

function wireAdmin() {
  // When category select changes for items, update sections select
  el("itemCategory").onchange = () => syncAdminSelects();

  el("addCategoryBtn").onclick = async () => {
    try {
      log("Siunčiu: /admin/add-category ...");
      const title = el("catTitle").value.trim();
      const id = el("catId").value.trim();
      const res = await api("/admin/add-category", {
        method: "POST",
        body: JSON.stringify({ title, id }),
      });
      log({ ok: true, res });
      el("catTitle").value = "";
      el("catId").value = "";
      await refresh();
    } catch (e) {
      log("KLAIDA: " + e.message);
    }
  };

  el("addSectionBtn").onclick = async () => {
    try {
      log("Siunčiu: /admin/add-section ...");
      const category = el("sectionCategory").value;
      const title = el("sectionTitle").value.trim();
      const id = el("sectionId").value.trim();
      const res = await api("/admin/add-section", {
        method: "POST",
        body: JSON.stringify({ category, title, id }),
      });
      log({ ok: true, res });
      el("sectionTitle").value = "";
      el("sectionId").value = "";
      await refresh();
    } catch (e) {
      log("KLAIDA: " + e.message);
    }
  };

  el("addItemBtn").onclick = async () => {
    try {
      log("Siunčiu: /admin/add-item ...");
      const payload = {
        category: el("itemCategory").value,
        section: el("itemSection").value,
        name: el("itemName").value.trim(),
        priceEur: el("itemPrice").value.trim(),
        image: el("itemImage").value.trim(),
        stripeLink: el("itemStripe").value.trim(),
        desc: el("itemDesc").value.trim(),
      };

      const res = await api("/admin/add-item", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      log({ ok: true, res });
      el("itemName").value = "";
      el("itemPrice").value = "";
      el("itemImage").value = "";
      el("itemStripe").value = "";
      el("itemDesc").value = "";
      await refresh();
    } catch (e) {
      log("KLAIDA: " + e.message);
    }
  };
}

async function refresh() {
  STATE.me = await api("/me");
  STATE.store = await api("/store");

  setButtons();
  renderSidebar();
  renderGrid();
  syncAdminSelects();
}

function wireSearch() {
  el("q").oninput = () => {
    STATE.q = el("q").value;
    renderGrid();
  };
}

(async function init() {
  try {
    wireSearch();
    wireAdmin();
    await refresh();
    log("Admin log: pasiruošęs ✅");
  } catch (e) {
    log("KLAIDA: " + e.message);
    el("storeGrid").innerHTML = `<div class="empty">Klaida: ${escapeHtml(e.message)}</div>`;
  }
})();
