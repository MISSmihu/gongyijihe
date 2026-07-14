const state = {
  sites: [],
  meta: {},
  query: "",
  category: "全部",
  sort: "default"
};

const elements = {
  list: document.querySelector("#site-list"),
  empty: document.querySelector("#empty-state"),
  search: document.querySelector("#site-search"),
  clearSearch: document.querySelector("#clear-search"),
  resetFilters: document.querySelector("#reset-filters"),
  sort: document.querySelector("#site-sort"),
  filters: document.querySelector("#category-filters"),
  summary: document.querySelector("#result-summary"),
  totalCount: document.querySelector("#total-count"),
  categoryCount: document.querySelector("#category-count"),
  updateDate: document.querySelector("#update-date"),
  subtitle: document.querySelector("#page-subtitle"),
  notice: document.querySelector("#notice-text"),
  sourceLink: document.querySelector("#source-link"),
  themeToggle: document.querySelector("#theme-toggle"),
  toast: document.querySelector("#toast")
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getInitial(name) {
  return String(name || "?").trim().slice(0, 1).toUpperCase();
}

function formatDate(value) {
  if (!value) return "待更新";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function renderStats() {
  const activeSites = state.sites.filter((site) => site.active !== false);
  const categories = new Set(activeSites.map((site) => site.category));
  elements.totalCount.textContent = activeSites.length;
  elements.categoryCount.textContent = categories.size;
  elements.updateDate.textContent = formatDate(state.meta.updatedAt);
  if (state.meta.subtitle) elements.subtitle.textContent = state.meta.subtitle;
  if (state.meta.notice) elements.notice.textContent = state.meta.notice;
  if (state.meta.sourceUrl) elements.sourceLink.href = state.meta.sourceUrl;
}

function renderFilters() {
  const categories = [...new Set(
    state.sites
      .filter((site) => site.active !== false)
      .map((site) => site.category)
  )];

  const ordered = ["全部", ...categories];
  elements.filters.innerHTML = ordered.map((category) => `
    <button
      class="filter-button"
      type="button"
      data-category="${escapeHtml(category)}"
      aria-pressed="${state.category === category}"
    >${escapeHtml(category)}</button>
  `).join("");
}

function getVisibleSites() {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  let result = state.sites.filter((site) => site.active !== false);

  if (state.category !== "全部") {
    result = result.filter((site) => site.category === state.category);
  }

  if (query) {
    result = result.filter((site) => {
      const haystack = [site.name, site.url, site.benefit, site.category, site.notes]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return haystack.includes(query);
    });
  }

  return result.sort((a, b) => {
    if (state.sort === "name") {
      return a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" });
    }
    if (state.sort === "latest") {
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    }
    return Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) || a.order - b.order;
  });
}

function siteTemplate(site) {
  const domain = getDomain(site.url);
  const recommended = site.recommended
    ? `<span class="recommend-mark"><i data-lucide="sparkles" aria-hidden="true"></i>推荐</span>`
    : "";

  return `
    <article class="site-row${site.recommended ? " is-recommended" : ""}" role="listitem">
      <div class="site-identity">
        <span class="site-logo" aria-hidden="true">
          <span>${escapeHtml(getInitial(site.name))}</span>
          <img
            src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64"
            alt=""
            width="28"
            height="28"
            loading="lazy"
            onerror="this.hidden=true"
          >
        </span>
        <div class="site-name">
          <strong>${escapeHtml(site.name)} ${recommended}</strong>
          <a
            class="site-url"
            href="${escapeHtml(site.url)}"
            title="${escapeHtml(site.url)}"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >${escapeHtml(site.url)}</a>
        </div>
      </div>
      <p class="benefit">${escapeHtml(site.benefit)}</p>
      <span class="category-tag" data-category="${escapeHtml(site.category)}">${escapeHtml(site.category)}</span>
      <a class="visit-link" href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer nofollow">
        <span>访问</span>
        <i data-lucide="arrow-up-right" aria-hidden="true"></i>
      </a>
    </article>
  `;
}

function renderSites() {
  const sites = getVisibleSites();
  elements.list.innerHTML = sites.map(siteTemplate).join("");
  elements.list.setAttribute("aria-busy", "false");
  elements.list.hidden = sites.length === 0;
  elements.empty.hidden = sites.length !== 0;
  elements.summary.textContent = `显示 ${sites.length} / ${state.sites.filter((site) => site.active !== false).length} 个站点`;

  if (window.lucide) window.lucide.createIcons();
}

function setCategory(category) {
  state.category = category;
  renderFilters();
  renderSites();
}

function resetFilters() {
  state.query = "";
  state.category = "全部";
  state.sort = "default";
  elements.search.value = "";
  elements.sort.value = "default";
  elements.clearSearch.hidden = true;
  renderFilters();
  renderSites();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  elements.themeToggle.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
  elements.themeToggle.setAttribute("title", isDark ? "切换浅色模式" : "切换深色模式");
  elements.themeToggle.innerHTML = `<i data-lucide="${isDark ? "sun" : "moon"}" aria-hidden="true"></i>`;
  document.querySelector('meta[name="theme-color"]').content = isDark ? "#111412" : "#f5f7f6";
  if (window.lucide) window.lucide.createIcons();
}

function initializeTheme() {
  const saved = localStorage.getItem("gongyijihe-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(saved || preferred);
}

async function loadData() {
  try {
    const response = await fetch("data/sites.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.meta = data.meta || {};
    state.sites = Array.isArray(data.sites) ? data.sites : [];
    renderStats();
    renderFilters();
    renderSites();
  } catch (error) {
    console.error("Unable to load sites:", error);
    elements.list.innerHTML = "";
    elements.list.hidden = true;
    elements.empty.hidden = false;
    elements.empty.querySelector("h3").textContent = "站点数据载入失败";
    elements.empty.querySelector("p").textContent = "请刷新页面后重试。";
    elements.resetFilters.hidden = true;
    elements.summary.textContent = "载入失败";
    showToast("站点数据载入失败，请稍后重试");
  }
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  elements.clearSearch.hidden = !state.query;
  renderSites();
});

elements.clearSearch.addEventListener("click", () => {
  state.query = "";
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  elements.search.focus();
  renderSites();
});

elements.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderSites();
});

elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) setCategory(button.dataset.category);
});

elements.resetFilters.addEventListener("click", resetFilters);

elements.themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("gongyijihe-theme", theme);
  setTheme(theme);
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
initializeTheme();
loadData();
