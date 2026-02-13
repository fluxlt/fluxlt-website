const WORKER = "https://fluxlt-api.artisdaivoskinas.workers.dev";

const el = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

function ensureDefaultSelection() {
  const cats = STATE.store?.categories || [];
  if (!cats.length) {
    STATE.activeCategory = null;
    STATE.activeSection = null;
    return;
  }
  if (!STATE.activeCategory) STATE.activeCategory = cats[0].id;
  const cat = cats.find((c) => c.id === STATE.activeCategory) || cats[0];
  if (!STATE.activeSection) STATE.activeSection = cat.sections?.[0]?.id || null;

  if (STATE.activeSection && !(cat.sections || []).some((s) => s.id === STATE.activeSection)) {
    STATE.activeSection = cat.sections?.[0]?.id || null;
  }
}

function crumbText() {
  const cats = STATE.store?.categories || [];
  const cat = cats.find((c) => c.id === STATE.activeCategory);
  const sec = cat?.sections?.find((s) => s.id === STATE.activeSection);
  return `${cat?.title || "Kategorija"} / ${sec?.title || "Subkategorija"}`;
}

/* ---------- Admin: rename/delete category/section ---------- */
async function adminRenameCategory(catId) {
  const cat = (STATE.store.categories || []).find((c) => c.id === catId);
  const next = prompt("Naujas kategorijos pavadinimas:", cat?.title || "");
  if (!next || !next.trim()) return;
  await api("/admin/update-category", { method: "POST", body: JSON.stringify({ category: catId, title: next.trim() }) });
  await refresh();
  log("Kategorija atnaujinta ✅");
}

async function adminDeleteCategory(catId) {
  const cat = (STATE.store.categories || []).find((c) => c.id === catId);
  const ok = confirm(`Trinti kategoriją "${cat?.title || catId}"?\n\nLeidžiama tik jei nėra subkategorijų ir prekių.`);
  if (!ok) return;
  await api("/admin/delete-category", { method: "POST", body: JSON.stringify({ category: catId }) });
  if (STATE.activeCategory === catId) {
    STATE.activeCategory = null;
    STATE.activeSection = null;
  }
  await refresh();
  log("Kategorija ištrinta ✅");
}

async function adminRenameSection(catId, secId) {
  const cat = (STATE.store.categories || []).find((c) => c.id === catId);
  const sec = cat?.sections?.find((s) => s.id === secId);
  const next = prompt("Naujas subkategorijos pavadinimas:", sec?.title || "");
  if (!next || !next.trim()) return;
  await api("/admin/update-section", { method: "POST", body: JSON.stringify({ category: catId, section: secId, title: next.trim() }) });
  await refresh();
  log("Subkategorija atnaujinta ✅");
}

async function adminDeleteSection(catId, secId) {
  const cat = (STATE.store.categories || []).find((c) => c.id === catId);
  const sec = cat?.sections?.find((s) => s.id === secId);
  const ok = confirm(`Trinti subkategoriją "${sec?.title || secId}"?\n\nLeidžiama tik jei joje nėra prekių.`);
  if (!ok) return;
  await api("/admin/delete-section", { method: "POST", body: JSON.stringify({ category: catId, section: secId }) });
  if (STATE.activeCategory === catId && STATE.activeSection === secId) STATE.activeSection = null;
  await refresh();
  log("Subkategorija ištrinta ✅");
}

/* ---------- Sidebar render ---------- */
function renderSidebar() {
  const left = el("storeLeft");
  const store = STATE.store;
  if (!store) return;

  ensureDefaultSelection();
  const cats = store.categories || [];
  const admin = !!STATE.me?.admin;

  let html = `<div class="sideTitle">Kategorijos</div>`;

  for (const c of cats) {
    const isCatActive = c.id === STATE.activeCategory;

    html += `
      <div class="sideRow">
        <button class="sideCat ${isCatActive ? "active" : ""}" data-cat="${esc(c.id)}">
          <span>${esc(c.title)}</span>
          <span class="chev">${isCatActive ? "▾" : "▸"}</span>
        </button>
        ${admin ? `
          <div class="miniBtns">
            <button class="miniBtn" title="Edit" data-cat-edit="${esc(c.id)}">✏️</button>
            <button class="miniBtn" title="Delete" data-cat-del="${esc(c.id)}">🗑️</button>
          </div>
        ` : ``}
      </div>
    `;

    if (isCatActive) {
      html += `<div class="sideSections">`;
      for (const s of (c.sections || [])) {
        const isSecActive = s.id === STATE.activeSection;
        html += `
          <div class="sideRow">
            <button class="sideSec ${isSecActive ? "active" : ""}" data-sec="${esc(s.id)}">
              ${esc(s.title)}
            </button>
            ${admin ? `
              <div class="miniBtns">
                <button class="miniBtn" title="Edit" data-sec-edit="${esc(s.id)}">✏️</button>
                <button class="miniBtn" title="Delete" data-sec-del="${esc(s.id)}">🗑️</button>
              </div>
            ` : ``}
          </div>
        `;
      }
      html += `</div>`;
    }
  }

  left.innerHTML = html;

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

  if (admin) {
    left.querySelectorAll("[data-cat-edit]").forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        try { await adminRenameCategory(b.getAttribute("data-cat-edit")); }
        catch (err) { log("KLAIDA: " + err.message); }
      };
    });

    left.querySelectorAll("[data-cat-del]").forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        try { await adminDeleteCategory(b.getAttribute("data-cat-del")); }
        catch (err) { log("KLAIDA: " + err.message); }
      };
    });

    left.querySelectorAll("[data-sec-edit]").forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        try { await adminRenameSection(STATE.activeCategory, b.getAttribute("data-sec-edit")); }
        catch (err) { log("KLAIDA: " + err.message); }
      };
    });

    left.querySelectorAll("[data-sec-del]").forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        try { await adminDeleteSection(STATE.activeCategory, b.getAttribute("data-sec-del")); }
        catch (err) { log("KLAIDA: " + err.message); }
      };
    });
  }
}

/* ---------- Items grid ---------- */
function itemMatches(it) {
  if (!it) return false;
  if (STATE.activeCategory && it.category !== STATE.activeCategory) return false;
  if (STATE.activeSection && it.section !== STATE.activeSection) return false;
  const q = (STATE.q || "").trim().toLowerCase();
  if (!q) return true;
  return (`${it.name} ${it.desc}`).toLowerCase().includes(q);
}

function renderGrid() {
  el("crumb").textContent = crumbText();

  const grid = el("storeGrid");
  const admin = !!STATE.me?.admin;
  const items = (STATE.store?.items || []).filter(itemMatches);

  if (!items.length) {
    grid.innerHTML = `<div class="empty">Čia kol kas tuščia. (Admin gali pridėti prekes.)</div>`;
    return;
  }

  grid.innerHTML = items.map((it) => `
    <article class="card">
      <div class="cardImg" style="background-image:url('${esc(it.image)}')"></div>
      <div class="cardBody">
        <div class="cardTop">
          <h3 class="cardTitle">${esc(it.name)}</h3>
          <div class="price">${esc(it.priceEur)} €</div>
        </div>
        <p class="cardDesc">${esc(it.desc)}</p>

        <div class="cardActions">
          <a class="buyBtn" href="${esc(it.stripeLink)}" target="_blank" rel="noreferrer">Pirkti</a>
          ${admin ? `
            <button class="adminBtn" data-edit="${esc(it.id)}">Edit</button>
            <button class="adminBtn danger" data-del="${esc(it.id)}">Delete</button>
          ` : ``}
        </div>
      </div>
    </article>
  `).join("");

  if (admin) {
    grid.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute("data-del");
        const ok = confirm("Trinti prekę? ID: " + id);
        if (!ok) return;
        try {
          await api("/admin/delete-item", { method: "POST", body: JSON.stringify({ id }) });
          await refresh();
          log("Prekė ištrinta ✅");
        } catch (err) {
          log("KLAIDA: " + err.message);
        }
      };
    });

    grid.querySelectorAll("[data-edit]").forEach((b) => {
      b.onclick = () => openEditModal(b.getAttribute("data-edit"));
    });
  }
}

/* ---------- Modal (edit item) ---------- */
function modalHtml() {
  return `
    <div id="modalBack" class="modalBack">
      <div class="modal">
        <div class="modalHead">
          <div class="modalTitle">Redaguoti prekę</div>
          <button id="modalClose" class="modalX">✕</button>
        </div>

        <div class="modalBody">
          <div class="row">
            <label>Kategorija</label>
            <select id="mCat"></select>
          </div>
          <div class="row">
            <label>Subkategorija</label>
            <select id="mSec"></select>
          </div>

          <div class="row">
            <label>Pavadinimas</label>
            <input id="mName" />
          </div>

          <div class="row two">
            <div>
              <label>Kaina (€)</label>
              <input id="mPrice" />
            </div>
            <div>
              <label>Nuotrauka (URL)</label>
              <input id="mImage" />
            </div>
          </div>

          <div class="row">
            <label>Stripe link</label>
            <input id="mStripe" />
          </div>

          <div class="row">
            <label>Aprašymas</label>
            <textarea id="mDesc"></textarea>
          </div>

          <div class="modalActions">
            <button id="modalSave" class="modalSave">Išsaugoti</button>
          </div>

          <pre id="modalLog" class="modalLog"></pre>
        </div>
      </div>
    </div>
  `;
}

function ensureModalStyles() {
  if (document.getElementById("modalStyles")) return;
  const s = document.createElement("style");
  s.id = "modalStyles";
  s.textContent = `
    .sideRow{display:flex; gap:8px; align-items:center;}
    .miniBtns{display:flex; gap:6px;}
    .miniBtn{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10); color:#fff; border-radius:10px; padding:6px 8px; cursor:pointer;}
    .miniBtn:hover{background:rgba(255,255,255,.10);}
    .adminBtn{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:12px; padding:10px 12px; cursor:pointer; font-weight:800;}
    .adminBtn:hover{background:rgba(255,255,255,.10);}
    .adminBtn.danger{border-color: rgba(229,9,20,.45);}

    .modalBack{position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:9999; padding:14px;}
    .modal{width:min(820px, 100%); background:rgba(15,15,20,.92); border:1px solid rgba(255,255,255,.12); border-radius:18px; box-shadow: 0 30px 120px rgba(0,0,0,.65); backdrop-filter: blur(14px); overflow:hidden;}
    .modalHead{display:flex; align-items:center; justify-content:space-between; padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.08);}
    .modalTitle{font-weight:900;}
    .modalX{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:12px; padding:8px 10px; cursor:pointer;}
    .modalBody{padding:14px;}
    .row{display:flex; flex-direction:column; gap:6px; margin-bottom:10px;}
    .row.two{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
    .row label{font-size:12px; opacity:.8; font-weight:800;}
    .row input,.row select,.row textarea{background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:12px; padding:10px 10px; outline:none;}
    .row textarea{min-height:100px; resize:vertical;}
    .modalActions{display:flex; justify-content:flex-end; margin-top:10px;}
    .modalSave{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#fff; border-radius:12px; padding:10px 14px; font-weight:900; cursor:pointer;}
    .modalSave:hover{background:rgba(255,255,255,.10);}
    .modalLog{margin-top:10px; padding:10px; border:1px solid rgba(255,255,255,.10); border-radius:12px; background:rgba(0,0,0,.35); max-height:150px; overflow:auto;}
    @media(max-width:820px){.row.two{grid-template-columns:1fr;}}
  `;
  document.head.appendChild(s);
}

function fillModalSelects(mCat, mSec, selectedCat, selectedSec) {
  const cats = STATE.store.categories || [];
  mCat.innerHTML = cats.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");
  mCat.value = selectedCat;

  const catObj = cats.find((c) => c.id === mCat.value) || cats[0];
  const secs = catObj?.sections || [];
  mSec.innerHTML = secs.map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join("");

  if (secs.some((s) => s.id === selectedSec)) mSec.value = selectedSec;
}

function openEditModal(itemId) {
  ensureModalStyles();

  const it = (STATE.store.items || []).find((x) => x.id === itemId);
  if (!it) return;

  const holder = document.createElement("div");
  holder.innerHTML = modalHtml();
  document.body.appendChild(holder);

  const back = document.getElementById("modalBack");
  const closeBtn = document.getElementById("modalClose");
  const mCat = document.getElementById("mCat");
  const mSec = document.getElementById("mSec");

  const mName = document.getElementById("mName");
  const mPrice = document.getElementById("mPrice");
  const mImage = document.getElementById("mImage");
  const mStripe = document.getElementById("mStripe");
  const mDesc = document.getElementById("mDesc");
  const mLog = document.getElementById("modalLog");

  fillModalSelects(mCat, mSec, it.category, it.section);
  mCat.onchange = () => fillModalSelects(mCat, mSec, mCat.value, null);

  mName.value = it.name || "";
  mPrice.value = it.priceEur || "";
  mImage.value = it.image || "";
  mStripe.value = it.stripeLink || "";
  mDesc.value = it.desc || "";

  const cleanup = () => {
    try { back.remove(); } catch {}
    try { holder.remove(); } catch {}
  };

  closeBtn.onclick = cleanup;
  back.onclick = (e) => { if (e.target === back) cleanup(); };

  document.getElementById("modalSave").onclick = async () => {
    try {
      mLog.textContent = "Siunčiu...";
      await api("/admin/update-item", {
        method: "POST",
        body: JSON.stringify({
          id: itemId,
          category: mCat.value,
          section: mSec.value,
          name: mName.value.trim(),
          priceEur: mPrice.value.trim(),
          image: mImage.value.trim(),
          stripeLink: mStripe.value.trim(),
          desc: mDesc.value.trim(),
        }),
      });
      mLog.textContent = "OK ✅";
      await refresh();
      cleanup();
      log("Prekė atnaujinta ✅");
    } catch (err) {
      mLog.textContent = "KLAIDA: " + err.message;
    }
  };
}

/* ---------- Admin add forms ---------- */
function syncAdminSelects() {
  const store = STATE.store;
  if (!store) return;

  const catSel1 = el("sectionCategory");
  const catSel2 = el("itemCategory");
  const secSel = el("itemSection");
  if (!catSel1 || !catSel2 || !secSel) return;

  const cats = store.categories || [];
  const optCats = cats.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("");

  catSel1.innerHTML = optCats;
  catSel2.innerHTML = optCats;

  if (STATE.activeCategory && cats.some((c) => c.id === STATE.activeCategory)) {
    catSel1.value = STATE.activeCategory;
    catSel2.value = STATE.activeCategory;
  }

  const catForItems = cats.find((c) => c.id === catSel2.value) || cats[0];
  const secs = catForItems?.sections || [];
  secSel.innerHTML = secs.map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join("");

  if (STATE.activeSection && secs.some((s) => s.id === STATE.activeSection)) {
    secSel.value = STATE.activeSection;
  }
}

function wireAdmin() {
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

/* ---------- Search ---------- */
function wireSearch() {
  el("q").oninput = () => {
    STATE.q = el("q").value;
    renderGrid();
  };
}

/* ---------- Refresh ---------- */
async function refresh() {
  STATE.me = await api("/me");
  STATE.store = await api("/store");
  ensureDefaultSelection();
  setButtons();
  renderSidebar();
  renderGrid();
  syncAdminSelects();
}

/* ---------- Init ---------- */
(async function init() {
  try {
    wireSearch();
    wireAdmin();
    await refresh();
    log("Admin log: pasiruošęs ✅");
  } catch (e) {
    log("KLAIDA: " + e.message);
    el("storeGrid").innerHTML = `<div class="empty">Klaida: ${esc(e.message)}</div>`;
  }
})();
