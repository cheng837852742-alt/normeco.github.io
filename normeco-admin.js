(() => {
  "use strict";

  const DEFAULT_IMAGE = "assets/product-sockets.png";
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  let state = {
    tags: [],
    categories: [],
    products: [],
    selectedProductId: null,
    customCases: [],
    selectedCustomCaseId: null
  };
  let activeView = "products";
  let activeTab = "basic";
  let draggedCategoryId = null;
  let pointerDrag = null;
  let toastTimer = 0;
  let saveTimer = 0;
  let saveQueue = Promise.resolve();
  const catalogChannel = typeof BroadcastChannel === "function"
    ? new BroadcastChannel("normeco-catalog")
    : null;

  const el = (id) => document.getElementById(id);
  const loginView = el("loginView");
  const appView = el("appView");

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `请求失败（${response.status}）`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showLogin(message = "") {
    appView.hidden = true;
    loginView.hidden = false;
    el("loginError").textContent = message;
  }

  async function loadCatalog() {
    const catalog = await requestJson("/api/admin/catalog");
    if (!Array.isArray(catalog.products) || !Array.isArray(catalog.categories) || !Array.isArray(catalog.tags)) {
      throw new Error("目录数据格式不正确。");
    }
    catalog.customCases = Array.isArray(catalog.customCases) ? catalog.customCases : [];
    catalog.selectedCustomCaseId = catalog.selectedCustomCaseId || catalog.customCases[0]?.id || null;
    state = catalog;
    loginView.hidden = true;
    appView.hidden = false;
    renderAll();
  }

  function saveCatalog(showStatus) {
    const payload = JSON.stringify(state);
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      try {
        await requestJson("/api/admin/catalog", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: payload
        });
        if (showStatus) {
          el("saveStatus").classList.remove("saving");
          el("saveStatus").innerHTML = '<svg><use href="#i-check"/></svg>更改已保存';
        }
        catalogChannel?.postMessage({ type: "catalog-updated" });
        return true;
      } catch (error) {
        el("saveStatus").classList.remove("saving");
        el("saveStatus").innerHTML = "保存失败";
        if (error.status === 401) showLogin("登录已失效，请重新登录。");
        showToast(error.message);
        return false;
      }
    });
    return saveQueue;
  }

  function persist(showStatus = true) {
    if (showStatus) {
      el("saveStatus").classList.add("saving");
      el("saveStatus").innerHTML = "正在保存…";
    }
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveCatalog(showStatus), 180);
  }

  function persistNow() {
    clearTimeout(saveTimer);
    el("saveStatus").classList.add("saving");
    el("saveStatus").innerHTML = "正在保存…";
    return saveCatalog(true);
  }

  function selectedProduct() {
    return state.products.find((item) => item.id === state.selectedProductId) || state.products[0] || null;
  }

  function selectedCustomCase() {
    return state.customCases.find((item) => item.id === state.selectedCustomCaseId) || state.customCases[0] || null;
  }

  function categoryById(id) {
    return state.categories.find((item) => item.id === id);
  }

  function categoryPath(id) {
    const category = categoryById(id);
    if (!category) return "未分类";
    const parent = categoryById(category.parentId);
    return parent ? `${parent.name} › ${category.name}` : category.name;
  }

  function showToast(message) {
    const toast = el("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function askConfirm(message) {
    const dialog = el("confirmDialog");
    el("confirmMessage").textContent = message;
    dialog.showModal();
    return new Promise((resolve) => {
      const finish = (accepted) => {
        dialog.close();
        el("confirmAcceptButton").onclick = null;
        el("confirmCancelButton").onclick = null;
        resolve(accepted);
      };
      el("confirmAcceptButton").onclick = () => finish(true);
      el("confirmCancelButton").onclick = () => finish(false);
    });
  }

  function icon(id) {
    return `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  }

  async function boot() {
    try {
      const session = await requestJson("/api/admin/session");
      if (session.authenticated) await loadCatalog();
      else showLogin();
    } catch {
      showLogin("无法连接后台服务，请通过 node server.mjs 启动网站。");
    }
  }

  el("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = el("username").value.trim();
    const password = el("password").value;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      await requestJson("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      el("loginError").textContent = "";
      await loadCatalog();
      showToast("已进入 NORMECO 产品后台");
    } catch (error) {
      el("loginError").textContent = error.message;
      el("password").select();
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  el("logoutButton").addEventListener("click", async () => {
    await requestJson("/api/admin/logout", { method: "POST" }).catch(() => {});
    showLogin();
    el("password").value = "";
    el("password").focus();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelectorAll("[data-jump-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.jumpView));
  });
  el("mobileNavButton").addEventListener("click", () => document.querySelector(".main-nav").classList.toggle("open"));

  function switchView(viewName) {
    activeView = viewName;
    const titleMap = { products: "产品页编辑后台", cases: "定制实例管理", categories: "分类管理", tags: "标签管理" };
    el("pageTitle").textContent = titleMap[viewName];
    ["products", "cases", "categories", "tags"].forEach((view) => {
      el(`${view}View`).hidden = view !== viewName;
    });
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
    document.querySelector(".main-nav").classList.remove("open");
    if (viewName === "categories") renderCategoryTrees();
    if (viewName === "tags") renderTagManager();
    if (viewName === "cases") renderCustomCases();
  }

  function renderAll() {
    if (!selectedProduct() && state.products.length) state.selectedProductId = state.products[0].id;
    if (!selectedCustomCase() && state.customCases.length) state.selectedCustomCaseId = state.customCases[0].id;
    renderCategoryOptions();
    renderProductList();
    renderEditor();
    renderCustomCases();
    renderCategoryTrees();
    renderTagManager();
  }

  function orderedCategories(parentId) {
    return state.categories
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  function categoryOptionsHtml(includeAll = false) {
    const parts = includeAll ? ['<option value="">全部分类</option>'] : [];
    orderedCategories(null).forEach((root) => {
      parts.push(`<option value="${root.id}">${escapeHtml(root.name)}</option>`);
      orderedCategories(root.id).forEach((child) => {
        parts.push(`<option value="${child.id}">　${escapeHtml(root.name)} › ${escapeHtml(child.name)}</option>`);
      });
    });
    return parts.join("");
  }

  function renderCategoryOptions() {
    const filterValue = el("productCategoryFilter").value;
    el("productCategoryFilter").innerHTML = categoryOptionsHtml(true);
    el("productCategoryFilter").value = state.categories.some((item) => item.id === filterValue) ? filterValue : "";
    el("productCategory").innerHTML = categoryOptionsHtml(false);
  }

  function renderProductList() {
    const query = el("productSearch").value.trim().toLowerCase();
    const categoryFilter = el("productCategoryFilter").value;
    const matchingCategories = new Set([categoryFilter]);
    if (categoryFilter) {
      state.categories.filter((item) => item.parentId === categoryFilter).forEach((item) => matchingCategories.add(item.id));
    }
    const products = state.products.filter((product) => {
      const matchesText = `${product.name} ${product.model}`.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || matchingCategories.has(product.categoryId);
      return matchesText && matchesCategory;
    });
    el("productList").innerHTML = products.length ? products.map((product) => `
      <button class="product-list-item ${product.id === state.selectedProductId ? "active" : ""}" data-product-id="${product.id}">
        <img src="${escapeHtml(product.image || DEFAULT_IMAGE)}" alt="">
        <span><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.model)} · ${escapeHtml(product.status)}</span></span>
      </button>`).join("") : '<p class="empty-note">没有匹配产品</p>';
    el("productList").querySelectorAll("[data-product-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedProductId = button.dataset.productId;
        persist(false);
        renderProductList();
        renderEditor();
      });
    });
  }

  el("productSearch").addEventListener("input", renderProductList);
  el("productCategoryFilter").addEventListener("change", renderProductList);

  function renderEditor() {
    const product = selectedProduct();
    const inputs = document.querySelectorAll("#productsView input, #productsView textarea, #productsView select, #productsView button");
    inputs.forEach((input) => { input.disabled = !product && !["addProductButton"].includes(input.id); });
    if (!product) {
      el("editorTitle").textContent = "暂无产品";
      el("editorPath").textContent = "请先新增产品";
      el("miniPreview").innerHTML = '<div class="mini-preview-content">暂无可预览内容</div>';
      return;
    }
    el("editorTitle").textContent = product.name;
    el("editorPath").textContent = categoryPath(product.categoryId);
    el("productName").value = product.name;
    el("productModel").value = product.model;
    el("productStatus").value = product.status;
    el("productCategory").value = product.categoryId;
    el("productSummary").value = product.summary;
    el("summaryCount").textContent = `${product.summary.length}/200`;
    el("productImagePreview").src = product.image || DEFAULT_IMAGE;
    el("detailTitle").value = product.detailTitle || "";
    el("detailIntro").value = product.detailIntro || "";
    el("featureTitle").value = product.featureTitle || "";
    el("featureItems").value = (product.features || []).join("\n");
    el("specNote").value = product.specNote || "";
    renderProductTags();
    renderTable();
    renderMiniPreview();
  }

  document.querySelectorAll("[data-field]").forEach((input) => {
    const eventName = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => {
      const product = selectedProduct();
      if (!product) return;
      product[input.dataset.field] = input.value;
      if (input.id === "productSummary") el("summaryCount").textContent = `${input.value.length}/200`;
      if (["productName", "productModel", "productStatus", "productCategory"].includes(input.id)) {
        el("editorTitle").textContent = product.name;
        el("editorPath").textContent = categoryPath(product.categoryId);
        renderProductList();
      }
      renderMiniPreview();
      persist();
    });
  });
  el("featureItems").addEventListener("input", () => {
    const product = selectedProduct();
    if (!product) return;
    product.features = el("featureItems").value.split("\n").map((item) => item.trim()).filter(Boolean);
    persist();
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${activeTab}Tab`));
    });
  });

  function renderProductTags() {
    const product = selectedProduct();
    if (!product) return;
    el("productTags").innerHTML = product.tagIds.length ? product.tagIds.map((tagId) => {
      const tag = state.tags.find((item) => item.id === tagId);
      return tag ? `<span class="tag-token">${escapeHtml(tag.name)}<button type="button" data-remove-tag="${tag.id}" aria-label="移除 ${escapeHtml(tag.name)}">${icon("i-close")}</button></span>` : "";
    }).join("") : '<span class="empty-note">尚未添加标签</span>';
    el("productTags").querySelectorAll("[data-remove-tag]").forEach((button) => {
      button.addEventListener("click", () => {
        product.tagIds = product.tagIds.filter((id) => id !== button.dataset.removeTag);
        renderProductTags();
        renderMiniPreview();
        renderTagManager();
        persist();
      });
    });
    const available = state.tags.filter((tag) => !product.tagIds.includes(tag.id));
    el("tagPicker").innerHTML = available.length
      ? available.map((tag) => `<option value="${tag.id}">${escapeHtml(tag.name)}</option>`).join("")
      : '<option value="">没有可添加标签</option>';
    el("assignTagButton").disabled = !available.length;
  }

  el("assignTagButton").addEventListener("click", () => {
    const product = selectedProduct();
    const tagId = el("tagPicker").value;
    if (!product || !tagId || product.tagIds.includes(tagId)) return;
    product.tagIds.push(tagId);
    renderProductTags();
    renderMiniPreview();
    renderTagManager();
    persist();
  });

  el("productImageInput").addEventListener("change", async () => {
    const product = selectedProduct();
    const file = el("productImageInput").files[0];
    if (!product || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("图片超过 5MB，请先压缩后再试。");
      el("productImageInput").value = "";
      return;
    }
    try {
      const uploaded = await requestJson("/api/admin/image", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file
      });
      product.image = uploaded.path;
      el("productImagePreview").src = product.image;
      renderProductList();
      renderMiniPreview();
      if (await persistNow()) showToast("产品图片已上传并保存");
    } catch (error) {
      showToast(error.message);
    } finally {
      el("productImageInput").value = "";
    }
  });

  function renderCustomCasePreview() {
    const item = selectedCustomCase();
    if (!item) {
      el("customCasePreview").innerHTML = '<div class="mini-preview-content">暂无可预览实例</div>';
      return;
    }
    const copy = item.zh || {};
    el("customCasePreview").innerHTML = `<article class="custom-case-preview">
      <img src="${escapeHtml(item.image || DEFAULT_IMAGE)}" alt="">
      <h4>${escapeHtml(copy.title || "未命名实例")}</h4>
      <dl>
        <div><dt>需求</dt><dd>${escapeHtml(copy.requirement || "—")}</dd></div>
        <div><dt>定制点</dt><dd>${escapeHtml(copy.customization || "—")}</dd></div>
        <div><dt>应用</dt><dd>${escapeHtml(copy.application || "—")}</dd></div>
      </dl>
    </article>`;
  }

  function renderCustomCases() {
    const item = selectedCustomCase();
    el("customCaseCount").textContent = `${state.customCases.length} 个实例`;
    el("customCaseList").innerHTML = state.customCases.length ? state.customCases.map((customCase, index) => `
      <button class="product-list-item ${customCase.id === state.selectedCustomCaseId ? "active" : ""}" data-custom-case-id="${customCase.id}">
        <img src="${escapeHtml(customCase.image || DEFAULT_IMAGE)}" alt="">
        <span><strong>${escapeHtml(customCase.zh?.title || "未命名实例")}</strong><span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(customCase.status || "草稿")}</span></span>
      </button>`).join("") : '<p class="empty-note">尚无定制实例</p>';

    el("customCaseList").querySelectorAll("[data-custom-case-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedCustomCaseId = button.dataset.customCaseId;
        persist(false);
        renderCustomCases();
      });
    });

    const controls = document.querySelectorAll("#casesView input, #casesView textarea, #casesView select, #casesView button");
    controls.forEach((control) => {
      control.disabled = !item && control.id !== "addCustomCaseButton";
    });
    if (!item) {
      el("customCaseEditorTitle").textContent = "暂无实例";
      el("customCaseImagePreview").src = DEFAULT_IMAGE;
      renderCustomCasePreview();
      return;
    }

    item.zh ||= {};
    item.en ||= {};
    el("customCaseEditorTitle").textContent = item.zh.title || "未命名实例";
    el("customCaseTitleZh").value = item.zh.title || "";
    el("customCaseTitleEn").value = item.en.title || "";
    el("customCaseStatus").value = item.status || "草稿";
    el("customCaseRequirementZh").value = item.zh.requirement || "";
    el("customCaseCustomizationZh").value = item.zh.customization || "";
    el("customCaseApplicationZh").value = item.zh.application || "";
    el("customCaseRequirementEn").value = item.en.requirement || "";
    el("customCaseCustomizationEn").value = item.en.customization || "";
    el("customCaseApplicationEn").value = item.en.application || "";
    el("customCaseImagePreview").src = item.image || DEFAULT_IMAGE;

    const index = state.customCases.findIndex((entry) => entry.id === item.id);
    el("moveCustomCaseUpButton").disabled = index <= 0;
    el("moveCustomCaseDownButton").disabled = index < 0 || index >= state.customCases.length - 1;
    renderCustomCasePreview();
  }

  document.querySelectorAll("[data-case-language][data-case-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const item = selectedCustomCase();
      if (!item) return;
      item[input.dataset.caseLanguage][input.dataset.caseField] = input.value;
      if (input.dataset.caseField === "title" && input.dataset.caseLanguage === "zh") {
        el("customCaseEditorTitle").textContent = input.value || "未命名实例";
        renderCustomCases();
      } else {
        renderCustomCasePreview();
      }
      persist();
    });
  });

  el("customCaseStatus").addEventListener("change", () => {
    const item = selectedCustomCase();
    if (!item) return;
    item.status = el("customCaseStatus").value;
    renderCustomCases();
    persist();
  });

  el("customCaseImageInput").addEventListener("change", async () => {
    const item = selectedCustomCase();
    const file = el("customCaseImageInput").files[0];
    if (!item || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("图片超过 5MB，请先压缩后再试。");
      el("customCaseImageInput").value = "";
      return;
    }
    try {
      const uploaded = await requestJson("/api/admin/image", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file
      });
      item.image = uploaded.path;
      renderCustomCases();
      if (await persistNow()) showToast("定制实例图片已上传并保存");
    } catch (error) {
      showToast(error.message);
    } finally {
      el("customCaseImageInput").value = "";
    }
  });

  el("addCustomCaseButton").addEventListener("click", () => {
    const item = {
      id: uid("custom-case"),
      status: "草稿",
      image: DEFAULT_IMAGE,
      zh: {
        title: "未命名定制实例",
        requirement: "请填写客户需求。",
        customization: "请填写定制点。",
        application: "请填写应用场景。"
      },
      en: {
        title: "Untitled Custom Example",
        requirement: "Describe the requirement.",
        customization: "Describe the customization.",
        application: "Describe the application."
      }
    };
    state.customCases.push(item);
    state.selectedCustomCaseId = item.id;
    renderCustomCases();
    persist();
    showToast("已新增定制实例，请继续编辑");
  });

  function moveCustomCase(offset) {
    const item = selectedCustomCase();
    const index = state.customCases.findIndex((entry) => entry.id === item?.id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= state.customCases.length) return;
    state.customCases.splice(index, 1);
    state.customCases.splice(target, 0, item);
    renderCustomCases();
    persist();
  }

  el("moveCustomCaseUpButton").addEventListener("click", () => moveCustomCase(-1));
  el("moveCustomCaseDownButton").addEventListener("click", () => moveCustomCase(1));

  el("deleteCustomCaseButton").addEventListener("click", async () => {
    const item = selectedCustomCase();
    if (!item || !await askConfirm(`确定删除定制实例“${item.zh?.title || "未命名实例"}”吗？`)) return;
    state.customCases = state.customCases.filter((entry) => entry.id !== item.id);
    state.selectedCustomCaseId = state.customCases[0]?.id || null;
    renderCustomCases();
    persist();
    showToast("定制实例已删除");
  });

  el("saveCustomCaseButton").addEventListener("click", async () => {
    if (await persistNow()) showToast("定制实例已保存到正式目录");
  });

  el("addProductButton").addEventListener("click", () => {
    const categoryId = state.categories[0]?.id || null;
    const product = {
      id: uid("product"),
      name: "未命名产品",
      model: "NEW-001",
      status: "草稿",
      categoryId,
      tagIds: [],
      summary: "请填写产品简短说明。",
      image: DEFAULT_IMAGE,
      detailTitle: "请填写详情页主标题",
      detailIntro: "请填写详情页介绍。",
      featureTitle: "产品特点",
      features: ["请填写产品特点"],
      specNote: "请填写规格说明。",
      columns: ["型号", "参数一", "参数二"],
      rows: [["NEW-001", "—", "—"]]
    };
    state.products.push(product);
    state.selectedProductId = product.id;
    persist();
    renderAll();
    showToast("已新增产品，请继续编辑");
  });

  el("deleteProductButton").addEventListener("click", async () => {
    const product = selectedProduct();
    if (!product || !await askConfirm(`确定删除“${product.name}”吗？保存后将从正式产品目录中移除。`)) return;
    state.products = state.products.filter((item) => item.id !== product.id);
    state.selectedProductId = state.products[0]?.id || null;
    persist();
    renderAll();
    showToast("产品已删除");
  });

  el("saveButton").addEventListener("click", async () => {
    if (await persistNow()) showToast("更改已保存到正式产品目录");
  });

  function renderTable() {
    const product = selectedProduct();
    if (!product) return;
    const header = `
      <thead><tr>
        <th class="row-index"></th>
        ${product.columns.map((column, index) => `<th><input value="${escapeHtml(column)}" data-column-index="${index}" aria-label="第 ${index + 1} 列抬头"></th>`).join("")}
        <th class="table-action">列</th>
      </tr></thead>`;
    const rows = product.rows.map((row, rowIndex) => `
      <tr>
        <td class="row-index">${rowIndex + 1}</td>
        ${product.columns.map((_, columnIndex) => `<td><input value="${escapeHtml(row[columnIndex] || "")}" data-cell="${rowIndex}:${columnIndex}" aria-label="第 ${rowIndex + 1} 行第 ${columnIndex + 1} 列"></td>`).join("")}
        <td class="table-action"><button data-delete-row="${rowIndex}" aria-label="删除第 ${rowIndex + 1} 行">${icon("i-trash")}</button></td>
      </tr>`).join("");
    el("sizeTable").innerHTML = `${header}<tbody>${rows}</tbody><tfoot><tr><td class="row-index"></td>${product.columns.map((_, index) => `<td class="table-action"><button data-delete-column="${index}" aria-label="删除第 ${index + 1} 列">${icon("i-trash")}</button></td>`).join("")}<td></td></tr></tfoot>`;
    el("sizeTable").querySelectorAll("[data-column-index]").forEach((input) => {
      input.addEventListener("input", () => {
        product.columns[Number(input.dataset.columnIndex)] = input.value;
        persist();
      });
    });
    el("sizeTable").querySelectorAll("[data-cell]").forEach((input) => {
      input.addEventListener("input", () => {
        const [rowIndex, columnIndex] = input.dataset.cell.split(":").map(Number);
        product.rows[rowIndex][columnIndex] = input.value;
        persist();
      });
    });
    el("sizeTable").querySelectorAll("[data-delete-row]").forEach((button) => {
      button.addEventListener("click", () => {
        product.rows.splice(Number(button.dataset.deleteRow), 1);
        renderTable();
        persist();
      });
    });
    el("sizeTable").querySelectorAll("[data-delete-column]").forEach((button) => {
      button.addEventListener("click", () => {
        if (product.columns.length <= 1) return showToast("至少需要保留一列。");
        const index = Number(button.dataset.deleteColumn);
        product.columns.splice(index, 1);
        product.rows.forEach((row) => row.splice(index, 1));
        renderTable();
        persist();
      });
    });
  }

  el("addRowButton").addEventListener("click", () => {
    const product = selectedProduct();
    if (!product) return;
    product.rows.push(product.columns.map(() => ""));
    renderTable();
    persist();
  });
  el("addColumnButton").addEventListener("click", () => {
    const product = selectedProduct();
    if (!product) return;
    product.columns.push(`新列 ${product.columns.length + 1}`);
    product.rows.forEach((row) => row.push(""));
    renderTable();
    persist();
  });

  function treeHtml(parentId, compact = false) {
    return orderedCategories(parentId).map((category) => {
      const children = treeHtml(category.id, compact);
      return `
        <div class="tree-node" data-category-node="${category.id}">
          <div class="tree-row" data-drop-category="${category.id}">
            <span class="drag-handle" title="拖动分类">${icon("i-grip")}</span>
            <span class="tree-icon">${icon("i-tree")}</span>
            <span class="tree-label">${escapeHtml(category.name)}</span>
            ${compact ? "" : `<span class="tree-actions">
              <button data-add-child="${category.id}" aria-label="新增子目录">${icon("i-plus")}</button>
              <button data-rename-category="${category.id}" aria-label="重命名分类">${icon("i-edit")}</button>
              <button data-delete-category="${category.id}" aria-label="删除分类">${icon("i-trash")}</button>
            </span>`}
          </div>
          ${children ? `<div class="tree-children">${children}</div>` : ""}
        </div>`;
    }).join("");
  }

  function renderCategoryTrees() {
    el("compactCategoryTree").innerHTML = treeHtml(null, true) || '<p class="empty-note">尚无分类</p>';
    el("categoryManagerTree").innerHTML = treeHtml(null, false) || '<p class="empty-note">尚无分类</p>';
    bindTreeInteractions(el("compactCategoryTree"));
    bindTreeInteractions(el("categoryManagerTree"));
  }

  function bindTreeInteractions(container) {
    container.querySelectorAll("[data-category-node]").forEach((node) => {
      const row = node.querySelector(":scope > .tree-row");
      row.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest("button")) return;
        if (event.pointerType === "touch" && !event.target.closest(".drag-handle")) return;
        event.preventDefault();
        draggedCategoryId = node.dataset.categoryNode;
        pointerDrag = { pointerId: event.pointerId, node, row };
        node.classList.add("dragging");
      });
    });
    container.querySelectorAll("[data-add-child]").forEach((button) => button.addEventListener("click", () => addCategory(button.dataset.addChild)));
    container.querySelectorAll("[data-rename-category]").forEach((button) => button.addEventListener("click", () => renameCategory(button.dataset.renameCategory)));
    container.querySelectorAll("[data-delete-category]").forEach((button) => button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory)));
  }

  function clearCategoryDropTargets() {
    document.querySelectorAll(".drop-target").forEach((item) => item.classList.remove("drop-target"));
  }

  function categoryDropTargetAt(x, y, sourceId) {
    const pointedElement = document.elementFromPoint(x, y);
    if (!pointedElement) return null;
    const rootDropZone = pointedElement.closest("#rootDropZone");
    if (rootDropZone) return rootDropZone;
    const categoryRow = pointedElement.closest("[data-drop-category]");
    return categoryRow?.dataset.dropCategory === sourceId ? null : categoryRow;
  }

  function finishCategoryPointerDrag() {
    pointerDrag?.node.classList.remove("dragging");
    clearCategoryDropTargets();
    pointerDrag = null;
    draggedCategoryId = null;
  }

  document.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    clearCategoryDropTargets();
    const dropTarget = categoryDropTargetAt(event.clientX, event.clientY, draggedCategoryId);
    dropTarget?.classList.add("drop-target");
  });

  document.addEventListener("pointerup", (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    const sourceId = draggedCategoryId;
    const dropTarget = categoryDropTargetAt(event.clientX, event.clientY, sourceId);
    finishCategoryPointerDrag();
    if (dropTarget?.id === "rootDropZone") {
      setCategoryAsRoot(sourceId);
    } else if (dropTarget?.dataset.dropCategory) {
      moveCategory(sourceId, dropTarget.dataset.dropCategory);
    }
  });

  document.addEventListener("pointercancel", (event) => {
    if (pointerDrag?.pointerId === event.pointerId) finishCategoryPointerDrag();
  });

  function addCategory(parentId = null) {
    const name = window.prompt(parentId ? "请输入子目录名称：" : "请输入母目录名称：", "新分类");
    if (!name?.trim()) return;
    state.categories.push({
      id: uid("category"),
      name: name.trim(),
      parentId,
      order: orderedCategories(parentId).length
    });
    persist();
    renderCategoryOptions();
    renderCategoryTrees();
    renderEditor();
    showToast("分类已新增");
  }

  function renameCategory(id) {
    const category = categoryById(id);
    if (!category) return;
    const name = window.prompt("请输入新的分类名称：", category.name);
    if (!name?.trim()) return;
    category.name = name.trim();
    persist();
    renderCategoryOptions();
    renderCategoryTrees();
    renderEditor();
  }

  async function deleteCategory(id) {
    const category = categoryById(id);
    if (!category) return;
    const descendants = state.categories.filter((item) => item.parentId === id);
    const affectedIds = new Set([id, ...descendants.map((item) => item.id)]);
    const usedCount = state.products.filter((item) => affectedIds.has(item.categoryId)).length;
    if (!await askConfirm(`删除“${category.name}”${descendants.length ? "及其子目录" : ""}？${usedCount ? ` ${usedCount} 个产品将变为未分类。` : ""}`)) return;
    state.categories = state.categories.filter((item) => !affectedIds.has(item.id));
    state.products.forEach((product) => {
      if (affectedIds.has(product.categoryId)) product.categoryId = null;
    });
    persist();
    renderAll();
  }

  function moveCategory(sourceId, targetId) {
    const source = categoryById(sourceId);
    const target = categoryById(targetId);
    if (!source || !target || source.id === target.id || target.parentId === source.id) return;
    source.parentId = target.parentId === null ? target.id : target.parentId;
    source.order = orderedCategories(source.parentId).filter((item) => item.id !== source.id).length;
    persist();
    renderCategoryOptions();
    renderCategoryTrees();
    renderEditor();
    showToast(`“${source.name}”已移动到“${categoryById(source.parentId)?.name || "母目录"}”`);
  }

  function setCategoryAsRoot(sourceId) {
    const category = categoryById(sourceId);
    if (!category || category.parentId === null) return;
    category.parentId = null;
    category.order = orderedCategories(null).filter((item) => item.id !== category.id).length;
    persist();
    renderCategoryOptions();
    renderCategoryTrees();
    renderEditor();
    showToast(`“${category.name}”已设为母目录`);
  }

  el("addRootCategoryButton").addEventListener("click", () => addCategory(null));

  function renderTagManager() {
    el("tagManagerList").innerHTML = state.tags.length ? state.tags.map((tag) => {
      const usage = state.products.filter((product) => product.tagIds.includes(tag.id)).length;
      return `<div class="tag-manager-row">
        <input value="${escapeHtml(tag.name)}" data-tag-name="${tag.id}" aria-label="编辑标签 ${escapeHtml(tag.name)}">
        <span class="usage-count">${usage} 个产品使用</span>
        <button data-delete-tag="${tag.id}" aria-label="删除标签">${icon("i-trash")}</button>
      </div>`;
    }).join("") : '<p class="empty-note">尚无标签，请新建标签。</p>';
    el("tagManagerList").querySelectorAll("[data-tag-name]").forEach((input) => {
      input.addEventListener("change", () => {
        const tag = state.tags.find((item) => item.id === input.dataset.tagName);
        if (!tag || !input.value.trim()) return renderTagManager();
        tag.name = input.value.trim();
        persist();
        renderProductTags();
        renderMiniPreview();
      });
    });
    el("tagManagerList").querySelectorAll("[data-delete-tag]").forEach((button) => {
      button.addEventListener("click", async () => {
        const tag = state.tags.find((item) => item.id === button.dataset.deleteTag);
        if (!tag || !await askConfirm(`确定删除标签“${tag.name}”吗？`)) return;
        state.tags = state.tags.filter((item) => item.id !== tag.id);
        state.products.forEach((product) => { product.tagIds = product.tagIds.filter((id) => id !== tag.id); });
        persist();
        renderTagManager();
        renderProductTags();
        renderMiniPreview();
      });
    });
  }

  el("addTagForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = el("newTagName").value.trim();
    if (!name) return;
    if (state.tags.some((tag) => tag.name === name)) return showToast("该标签已存在。");
    state.tags.push({ id: uid("tag"), name });
    el("newTagName").value = "";
    persist();
    renderTagManager();
    renderProductTags();
    showToast("标签已新建");
  });

  function renderMiniPreview() {
    const product = selectedProduct();
    if (!product) return;
    el("miniPreview").innerHTML = `<div class="mini-preview-content">
      <div class="mini-preview-hero">
        <img src="${escapeHtml(product.image || DEFAULT_IMAGE)}" alt="">
        <div><h4>${escapeHtml(product.name)}</h4><p>${escapeHtml(product.model)}<br>${escapeHtml(categoryPath(product.categoryId))}</p></div>
      </div>
      <div class="mini-lines"><span></span><span></span><span></span></div>
    </div>`;
  }

  function fullPreviewHtml() {
    if (activeView === "cases") {
      const item = selectedCustomCase();
      if (!item) return '<div class="full-preview-page"><p>暂无定制实例可预览。</p></div>';
      return `<article class="full-preview-page">
        <header class="preview-site-header"><img src="assets/normeco-logo.png" alt="NORMECO"></header>
        <main class="preview-main">
          <section class="preview-product">
            <div class="preview-product-image"><img src="${escapeHtml(item.image || DEFAULT_IMAGE)}" alt="${escapeHtml(item.zh?.title || "定制实例")}"></div>
            <div class="preview-copy">
              <small>定制服务 · ${escapeHtml(item.status || "草稿")}</small>
              <h2>${escapeHtml(item.zh?.title || "未命名实例")}</h2>
              <p class="preview-summary"><strong>需求：</strong>${escapeHtml(item.zh?.requirement || "—")}</p>
              <p class="preview-summary"><strong>定制点：</strong>${escapeHtml(item.zh?.customization || "—")}</p>
              <p class="preview-summary"><strong>应用：</strong>${escapeHtml(item.zh?.application || "—")}</p>
            </div>
          </section>
          <section class="preview-detail">
            <h3>${escapeHtml(item.en?.title || "Untitled Custom Example")}</h3>
            <p><strong>Requirement:</strong> ${escapeHtml(item.en?.requirement || "—")}</p>
            <p><strong>Customization:</strong> ${escapeHtml(item.en?.customization || "—")}</p>
            <p><strong>Application:</strong> ${escapeHtml(item.en?.application || "—")}</p>
          </section>
        </main>
      </article>`;
    }
    const product = selectedProduct();
    if (!product) return '<div class="full-preview-page"><p>暂无产品可预览。</p></div>';
    const tags = product.tagIds.map((id) => state.tags.find((tag) => tag.id === id)).filter(Boolean);
    return `<article class="full-preview-page">
      <header class="preview-site-header"><img src="assets/normeco-logo.png" alt="NORMECO"></header>
      <main class="preview-main">
        <section class="preview-product">
          <div class="preview-product-image"><img src="${escapeHtml(product.image || DEFAULT_IMAGE)}" alt="${escapeHtml(product.name)}"></div>
          <div class="preview-copy">
            <small>${escapeHtml(categoryPath(product.categoryId))}</small>
            <h2>${escapeHtml(product.name)}</h2>
            <div class="preview-model">${escapeHtml(product.model)}</div>
            <p class="preview-summary">${escapeHtml(product.summary)}</p>
            <div class="preview-tags">${tags.map((tag) => `<span>${escapeHtml(tag.name)}</span>`).join("")}</div>
          </div>
        </section>
        <section class="preview-detail">
          <h3>${escapeHtml(product.detailTitle)}</h3>
          <p>${escapeHtml(product.detailIntro)}</p>
          <h3>${escapeHtml(product.featureTitle)}</h3>
          <ul>${(product.features || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <p>${escapeHtml(product.specNote)}</p>
          <table class="preview-table">
            <thead><tr>${product.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
            <tbody>${product.rows.map((row) => `<tr>${product.columns.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </section>
      </main>
    </article>`;
  }

  function openPreview() {
    el("fullPreview").innerHTML = fullPreviewHtml();
    el("previewDialog").showModal();
  }

  el("previewButton").addEventListener("click", openPreview);
  el("closePreviewButton").addEventListener("click", () => el("previewDialog").close());
  el("previewDialog").addEventListener("click", (event) => {
    if (event.target === el("previewDialog")) el("previewDialog").close();
  });

  boot();
})();
