(function () {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll('[data-nav] a').forEach(a => {
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === path) a.classList.add("active");
  });

  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => sidebar.classList.toggle("show"));
  }

  const search = document.getElementById("docSearch");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('[data-nav] a').forEach(a => {
        const text = a.textContent.toLowerCase();
        a.style.display = (!q || text.includes(q)) ? "" : "none";
      });
    });
  }
})();
