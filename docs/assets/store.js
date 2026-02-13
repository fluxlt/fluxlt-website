const WORKER = "https://fluxlt-api.artisdaivoskinas.workers.dev";

let STORE = null;
let activeCat = null;
let activeSub = null;

async function api(path, opts = {}) {
  const r = await fetch(`${WORKER}${path}`, {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json" }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "request_failed");
  return j;
}

function el(tag, cls, html) {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (html !== undefined) x.innerHTML = html;
  return x;
}

async function loadStore() {
  STORE = await api("/store");

  activeCat = STORE.categories[0]?.id || null;
  activeSub = STORE.categories[0]?.sections?.[0]?.id || null;

  await setupAuth();
  renderLeft();
  renderItems();
}

async function setupAuth() {
  const me = await api("/me");

  const loginBtn = document.getElementById("discordLoginBtn");
  const logoutBtn = document.getElementById("discordLogoutBtn");
  const adminPanel = document.getElementById("adminPanel");

  loginBtn.href = `${WORKER}/login`;
  logoutBtn.href = `${WORKER}/logout`;

  loginBtn.style.display = me.loggedIn ? "none" : "";
  logoutBtn.style.display = me.loggedIn ? "" : "none";
  adminPanel.style.display = me.admin ? "" : "none";
}

function renderLeft() {
  const left = document.getElementById("storeLeft");
  left.innerHTML = "";

  STORE.categories.forEach(cat => {
    const block = el("div", "catBlock");

    const btn = el("button", "catBtn" + (cat.id === activeCat ? " active" : ""), cat.title);
    btn.onclick = () => {
      activeCat = cat.id;
      activeSub = cat.sections?.[0]?.id || null;
      renderLeft();
      renderItems();
    };

    block.appendChild(btn);

    const sub = el("div", "subList");

    cat.sections.forEach(sec => {
      const sb = el("button", "subBtn" + (sec.id === activeSub ? " active" : ""), sec.title);
      sb.onclick = () => {
        activeSub = sec.id;
        renderLeft();
        renderItems();
      };
      sub.appendChild(sb);
    });

    block.appendChild(sub);
    left.appendChild(block);
  });
}

function renderItems() {
  const grid = document.getElementById("storeGrid");
  grid.innerHTML = "";

  const items = STORE.items.filter(it =>
    (!activeCat || it.category === activeCat) &&
    (!activeSub || it.section === activeSub)
  );

  if (!items.length) {
    grid.innerHTML = "<p>Kol kas prekių nėra.</p>";
    return;
  }

  items.forEach(it => {
    const card = el("div", "card");

    const imgWrap = el("a", "cardImg");
    imgWrap.href = it.stripeLink;
    imgWrap.target = "_blank";
    imgWrap.innerHTML = `<img src="${it.image}" alt="${it.name}">`;

    const body = el("div", "cardBody");
    body.appendChild(el("div", "cardName", it.name));
    body.appendChild(el("div", "cardDesc", it.desc));

    const bottom = el("div", "cardBottom");
    bottom.appendChild(el("div", "pricePill", `${it.priceEur}€`));

    const buy = el("a", "buyBtn", "Pirkti");
    buy.href = it.stripeLink;
    buy.target = "_blank";

    bottom.appendChild(buy);
    body.appendChild(bottom);

    card.appendChild(imgWrap);
    card.appendChild(body);

    grid.appendChild(card);
  });
}

loadStore().catch(e => {
  document.getElementById("storeGrid").innerHTML =
    "<p style='color:red'>Klaida: " + e.message + "</p>";
});
