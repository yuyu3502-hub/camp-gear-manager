const STORAGE_KEY = "camp-container-manager-v1";
const DB_NAME = "camp-container-manager-db";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const sampleData = {
  containers: [
    { id: "c-kitchen", name: "キッチン箱", location: "車庫 棚上", color: "#bd5635" },
    { id: "c-light", name: "照明・電源箱", location: "玄関収納", color: "#426d8f" },
    { id: "c-shelter", name: "設営道具箱", location: "車庫 下段", color: "#2f6f56" },
  ],
  items: [
    {
      id: "i-lantern",
      name: "LEDランタン",
      category: "照明",
      containerId: "c-light",
      quantity: 2,
      status: "使用可",
      note: "USB-C充電",
    },
    {
      id: "i-battery",
      name: "ポータブル電源",
      category: "電源",
      containerId: "c-light",
      quantity: 1,
      status: "使用可",
      note: "出発前に満充電",
    },
    {
      id: "i-burner",
      name: "シングルバーナー",
      category: "調理",
      containerId: "c-kitchen",
      quantity: 1,
      status: "使用可",
      note: "OD缶も確認",
    },
    {
      id: "i-cooker",
      name: "クッカーセット",
      category: "調理",
      containerId: "c-kitchen",
      quantity: 1,
      status: "使用可",
      note: "",
    },
    {
      id: "i-stakes",
      name: "ペグ・ハンマー",
      category: "設営",
      containerId: "c-shelter",
      quantity: 1,
      status: "使用可",
      note: "予備ペグ8本",
    },
    {
      id: "i-tarp",
      name: "タープ",
      category: "設営",
      containerId: "c-shelter",
      quantity: 1,
      status: "車載中",
      note: "ポール袋と一緒",
    },
    {
      id: "i-gas",
      name: "ガス缶",
      category: "調理",
      containerId: "c-kitchen",
      quantity: 3,
      status: "補充必要",
      note: "新品を1本追加",
    },
    {
      id: "i-wipes",
      name: "ウェットティッシュ",
      category: "衛生",
      containerId: "c-kitchen",
      quantity: 1,
      status: "補充必要",
      note: "",
    },
  ],
  presets: [
    {
      id: "p-family",
      name: "ファミリー1泊",
      tripType: "1泊 / オートキャンプ",
      note: "調理と照明を厚めに持つ",
      itemIds: ["i-lantern", "i-battery", "i-burner", "i-cooker", "i-stakes", "i-tarp", "i-gas", "i-wipes"],
    },
    {
      id: "p-day",
      name: "デイキャンプ",
      tripType: "日帰り",
      note: "設営は軽め",
      itemIds: ["i-lantern", "i-burner", "i-cooker", "i-gas", "i-wipes"],
    },
    {
      id: "p-solo",
      name: "ソロ軽量",
      tripType: "1泊 / ソロ",
      note: "必要最低限",
      itemIds: ["i-lantern", "i-burner", "i-cooker", "i-stakes", "i-gas"],
    },
  ],
  activePresetId: "p-family",
  selectedPresetId: "p-family",
  checkedItemIds: [],
};

let loadWarning = "";
let state = loadState();
let photoDb = null;
let photoCache = new Map();
let draftItemPhotoId = "";
let draftItemPhotoData = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  navTabs: $$(".nav-tab"),
  views: $$(".view"),
  searchInput: $("#searchInput"),
  seedButton: $("#seedButton"),
  exportButton: $("#exportButton"),
  importInput: $("#importInput"),
  statItems: $("#statItems"),
  statContainers: $("#statContainers"),
  statPresets: $("#statPresets"),
  activePresetSelect: $("#activePresetSelect"),
  checklist: $("#checklist"),
  loadoutCount: $("#loadoutCount"),
  loadoutContainers: $("#loadoutContainers"),
  addContainerButton: $("#addContainerButton"),
  containerList: $("#containerList"),
  itemForm: $("#itemForm"),
  itemFormTitle: $("#itemFormTitle"),
  itemId: $("#itemId"),
  itemName: $("#itemName"),
  itemCategory: $("#itemCategory"),
  itemContainer: $("#itemContainer"),
  itemPhoto: $("#itemPhoto"),
  itemPhotoPreview: $("#itemPhotoPreview"),
  removeItemPhoto: $("#removeItemPhoto"),
  itemQuantity: $("#itemQuantity"),
  itemStatus: $("#itemStatus"),
  itemNote: $("#itemNote"),
  cancelItemEdit: $("#cancelItemEdit"),
  containerDialog: $("#containerDialog"),
  containerForm: $("#containerForm"),
  containerId: $("#containerId"),
  containerName: $("#containerName"),
  containerLocation: $("#containerLocation"),
  containerColor: $("#containerColor"),
  closeContainerDialog: $("#closeContainerDialog"),
  addPresetButton: $("#addPresetButton"),
  presetList: $("#presetList"),
  presetForm: $("#presetForm"),
  presetEditorTitle: $("#presetEditorTitle"),
  presetName: $("#presetName"),
  presetTripType: $("#presetTripType"),
  presetNote: $("#presetNote"),
  presetItemPicker: $("#presetItemPicker"),
  presetItemCount: $("#presetItemCount"),
  deletePresetButton: $("#deletePresetButton"),
  clearChecksButton: $("#clearChecksButton"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleData);

  try {
    return { ...structuredClone(sampleData), ...JSON.parse(saved) };
  } catch (error) {
    loadWarning = "保存データを読み込めなかったため、サンプル表示に戻しました。バックアップファイルがあれば「バックアップから復元」で戻してください。";
    console.error(error);
    return structuredClone(sampleData);
  }
}

function saveState() {
  try {
    const metadata = {
      ...state,
      items: state.items.map(({ photo, ...item }) => item),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
    return true;
  } catch (error) {
    console.error(error);
    alert("保存できませんでした。ブラウザの保存容量が不足している可能性があります。「バックアップを保存」でファイルを残してから、写真や不要な項目を整理してください。");
    return false;
  }
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function getContainer(id) {
  return state.containers.find((container) => container.id === id);
}

function getActivePreset() {
  return state.presets.find((preset) => preset.id === state.activePresetId) || state.presets[0];
}

function getSelectedPreset() {
  return state.presets.find((preset) => preset.id === state.selectedPresetId) || state.presets[0];
}

function filteredItems(items = state.items) {
  const term = elements.searchInput.value.trim().toLowerCase();
  if (!term) return items;

  return items.filter((item) => {
    const container = getContainer(item.containerId);
    return [item.name, item.category, item.status, item.note, container?.name, container?.location]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });
}

function statusClass(status) {
  if (status === "使用可" || status === "車載中") return "status-ok";
  if (status === "補充必要") return "status-warn";
  return "status-bad";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function photoMarkup(item, className = "item-photo") {
  const photo = getItemPhoto(item);
  if (!photo) {
    return `<div class="${className} photo-empty" aria-hidden="true">□</div>`;
  }

  return `<img class="${className}" src="${photo}" alt="${escapeHtml(item.name)}の写真" loading="lazy" />`;
}

function getItemPhoto(item) {
  if (item.photoId && photoCache.has(item.photoId)) return photoCache.get(item.photoId);
  return isSafePhotoData(item.photo) ? item.photo : "";
}

function updatePhotoPreview() {
  const preview = draftItemPhotoData || (draftItemPhotoId ? photoCache.get(draftItemPhotoId) : "");
  elements.itemPhotoPreview.innerHTML = preview
    ? `<img src="${preview}" alt="登録する写真のプレビュー" />`
    : `<div class="photo-placeholder">写真なし</div>`;
  elements.removeItemPhoto.disabled = !preview;
}

function isSafePhotoData(value) {
  return typeof value === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value);
}

function sanitizeColor(value) {
  return HEX_COLOR.test(value || "") ? value : "#2f6f56";
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(PHOTO_STORE, { keyPath: "id" });
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function photoStore(mode = "readonly") {
  return photoDb.transaction(PHOTO_STORE, mode).objectStore(PHOTO_STORE);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function putPhoto(id, data) {
  if (!photoDb || !isSafePhotoData(data)) return "";
  await requestToPromise(photoStore("readwrite").put({ id, data, updatedAt: new Date().toISOString() }));
  photoCache.set(id, data);
  return id;
}

async function deletePhoto(id) {
  if (!photoDb || !id) return;
  await requestToPromise(photoStore("readwrite").delete(id));
  photoCache.delete(id);
}

async function loadPhotoCache() {
  if (!photoDb) return;
  const photos = await requestToPromise(photoStore().getAll());
  photoCache = new Map(photos.map((photo) => [photo.id, photo.data]));
}

async function clearPhotos() {
  if (!photoDb) return;
  await requestToPromise(photoStore("readwrite").clear());
  photoCache.clear();
}

async function migrateLegacyPhotos() {
  let changed = false;
  for (const item of state.items) {
    if (!item.photo || !isSafePhotoData(item.photo)) {
      delete item.photo;
      continue;
    }

    const photoId = item.photoId || uid("photo");
    await putPhoto(photoId, item.photo);
    item.photoId = photoId;
    delete item.photo;
    changed = true;
  }

  if (changed) saveState();
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("写真を読み込めませんでした。")));
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", () => reject(new Error("写真を表示できませんでした。")));
      image.addEventListener("load", () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}

function render(options = {}) {
  const { persist = true } = options;
  normalizeState();
  renderStats();
  renderPresetSelect();
  renderChecklist();
  renderLoadout();
  renderItemContainerOptions();
  renderContainers();
  renderPresetList();
  renderPresetEditor();
  if (persist) saveState();
}

function normalizeState() {
  state.containers = Array.isArray(state.containers) ? state.containers : [];
  state.items = Array.isArray(state.items) ? state.items : [];
  state.presets = Array.isArray(state.presets) ? state.presets : [];
  state.checkedItemIds = Array.isArray(state.checkedItemIds) ? state.checkedItemIds : [];

  state.containers = state.containers.map((container) => ({
    id: container.id || uid("c"),
    name: container.name || "未名称の収納箱",
    location: container.location || "",
    color: sanitizeColor(container.color),
  }));

  if (!state.containers.length) {
    state.containers.push({ id: uid("c"), name: "未分類の収納箱", location: "", color: "#2f6f56" });
  }

  state.items = state.items.map((item) => ({
    id: item.id || uid("i"),
    name: item.name || "未名称アイテム",
    category: item.category || "その他",
    containerId: state.containers.some((container) => container.id === item.containerId)
      ? item.containerId
      : state.containers[0].id,
    quantity: Math.max(1, Number(item.quantity || 1)),
    status: item.status || "使用可",
    note: item.note || "",
    photoId: item.photoId || "",
    ...(isSafePhotoData(item.photo) ? { photo: item.photo } : {}),
  }));

  state.presets = state.presets.map((preset) => ({
    id: preset.id || uid("p"),
    name: preset.name || "未名称セット",
    tripType: preset.tripType || "",
    note: preset.note || "",
    itemIds: Array.isArray(preset.itemIds) ? preset.itemIds : [],
  }));

  if (!state.presets.length) {
    const preset = { id: uid("p"), name: "新しいセット", tripType: "", note: "", itemIds: [] };
    state.presets.push(preset);
    state.activePresetId = preset.id;
    state.selectedPresetId = preset.id;
  }

  if (!state.presets.some((preset) => preset.id === state.activePresetId)) {
    state.activePresetId = state.presets[0].id;
  }

  if (!state.presets.some((preset) => preset.id === state.selectedPresetId)) {
    state.selectedPresetId = state.presets[0].id;
  }
}

function renderStats() {
  elements.statItems.textContent = state.items.length;
  elements.statContainers.textContent = state.containers.length;
  elements.statPresets.textContent = state.presets.length;
}

function renderPresetSelect() {
  elements.activePresetSelect.innerHTML = state.presets
    .map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`)
    .join("");
  elements.activePresetSelect.value = state.activePresetId;
}

function renderChecklist() {
  const preset = getActivePreset();
  const items = filteredItems(state.items.filter((item) => preset.itemIds.includes(item.id)));

  if (!items.length) {
    elements.checklist.innerHTML = `<p class="empty-state">見つかりませんでした。検索条件を変えるか、アイテムを追加してください。</p>`;
    return;
  }

  elements.checklist.innerHTML = items
    .map((item) => {
      const container = getContainer(item.containerId);
      const checked = state.checkedItemIds.includes(item.id);
      return `
        <label class="check-row ${checked ? "done" : ""}">
          <input type="checkbox" data-check-item="${escapeHtml(item.id)}" ${checked ? "checked" : ""} />
          ${photoMarkup(item, "check-photo")}
          <span>
            <span class="item-title">${escapeHtml(item.name)} × ${item.quantity}</span>
            <span class="item-meta">${escapeHtml(item.category)} / ${escapeHtml(container?.name || "未分類の収納箱")}</span>
          </span>
          <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
        </label>
      `;
    })
    .join("");
}

function renderLoadout() {
  const preset = getActivePreset();
  const items = state.items.filter((item) => preset.itemIds.includes(item.id));
  elements.loadoutCount.textContent = `${items.length}点`;

  if (!items.length) {
    elements.loadoutContainers.innerHTML = `<p class="empty-state">「キャンプ別の持ち出しセット」で持っていくアイテムを選ぶと表示されます。</p>`;
    return;
  }

  const groups = state.containers
    .map((container) => ({
      container,
      items: items.filter((item) => item.containerId === container.id),
    }))
    .filter((group) => group.items.length);

  elements.loadoutContainers.innerHTML = groups
    .map(
      ({ container, items: groupItems }) => `
        <article class="loadout-group">
          <h4 style="background:${sanitizeColor(container.color)}">${escapeHtml(container.name)}</h4>
          <ul>
            ${groupItems.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function renderItemContainerOptions() {
  elements.itemContainer.innerHTML = state.containers
    .map((container) => `<option value="${escapeHtml(container.id)}">${escapeHtml(container.name)}</option>`)
    .join("");
}

function renderContainers() {
  const items = filteredItems();

  elements.containerList.innerHTML = state.containers
    .map((container) => {
      const containerItems = items.filter((item) => item.containerId === container.id);
      const rows = containerItems.length
        ? containerItems
            .map(
              (item) => `
                <tr>
                  <td data-label="アイテム">
                    <div class="item-cell">
                      ${photoMarkup(item)}
                      <span>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span class="item-meta">${escapeHtml(item.note || "メモなし")}</span>
                      </span>
                    </div>
                  </td>
                  <td data-label="カテゴリ">${escapeHtml(item.category)}</td>
                  <td data-label="数量">${item.quantity}</td>
                  <td data-label="状態"><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                  <td data-label="操作">
                    <button class="mini-button" type="button" title="編集" aria-label="${escapeHtml(item.name)}を編集" data-edit-item="${escapeHtml(item.id)}">✎</button>
                    <button class="mini-button" type="button" title="削除" aria-label="${escapeHtml(item.name)}を削除" data-delete-item="${escapeHtml(item.id)}">×</button>
                  </td>
                </tr>
              `,
            )
            .join("")
        : `<tr><td colspan="5" class="empty-state">この収納箱に表示できるアイテムはありません。</td></tr>`;

      return `
        <article class="container-card" style="border-left-color:${sanitizeColor(container.color)}">
          <div class="container-card-header">
            <div>
              <h3>${escapeHtml(container.name)}</h3>
              <p>${escapeHtml(container.location || "置き場所未設定")} / ${containerItems.length}点</p>
            </div>
            <div class="card-actions">
              <button class="mini-button" type="button" title="収納箱を編集" aria-label="${escapeHtml(container.name)}を編集" data-edit-container="${escapeHtml(container.id)}">✎</button>
              <button class="mini-button" type="button" title="収納箱を削除" aria-label="${escapeHtml(container.name)}を削除" data-delete-container="${escapeHtml(container.id)}">×</button>
            </div>
          </div>
          <table class="item-table">
            <thead>
              <tr>
                <th>アイテム</th>
                <th>カテゴリ</th>
                <th>数量</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </article>
      `;
    })
    .join("");
}

function renderPresetList() {
  elements.presetList.innerHTML = state.presets
    .map(
      (preset) => `
        <button class="preset-card ${preset.id === state.selectedPresetId ? "active" : ""}" type="button" data-select-preset="${escapeHtml(preset.id)}">
          <strong>${escapeHtml(preset.name)}</strong>
          <span>${escapeHtml(preset.tripType || "用途未設定")} / ${preset.itemIds.length}点</span>
        </button>
      `,
    )
    .join("");
}

function renderPresetEditor() {
  const preset = getSelectedPreset();
  if (!preset) return;

  elements.presetEditorTitle.textContent = `${preset.name}を編集`;
  elements.presetName.value = preset.name;
  elements.presetTripType.value = preset.tripType;
  elements.presetNote.value = preset.note;
  elements.presetItemCount.textContent = `${preset.itemIds.length}点`;

  const items = filteredItems();
  elements.presetItemPicker.innerHTML = items.length
    ? items
        .map((item) => {
          const container = getContainer(item.containerId);
          return `
            <label class="picker-option">
              <input type="checkbox" value="${escapeHtml(item.id)}" ${preset.itemIds.includes(item.id) ? "checked" : ""} />
              ${photoMarkup(item, "picker-photo")}
              <span>
                ${escapeHtml(item.name)}
                <small>${escapeHtml(item.category)} / ${escapeHtml(container?.name || "未分類の収納箱")}</small>
              </span>
            </label>
          `;
        })
        .join("")
    : `<p class="empty-state">登録アイテムがありません。</p>`;
}

function resetItemForm() {
  elements.itemForm.reset();
  elements.itemId.value = "";
  draftItemPhotoId = "";
  draftItemPhotoData = "";
  updatePhotoPreview();
  elements.itemQuantity.value = 1;
  elements.itemFormTitle.textContent = "アイテム追加";
  if (state.containers[0]) elements.itemContainer.value = state.containers[0].id;
}

function openContainerDialog(container) {
  elements.containerId.value = container?.id || "";
  elements.containerName.value = container?.name || "";
  elements.containerLocation.value = container?.location || "";
  elements.containerColor.value = container?.color || "#2f6f56";
  elements.containerDialog.showModal();
}

function deleteContainer(containerId) {
  if (state.containers.length === 1) return;
  const fallback = state.containers.find((container) => container.id !== containerId);
  state.items = state.items.map((item) =>
    item.containerId === containerId ? { ...item, containerId: fallback.id } : item,
  );
  state.containers = state.containers.filter((container) => container.id !== containerId);
}

function bindEvents() {
  elements.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elements.navTabs.forEach((navTab) => navTab.classList.remove("active"));
      elements.views.forEach((view) => view.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.view}View`).classList.add("active");
    });
  });

  elements.searchInput.addEventListener("input", () => render({ persist: false }));

  elements.seedButton.addEventListener("click", async () => {
    if (!confirm("全データをサンプルに戻します。現在の登録内容は上書きされます。先に「バックアップを保存」を使ってください。")) return;
    if (!confirm("本当に全初期化しますか？この操作は元に戻せません。")) return;
    state = structuredClone(sampleData);
    await clearPhotos();
    render();
  });

  elements.exportButton.addEventListener("click", async () => {
    const photos = Array.from(photoCache, ([id, data]) => ({ id, data }));
    const exportState = {
      ...state,
      items: state.items.map(({ photo, ...item }) => item),
    };
    const backup = {
      app: "camp-container-manager",
      version: 2,
      exportedAt: new Date().toISOString(),
      state: exportState,
      photos,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `camp-gear-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  elements.importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());
      const nextState = backup.state || backup;
      if (!Array.isArray(nextState.containers) || !Array.isArray(nextState.items) || !Array.isArray(nextState.presets)) {
        throw new Error("バックアップファイルの形式が正しくありません。");
      }

      if (!confirm("このバックアップファイルで現在のデータを置き換えますか？")) return;
      state = nextState;
      await clearPhotos();
      if (Array.isArray(backup.photos)) {
        for (const photo of backup.photos) {
          await putPhoto(photo.id, photo.data);
        }
      }
      await migrateLegacyPhotos();
      render();
    } catch (error) {
      console.error(error);
      alert(error.message || "バックアップファイルから復元できませんでした。");
    } finally {
      elements.importInput.value = "";
    }
  });

  elements.activePresetSelect.addEventListener("change", (event) => {
    state.activePresetId = event.target.value;
    state.checkedItemIds = [];
    render();
  });

  elements.clearChecksButton.addEventListener("click", () => {
    state.checkedItemIds = [];
    render();
  });

  elements.checklist.addEventListener("change", (event) => {
    const itemId = event.target.dataset.checkItem;
    if (!itemId) return;

    state.checkedItemIds = event.target.checked
      ? [...new Set([...state.checkedItemIds, itemId])]
      : state.checkedItemIds.filter((id) => id !== itemId);
    render();
  });

  elements.addContainerButton.addEventListener("click", () => openContainerDialog());

  elements.containerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = elements.containerId.value || uid("c");
    const nextContainer = {
      id,
      name: elements.containerName.value.trim(),
      location: elements.containerLocation.value.trim(),
      color: sanitizeColor(elements.containerColor.value),
    };

    state.containers = state.containers.some((container) => container.id === id)
      ? state.containers.map((container) => (container.id === id ? nextContainer : container))
      : [...state.containers, nextContainer];

    elements.containerDialog.close();
    render();
  });

  elements.closeContainerDialog.addEventListener("click", () => {
    elements.containerDialog.close();
  });

  elements.itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = elements.itemId.value || uid("i");
    const previous = state.items.find((current) => current.id === id);
    let photoId = draftItemPhotoId;
    if (draftItemPhotoData) {
      photoId = photoId || uid("photo");
      photoId = await putPhoto(photoId, draftItemPhotoData);
    } else if (previous?.photoId && previous.photoId !== photoId) {
      await deletePhoto(previous.photoId);
    }

    const item = {
      id,
      name: elements.itemName.value.trim(),
      category: elements.itemCategory.value,
      containerId: elements.itemContainer.value,
      quantity: Math.max(1, Number(elements.itemQuantity.value || 1)),
      status: elements.itemStatus.value,
      note: elements.itemNote.value.trim(),
      photoId,
    };

    state.items = state.items.some((current) => current.id === id)
      ? state.items.map((current) => (current.id === id ? item : current))
      : [...state.items, item];

    resetItemForm();
    render();
  });

  elements.cancelItemEdit.addEventListener("click", resetItemForm);

  elements.itemPhoto.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選んでください。");
      elements.itemPhoto.value = "";
      return;
    }

    try {
      draftItemPhotoData = await resizePhoto(file);
      updatePhotoPreview();
    } catch (error) {
      alert(error.message);
    }
  });

  elements.removeItemPhoto.addEventListener("click", () => {
    draftItemPhotoId = "";
    draftItemPhotoData = "";
    elements.itemPhoto.value = "";
    updatePhotoPreview();
  });

  elements.containerList.addEventListener("click", async (event) => {
    const editItemId = event.target.dataset.editItem;
    const deleteItemId = event.target.dataset.deleteItem;
    const editContainerId = event.target.dataset.editContainer;
    const deleteContainerId = event.target.dataset.deleteContainer;

    if (editItemId) {
      const item = state.items.find((current) => current.id === editItemId);
      elements.itemId.value = item.id;
      elements.itemName.value = item.name;
      elements.itemCategory.value = item.category;
      elements.itemContainer.value = item.containerId;
      elements.itemQuantity.value = item.quantity;
      elements.itemStatus.value = item.status;
      elements.itemNote.value = item.note;
      draftItemPhotoId = item.photoId || "";
      draftItemPhotoData = "";
      updatePhotoPreview();
      elements.itemFormTitle.textContent = "アイテム編集";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (deleteItemId && confirm("このアイテムを削除しますか？")) {
      const item = state.items.find((current) => current.id === deleteItemId);
      await deletePhoto(item?.photoId);
      state.items = state.items.filter((item) => item.id !== deleteItemId);
      state.presets = state.presets.map((preset) => ({
        ...preset,
        itemIds: preset.itemIds.filter((id) => id !== deleteItemId),
      }));
      state.checkedItemIds = state.checkedItemIds.filter((id) => id !== deleteItemId);
      render();
    }

    if (editContainerId) {
      openContainerDialog(getContainer(editContainerId));
    }

    if (deleteContainerId && confirm("この収納箱を削除しますか？中のアイテムは別の収納箱へ移します。")) {
      deleteContainer(deleteContainerId);
      render();
    }
  });

  elements.addPresetButton.addEventListener("click", () => {
    const preset = { id: uid("p"), name: "新しいセット", tripType: "", note: "", itemIds: [] };
    state.presets = [...state.presets, preset];
    state.selectedPresetId = preset.id;
    state.activePresetId = preset.id;
    render();
  });

  elements.presetList.addEventListener("click", (event) => {
    const presetId = event.target.closest("[data-select-preset]")?.dataset.selectPreset;
    if (!presetId) return;
    state.selectedPresetId = presetId;
    render();
  });

  elements.presetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const preset = getSelectedPreset();
    const visibleItemIds = new Set(filteredItems().map((item) => item.id));
    const checkedVisibleIds = Array.from(elements.presetItemPicker.querySelectorAll("input:checked")).map(
      (input) => input.value,
    );
    const hiddenKeptIds = preset.itemIds.filter((id) => !visibleItemIds.has(id));
    const selectedItemIds = [...new Set([...hiddenKeptIds, ...checkedVisibleIds])];

    state.presets = state.presets.map((current) =>
      current.id === preset.id
        ? {
            ...current,
            name: elements.presetName.value.trim(),
            tripType: elements.presetTripType.value.trim(),
            note: elements.presetNote.value.trim(),
            itemIds: selectedItemIds,
          }
        : current,
    );
    render();
  });

  elements.presetItemPicker.addEventListener("change", () => {
    elements.presetItemCount.textContent = `${elements.presetItemPicker.querySelectorAll("input:checked").length}点`;
  });

  elements.deletePresetButton.addEventListener("click", () => {
    if (state.presets.length === 1 || !confirm("この持ち出しセットを削除しますか？")) return;
    state.presets = state.presets.filter((preset) => preset.id !== state.selectedPresetId);
    state.selectedPresetId = state.presets[0].id;
    state.activePresetId = state.presets[0].id;
    state.checkedItemIds = [];
    render();
  });
}

async function initialize() {
  try {
    photoDb = await openPhotoDb();
    await loadPhotoCache();
    await migrateLegacyPhotos();
  } catch (error) {
    console.error(error);
    alert("写真用ストレージを開けませんでした。写真なしで起動します。");
  }

  bindEvents();
  resetItemForm();
  render();

  if (loadWarning) {
    alert(loadWarning);
  }
}

initialize();
