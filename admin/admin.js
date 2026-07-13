const REPOSITORY = {
  owner: "MISSmihu",
  repo: "gongyijihe",
  branch: "main",
  path: "data/sites.json"
};

const TOKEN_KEY = "gongyijihe-github-token";

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) || "",
  sha: "",
  data: null,
  dirty: false,
  query: "",
  editingId: null,
  publishing: false
};

const elements = {
  authView: document.querySelector("#auth-view"),
  editorView: document.querySelector("#editor-view"),
  authForm: document.querySelector("#auth-form"),
  token: document.querySelector("#github-token"),
  connect: document.querySelector("#connect-button"),
  disconnect: document.querySelector("#disconnect-button"),
  authError: document.querySelector("#auth-error"),
  repoState: document.querySelector("#repo-state"),
  sitesTab: document.querySelector("#sites-tab"),
  settingsTab: document.querySelector("#settings-tab"),
  sitesPanel: document.querySelector("#sites-panel"),
  settingsPanel: document.querySelector("#settings-panel"),
  search: document.querySelector("#admin-search"),
  count: document.querySelector("#admin-count"),
  list: document.querySelector("#admin-site-list"),
  empty: document.querySelector("#admin-empty"),
  addSite: document.querySelector("#add-site-button"),
  dialog: document.querySelector("#site-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  siteForm: document.querySelector("#site-form"),
  closeDialog: document.querySelector("#close-dialog"),
  cancelSite: document.querySelector("#cancel-site"),
  settingsForm: document.querySelector("#settings-form"),
  settingsDate: document.querySelector("#settings-date"),
  publish: document.querySelector("#publish-button"),
  saveStatus: document.querySelector("#save-status"),
  dirtyDot: document.querySelector("#dirty-dot"),
  toast: document.querySelector("#admin-toast")
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

function currentDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function decodeBase64(content) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${state.token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2800);
}

function setBusy(button, busy, busyLabel, defaultLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : defaultLabel;
}

function setDirty(dirty = true) {
  state.dirty = dirty;
  elements.publish.disabled = !dirty || state.publishing;
  elements.dirtyDot.classList.toggle("is-dirty", dirty);
  elements.saveStatus.textContent = dirty ? "有尚未发布的修改" : "内容已同步";
}

function showEditor() {
  elements.authView.hidden = true;
  elements.editorView.hidden = false;
  elements.disconnect.hidden = false;
}

function showAuth() {
  elements.authView.hidden = false;
  elements.editorView.hidden = true;
  elements.disconnect.hidden = true;
}

function errorMessage(status, fallback) {
  if (status === 401) return "Token 无效或已过期，请重新创建。";
  if (status === 403) return "Token 没有该仓库的 Contents 读写权限。";
  if (status === 404) return "找不到数据文件，请确认仓库已完成首次部署。";
  if (status === 409) return "文件刚被其他人修改，请刷新后再试。";
  return fallback || `GitHub 请求失败（${status}）`;
}

async function connect(token) {
  state.token = token.trim();
  elements.authError.hidden = true;
  setBusy(elements.connect, true, "正在连接...", "连接 GitHub");

  try {
    const endpoint = `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.repo}/contents/${REPOSITORY.path}?ref=${REPOSITORY.branch}`;
    const response = await fetch(endpoint, { headers: githubHeaders() });
    if (!response.ok) throw new Error(errorMessage(response.status));

    const payload = await response.json();
    state.sha = payload.sha;
    state.data = JSON.parse(decodeBase64(payload.content));
    sessionStorage.setItem(TOKEN_KEY, state.token);
    showEditor();
    renderAll();
    elements.repoState.textContent = `${REPOSITORY.owner}/${REPOSITORY.repo} · ${REPOSITORY.branch}`;
    setDirty(false);
    showToast("仓库内容已载入");
  } catch (error) {
    state.token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    elements.authError.textContent = error.message || "连接 GitHub 失败，请稍后重试。";
    elements.authError.hidden = false;
  } finally {
    setBusy(elements.connect, false, "正在连接...", "连接 GitHub");
  }
}

function getFilteredSites() {
  const query = state.query.trim().toLocaleLowerCase("zh-CN");
  const sites = [...state.data.sites].sort((a, b) => a.order - b.order);
  if (!query) return sites;
  return sites.filter((site) => [site.name, site.url, site.benefit, site.category]
    .join(" ")
    .toLocaleLowerCase("zh-CN")
    .includes(query));
}

function siteRow(site) {
  return `
    <tr data-id="${escapeHtml(site.id)}">
      <td>
        <div class="table-site">
          <strong>${escapeHtml(site.name)}${site.recommended ? " · 推荐" : ""}</strong>
          <small title="${escapeHtml(site.url)}">${escapeHtml(getDomain(site.url))}</small>
        </div>
      </td>
      <td>${escapeHtml(site.benefit)}</td>
      <td><span class="table-category">${escapeHtml(site.category)}</span></td>
      <td><span class="table-status${site.active !== false ? " is-active" : ""}">${site.active !== false ? "显示中" : "已下线"}</span></td>
      <td>
        <div class="table-actions">
          <button class="table-button" type="button" data-action="edit" data-id="${escapeHtml(site.id)}">编辑</button>
          <button class="table-button delete" type="button" data-action="delete" data-id="${escapeHtml(site.id)}">删除</button>
        </div>
      </td>
    </tr>
  `;
}

function renderSites() {
  const sites = getFilteredSites();
  elements.list.innerHTML = sites.map(siteRow).join("");
  elements.count.textContent = `${sites.length} / ${state.data.sites.length} 个站点`;
  elements.empty.hidden = sites.length !== 0;
  elements.list.closest(".data-table-wrap").hidden = sites.length === 0;
}

function renderSettings() {
  const meta = state.data.meta || {};
  document.querySelector("#meta-title").value = meta.title || "";
  document.querySelector("#meta-subtitle").value = meta.subtitle || "";
  document.querySelector("#meta-notice").value = meta.notice || "";
  document.querySelector("#meta-source").value = meta.sourceUrl || "";
  elements.settingsDate.textContent = `最近发布：${meta.updatedAt || "暂无"}`;
}

function renderAll() {
  renderSites();
  renderSettings();
}

function switchTab(tab) {
  const showSites = tab === "sites";
  elements.sitesTab.setAttribute("aria-selected", String(showSites));
  elements.settingsTab.setAttribute("aria-selected", String(!showSites));
  elements.sitesPanel.hidden = !showSites;
  elements.settingsPanel.hidden = showSites;
}

function nextOrder() {
  return Math.max(0, ...state.data.sites.map((site) => Number(site.order) || 0)) + 1;
}

function makeId(name) {
  const slug = name
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "site"}-${Date.now().toString(36)}`;
}

function openSiteDialog(site = null) {
  state.editingId = site?.id || null;
  elements.dialogTitle.textContent = site ? "编辑站点" : "添加站点";
  document.querySelector("#site-id").value = site?.id || "";
  document.querySelector("#site-name").value = site?.name || "";
  document.querySelector("#site-category").value = site?.category || "常规";
  document.querySelector("#site-url").value = site?.url || "";
  document.querySelector("#site-benefit").value = site?.benefit || "";
  document.querySelector("#site-order").value = site?.order || nextOrder();
  document.querySelector("#site-notes").value = site?.notes || "";
  document.querySelector("#site-recommended").checked = Boolean(site?.recommended);
  document.querySelector("#site-active").checked = site ? site.active !== false : true;
  elements.dialog.showModal();
  document.querySelector("#site-name").focus();
}

function closeSiteDialog() {
  elements.dialog.close();
  state.editingId = null;
}

function saveSite(form) {
  const formData = new FormData(form);
  const existingIndex = state.data.sites.findIndex((site) => site.id === state.editingId);
  const existing = existingIndex >= 0 ? state.data.sites[existingIndex] : null;
  const name = String(formData.get("name")).trim();
  const site = {
    id: existing?.id || makeId(name),
    order: Number(formData.get("order")),
    name,
    url: String(formData.get("url")).trim(),
    benefit: String(formData.get("benefit")).trim(),
    category: String(formData.get("category")).trim(),
    recommended: formData.get("recommended") === "on",
    active: formData.get("active") === "on",
    notes: String(formData.get("notes") || "").trim(),
    updatedAt: currentDate()
  };

  if (existingIndex >= 0) {
    state.data.sites.splice(existingIndex, 1, site);
  } else {
    state.data.sites.push(site);
  }

  setDirty(true);
  renderSites();
  closeSiteDialog();
  showToast(existing ? "站点内容已修改，等待发布" : "站点已添加，等待发布");
}

function deleteSite(id) {
  const site = state.data.sites.find((item) => item.id === id);
  if (!site) return;
  if (!window.confirm(`确定删除“${site.name}”吗？此操作需要发布后才会生效。`)) return;
  state.data.sites = state.data.sites.filter((item) => item.id !== id);
  setDirty(true);
  renderSites();
  showToast("站点已删除，等待发布");
}

function applySettings() {
  state.data.meta = {
    ...state.data.meta,
    title: document.querySelector("#meta-title").value.trim(),
    subtitle: document.querySelector("#meta-subtitle").value.trim(),
    notice: document.querySelector("#meta-notice").value.trim(),
    sourceUrl: document.querySelector("#meta-source").value.trim()
  };
  setDirty(true);
  showToast("页面设置已应用，等待发布");
}

async function publish() {
  if (!state.dirty || state.publishing) return;
  state.publishing = true;
  elements.publish.disabled = true;
  elements.publish.textContent = "正在发布...";
  elements.saveStatus.textContent = "正在提交到 GitHub";

  try {
    state.data.meta.updatedAt = currentDate();
    const endpoint = `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.repo}/contents/${REPOSITORY.path}`;
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        ...githubHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `content: update site directory (${state.data.meta.updatedAt})`,
        content: encodeBase64(`${JSON.stringify(state.data, null, 2)}\n`),
        sha: state.sha,
        branch: REPOSITORY.branch
      })
    });

    if (!response.ok) throw new Error(errorMessage(response.status));
    const payload = await response.json();
    state.sha = payload.content.sha;
    renderSettings();
    setDirty(false);
    showToast("发布成功，网站正在自动更新");
  } catch (error) {
    setDirty(true);
    elements.saveStatus.textContent = "发布失败，请检查后重试";
    showToast(error.message || "发布失败，请稍后重试");
  } finally {
    state.publishing = false;
    elements.publish.textContent = "发布到网站";
    elements.publish.disabled = !state.dirty;
  }
}

elements.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  connect(elements.token.value);
});

elements.disconnect.addEventListener("click", () => {
  if (state.dirty && !window.confirm("还有未发布的修改，仍要退出连接吗？")) return;
  sessionStorage.removeItem(TOKEN_KEY);
  state.token = "";
  state.data = null;
  state.sha = "";
  state.dirty = false;
  elements.token.value = "";
  showAuth();
});

elements.sitesTab.addEventListener("click", () => switchTab("sites"));
elements.settingsTab.addEventListener("click", () => switchTab("settings"));
elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderSites();
});
elements.addSite.addEventListener("click", () => openSiteDialog());
elements.closeDialog.addEventListener("click", closeSiteDialog);
elements.cancelSite.addEventListener("click", closeSiteDialog);
elements.siteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.siteForm.reportValidity()) return;
  saveSite(elements.siteForm);
});
elements.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const site = state.data.sites.find((item) => item.id === button.dataset.id);
  if (button.dataset.action === "edit" && site) openSiteDialog(site);
  if (button.dataset.action === "delete") deleteSite(button.dataset.id);
});
elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (elements.settingsForm.reportValidity()) applySettings();
});
elements.publish.addEventListener("click", publish);

window.addEventListener("beforeunload", (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

if (state.token) {
  elements.token.value = state.token;
  connect(state.token);
} else {
  showAuth();
}
