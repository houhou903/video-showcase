const catalog = window.VIDEO_CATALOG || [];

const featureVideo = document.querySelector("#featureVideo");
const activeNumber = document.querySelector("#activeNumber");
const activeCategory = document.querySelector("#activeCategory");
const activeTitle = document.querySelector("#activeTitle");
const activeMeta = document.querySelector("#activeMeta");
const activeFileName = document.querySelector("#activeFileName");
const activeFolder = document.querySelector("#activeFolder");
const totalCount = document.querySelector("#totalCount");
const visibleCount = document.querySelector("#visibleCount");
const searchInput = document.querySelector("#searchInput");
const categoryTabs = document.querySelector("#categoryTabs");
const workGrid = document.querySelector("#workGrid");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");

const ALL_CATEGORY = "全部";

const categoryOrder = [
  ALL_CATEGORY,
  "游戏广告",
  "素材候选",
  "汽车/产品",
  "生成片段",
  "软件素材",
];

const categoryColors = {
  [ALL_CATEGORY]: "#f1c75f",
  游戏广告: "#79d28f",
  素材候选: "#75b8ff",
  "汽车/产品": "#ff9a6d",
  生成片段: "#d2a1ff",
  软件素材: "#65d5c8",
};

let activeIndex = 0;
let activeCategoryFilter = ALL_CATEGORY;
let cardObserver = null;

function setText(node, value) {
  if (node) node.textContent = String(value ?? "");
}

function getAccent(category) {
  return categoryColors[category] || "#f1c75f";
}

function setAccent(category) {
  document.documentElement.style.setProperty("--accent", getAccent(category));
}

function statCounts() {
  return catalog.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
}

function metaItems(item) {
  return [
    { label: "时长", value: item.duration },
    { label: "规格", value: item.resolution },
    { label: "大小", value: `${item.mb} MB` },
    { label: "日期", value: item.modified },
  ];
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

  setText(activeNumber, item.id);
  setText(activeCategory, item.category);
  setText(activeTitle, item.title);
  setText(activeFileName, item.fileName);
  setText(activeFolder, item.folder);

  activeMeta.innerHTML = "";
  metaItems(item).forEach((meta) => {
    const chip = document.createElement("span");
    const label = document.createElement("small");
    const value = document.createElement("strong");
    label.textContent = meta.label;
    value.textContent = meta.value;
    chip.append(label, value);
    activeMeta.appendChild(chip);
  });

  document.querySelectorAll("[data-video-id]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.videoId === id);
  });

  if (shouldScroll) {
    document.querySelector("#stage").scrollIntoView({ behavior: "smooth" });
  }
}

function moveActive(delta) {
  if (!catalog.length) return;
  const nextIndex = (activeIndex + delta + catalog.length) % catalog.length;
  setActiveById(catalog[nextIndex].id, false);
}

function matchesFilters(item) {
  const query = searchInput.value.trim().toLowerCase();
  const inCategory =
    activeCategoryFilter === ALL_CATEGORY || item.category === activeCategoryFilter;
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

function makePreview(item) {
  const media = document.createElement("span");
  media.className = "card-media";

  if (item.poster) {
    const image = document.createElement("img");
    image.className = "card-poster";
    image.src = item.poster;
    image.alt = "";
    image.loading = "lazy";
    media.appendChild(image);
  }

  const video = document.createElement("video");
  video.className = "card-preview";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.dataset.src = item.src;
  if (item.poster) video.poster = item.poster;

  const fallback = document.createElement("span");
  fallback.className = "poster-fallback";
  fallback.style.setProperty("--accent", getAccent(item.category));

  const number = document.createElement("strong");
  number.textContent = item.id;
  const label = document.createElement("small");
  label.textContent = item.category;
  fallback.append(number, label);

  media.append(video, fallback);
  return media;
}

function makeCard(item) {
  const card = document.createElement("button");
  card.className = "work-card";
  card.type = "button";
  card.dataset.videoId = item.id;
  card.style.setProperty("--accent", getAccent(item.category));

  const media = makePreview(item);

  const content = document.createElement("span");
  content.className = "work-card-content";

  const kicker = document.createElement("span");
  kicker.className = "card-kicker";
  kicker.textContent = `${item.id} · ${item.category}`;

  const title = document.createElement("h3");
  title.textContent = item.title;

  const meta = document.createElement("p");
  meta.textContent = `${item.duration} · ${item.resolution} · ${item.mb} MB`;

  content.append(kicker, title, meta);
  card.append(media, content);

  const preview = media.querySelector(".card-preview");
  const startPreview = () => {
    if (!preview.src) preview.src = preview.dataset.src;
    preview.play().catch(() => {});
  };
  const stopPreview = () => preview.pause();

  card.addEventListener("mouseenter", startPreview);
  card.addEventListener("mouseleave", stopPreview);
  card.addEventListener("focus", startPreview);
  card.addEventListener("blur", stopPreview);
  card.addEventListener("click", () => setActiveById(item.id));

  return card;
}

function renderEmptyState() {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = "没有匹配的视频";
  workGrid.appendChild(empty);
}

function renderCards() {
  const filtered = catalog.filter(matchesFilters);
  visibleCount.textContent = filtered.length;
  workGrid.innerHTML = "";

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => fragment.appendChild(makeCard(item)));
  workGrid.appendChild(fragment);
  if (!filtered.length) renderEmptyState();

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
    { rootMargin: "420px 0px" },
  );

  document.querySelectorAll(".work-card").forEach((card) => {
    cardObserver.observe(card);
    card.classList.toggle(
      "is-active",
      card.dataset.videoId === catalog[activeIndex]?.id,
    );
  });
}

function renderCategoryTabs() {
  const counts = statCounts();
  categoryTabs.innerHTML = "";
  categoryOrder
    .filter((category) => category === ALL_CATEGORY || counts[category])
    .forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-tab";
      button.dataset.category = category;
      button.style.setProperty("--accent", getAccent(category));

      const label = document.createElement("span");
      label.textContent = category;
      const count = document.createElement("strong");
      count.textContent = category === ALL_CATEGORY ? catalog.length : counts[category];
      button.append(label, count);

      button.addEventListener("click", () => {
        activeCategoryFilter = category;
        document.querySelectorAll(".category-tab").forEach((tab) => {
          tab.classList.toggle("is-active", tab.dataset.category === category);
        });
        renderCards();
      });
      categoryTabs.appendChild(button);
    });

  categoryTabs
    .querySelector(`[data-category="${ALL_CATEGORY}"]`)
    ?.classList.add("is-active");
}

totalCount.textContent = catalog.length;
renderCategoryTabs();
renderCards();
if (catalog.length) setActiveById(catalog[0].id, false);

searchInput.addEventListener("input", renderCards);
prevButton.addEventListener("click", () => moveActive(-1));
nextButton.addEventListener("click", () => moveActive(1));

window.addEventListener("keydown", (event) => {
  if (event.target === searchInput) return;
  if (event.key === "ArrowLeft") moveActive(-1);
  if (event.key === "ArrowRight") moveActive(1);
});
