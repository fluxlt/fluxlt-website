const SERVER_CODE = "jyaqaa";
const API_URL = `https://servers-frontend.fivem.net/api/servers/single/${SERVER_CODE}`;

function setOnline(isOnline) {
  const dot = document.getElementById("dotLive");
  const text = document.getElementById("statusText");
  if (!dot || !text) return;

  if (isOnline) {
    dot.style.background = "rgba(25,255,140,.9)";
    dot.style.boxShadow = "0 0 0 5px rgba(25,255,140,.14)";
    text.textContent = "Serveris online";
  } else {
    dot.style.background = "rgba(255,70,70,.9)";
    dot.style.boxShadow = "0 0 0 5px rgba(255,70,70,.14)";
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
      el.textContent = `${players}/${max}`;
      setOnline(true);
      return;
    }
    throw new Error("Bad payload");
  } catch {
    const el = document.getElementById("players");
    if (el) el.textContent = "—";
    setOnline(false);
  }
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

getPlayers();
setInterval(getPlayers, 30000);

