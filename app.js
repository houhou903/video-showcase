const catalog = window.VIDEO_CATALOG || [];

const featureVideo = document.querySelector("#featureVideo");
const activeNumber = document.querySelector("#activeNumber");
const activeCategory = document.querySelector("#activeCategory");
const activeTitle = document.querySelector("#activeTitle");
const activeMeta = document.querySelector("#activeMeta");
const activeFileName = document.querySelector("#activeFileName");
const activeFolder = document.querySelector("#activeFolder");
const activePath = document.querySelector("#activePath");
const totalCount = document.querySelector("#totalCount");
const visibleCount = document.querySelector("#visibleCount");
const searchInput = document.querySelector("#searchInput");
const categoryTabs = document.querySelector("#categoryTabs");
const workGrid = document.querySelector("#workGrid");

const categoryOrder = [
  "全部",
  "D盘视频",
  "生成片段",
  "游戏广告",
  "汽车/产品",
  "软件素材",
  "素材候选",
  "现代西部",
  "角色设定",
  "场景动线",
  "汽车动势",
];

const categoryColors = {
  全部: "#f2c65c",
  D盘视频: "#8dd5c1",
  生成片段: "#ff765f",
  游戏广告: "#b8df62",
  "汽车/产品": "#ff9f6e",
  软件素材: "#7db9ff",
  素材候选: "#c7a6ff",
  现代西部: "#f2c65c",
  角色设定: "#8dd5c1",
  场景动线: "#7db9ff",
  汽车动势: "#ff9f6e",
};

let activeIndex = 0;
let activeCategoryFilter = "全部";
let cardObserver = null;

function escapeText(value) {
  return String(value ?? "");
}

function statCounts() {
  return catalog.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
}

function setAccent(category) {
  const color = categoryColors[category] || categoryColors["素材候选"];
  document.documentElement.style.setProperty("--accent", color);
}

function setActiveById(id, shouldScroll = true) {
  const index = catalog.findIndex((item) => item.id === id);
  if (index === -1) return;
  activeIndex = index;
  const item = catalog[index];
  setAccent(item.category);

  featureVideo.pause();
  featureVideo.removeAttribute("poster");
  if (item.poster) featureVideo.poster = item.poster;
  featureVideo.src = item.src;
  featureVideo.load();
  featureVideo.play().catch(() => {});

  activeNumber.textContent = item.id;
  activeCategory.textContent = item.category;
  activeTitle.textContent = item.title;
  activeFileName.textContent = item.fileName;
  activeFolder.textContent = item.folder;
  activePath.textContent = item.path;
  activeMeta.innerHTML = "";
  [item.duration, item.resolution, `${item.mb} MB`, item.modified].forEach((value) => {
    const chip = document.createElement("span");
    chip.textContent = value;
    activeMeta.appendChild(chip);
  });

  document.querySelectorAll("[data-video-id]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.videoId === id);
  });

  if (shouldScroll) {
    document.querySelector("#stage").scrollIntoView({ behavior: "smooth" });
  }
}

function matchesFilters(item) {
  const query = searchInput.value.trim().toLowerCase();
  const inCategory =
    activeCategoryFilter === "全部" || item.category === activeCategoryFilter;
  if (!inCategory) return false;
  if (!query) return true;
  return [
    item.id,
    item.title,
    item.category,
    item.fileName,
    item.folder,
    item.path,
    item.resolution,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function makeCard(item) {
  const card = document.createElement("button");
  card.className = "work-card";
  card.type = "button";
  card.dataset.videoId = item.id;
  card.style.setProperty("--accent", categoryColors[item.category]);

  const poster = item.poster
    ? `<img class="work-card-poster" src="${item.poster}" alt="" loading="lazy" />`
    : `<span class="poster-fallback"><strong>${item.id}</strong><small>${escapeText(item.category)}</small></span>`;

  card.innerHTML = `
    ${poster}
    <video class="card-preview" muted loop playsinline preload="none" data-src="${item.src}"${item.poster ? ` poster="${item.poster}"` : ""}></video>
    <span class="work-card-content">
      <span class="card-kicker">${item.id} · ${escapeText(item.category)}</span>
      <h3>${escapeText(item.title)}</h3>
      <p>${escapeText(item.duration)} · ${escapeText(item.resolution)} · ${item.mb} MB</p>
    </span>
  `;

  const preview = card.querySelector(".card-preview");
  card.addEventListener("mouseenter", () => {
    if (!preview.src) preview.src = preview.dataset.src;
    preview.play().catch(() => {});
  });
  card.addEventListener("mouseleave", () => {
    preview.pause();
  });
  card.addEventListener("click", () => setActiveById(item.id));
  return card;
}

function renderCards() {
  const filtered = catalog.filter(matchesFilters);
  visibleCount.textContent = filtered.length;
  workGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => fragment.appendChild(makeCard(item)));
  workGrid.appendChild(fragment);

  if (cardObserver) cardObserver.disconnect();
  cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const video = entry.target.querySelector(".card-preview");
        if (video && !video.src) video.src = video.dataset.src;
        cardObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "560px 0px" },
  );
  document.querySelectorAll(".work-card").forEach((card) => cardObserver.observe(card));

  document.querySelectorAll("[data-video-id]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.videoId === catalog[activeIndex]?.id);
  });
}

function renderCategoryTabs() {
  const counts = statCounts();
  categoryTabs.innerHTML = "";
  categoryOrder
    .filter((category) => category === "全部" || counts[category])
    .forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-tab";
      button.dataset.category = category;
      button.style.setProperty("--accent", categoryColors[category]);
      button.innerHTML = `<span>${category}</span><strong>${category === "全部" ? catalog.length : counts[category]}</strong>`;
      button.addEventListener("click", () => {
        activeCategoryFilter = category;
        document.querySelectorAll(".category-tab").forEach((tab) => {
          tab.classList.toggle("is-active", tab.dataset.category === category);
        });
        renderCards();
      });
      categoryTabs.appendChild(button);
    });
  categoryTabs.querySelector("[data-category='全部']")?.classList.add("is-active");
}

totalCount.textContent = catalog.length;
renderCategoryTabs();
renderCards();
if (catalog.length) setActiveById(catalog[0].id, false);

searchInput.addEventListener("input", renderCards);
