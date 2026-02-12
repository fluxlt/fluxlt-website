async function getPlayers() {
    try {
        const res = await fetch("https://servers-frontend.fivem.net/api/servers/single/jyaqaa");
        const data = await res.json();
        document.getElementById("players").innerText =
            data.Data.clients + " / " + data.Data.sv_maxclients;
    } catch (error) {
        document.getElementById("players").innerText = "Offline";
    }
}

getPlayers();
setInterval(getPlayers, 30000);
