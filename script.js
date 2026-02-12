const SERVER_CODE = "jyaqaa";
const API_URL = `https://servers-frontend.fivem.net/api/servers/single/${SERVER_CODE}`;

function setStatus(ok) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (!dot || !text) return;

  if (ok) {
    dot.style.background = "rgba(20, 255, 120, .85)";
    dot.style.boxShadow = "0 0 0 5px rgba(20, 255, 120, .14)";
    text.textContent = "Serveris online";
  } else {
    dot.style.background = "rgba(255, 60, 60, .85)";
    dot.style.boxShadow = "0 0 0 5px rgba(255, 60, 60, .14)";
    text.textContent = "Serveris offline";
  }
}

async function getPlayers() {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();

    const players = data?.Data?.clients;
    const max = data?.Data?.sv_maxclients;

    const el = document.getElementById("players");
    if (el && Number.isFinite(players) && Number.isFinite(max)) {
      el.textContent = `${players} / ${max}`;
      setStatus(true);
      return;
    }
    throw new Error("Bad payload");
  } catch {
    const el = document.getElementById("players");
    if (el) el.textContent = "—";
    setStatus(false);
  }
}

function revealOnScroll() {
  const els = document.querySelectorAll(".reveal");
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in");
      });
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => obs.observe(el));
}

function mobileMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");
  if (!burger || !menu) return;

  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("show");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.classList.remove("show");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());

revealOnScroll();
mobileMenu();
getPlayers();
setInterval(getPlayers, 30000);

