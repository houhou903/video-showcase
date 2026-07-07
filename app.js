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
const intro = document.querySelector("#intro");
const introCanvas = document.querySelector("#introCanvas");
const enterButton = document.querySelector("#enterButton");

const protectedMediaSelector = "video, img, .card-media, .feature-video";

function protectMediaElement(video) {
  if (!video) return;
  video.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("disableremoteplayback", "");
  video.setAttribute("draggable", "false");
}

protectMediaElement(featureVideo);

document.addEventListener("contextmenu", (event) => {
  if (event.target.closest(protectedMediaSelector)) event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
  if (event.target.closest(protectedMediaSelector)) event.preventDefault();
});

const ALL_CATEGORY = "全部";

const categoryOrder = [
  ALL_CATEGORY,
  "广告",
  "短剧",
];

const categoryColors = {
  [ALL_CATEGORY]: "#f1c75f",
  广告: "#79d28f",
  短剧: "#75b8ff",
};

let activeIndex = 0;
let activeCategoryFilter = ALL_CATEGORY;
let cardObserver = null;
let stageUiIdleTimer = 0;
let lastStageUiActivityAt = Date.now();

function isStageInView() {
  const stage = document.querySelector("#stage");
  if (!stage) return false;
  const rect = stage.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.82 && rect.bottom > 120;
}

function showStageUi() {
  document.body.classList.remove("stage-ui-idle");
}

function scheduleStageUiIdle() {
  window.clearTimeout(stageUiIdleTimer);
  if (document.body.classList.contains("is-intro") || !isStageInView()) {
    showStageUi();
    return;
  }
  const scheduledAt = lastStageUiActivityAt;
  stageUiIdleTimer = window.setTimeout(() => {
    const elapsed = Date.now() - lastStageUiActivityAt;
    if (
      scheduledAt === lastStageUiActivityAt &&
      elapsed >= 2100 &&
      !document.body.classList.contains("is-intro") &&
      isStageInView()
    ) {
      document.body.classList.add("stage-ui-idle");
    }
  }, 2200);
}

function handleStageUiActivity() {
  lastStageUiActivityAt = Date.now();
  showStageUi();
  scheduleStageUiIdle();
}

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
  setText(activeFileName, `${item.duration} · ${item.resolution}`);
  setText(activeFolder, item.category);

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
  protectMediaElement(video);
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

["pointermove", "pointerdown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, handleStageUiActivity, { passive: true });
});

window.addEventListener("keydown", handleStageUiActivity);
window.addEventListener("scroll", handleStageUiActivity, { passive: true });

function hideIntro() {
  if (!intro) return;
  intro.classList.add("is-hidden");
  document.body.classList.remove("is-intro");
  handleStageUiActivity();
  featureVideo.play().catch(() => {});
}

function runIntroParticles() {
  if (!introCanvas || !intro) return () => {};

  const context = introCanvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let animationFrame = 0;
  let isStopped = false;
  const startedAt = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = introCanvas.clientWidth;
    height = introCanvas.clientHeight;
    introCanvas.width = Math.floor(width * dpr);
    introCanvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(360, Math.max(160, Math.floor((width * height) / 6500)));
    particles = Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return {
        angle,
        radius: 80 + Math.random() * Math.min(width, height) * 0.48,
        speed: 0.18 + Math.random() * 0.34,
        size: 0.8 + Math.random() * 2.2,
        drift: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.48 ? "teal" : "amber",
      };
    });
  }

  function draw(now) {
    if (isStopped) return;

    const elapsed = (now - startedAt) / 1000;
    const progress = Math.min(elapsed / 2.6, 1);
    const centerX = width / 2;
    const centerY = height * 0.45;
    context.clearRect(0, 0, width, height);

    const glow = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      Math.max(width, height) * 0.58,
    );
    glow.addColorStop(0, "rgba(241,199,95,0.18)");
    glow.addColorStop(0.36, "rgba(102,213,200,0.08)");
    glow.addColorStop(1, "rgba(5,6,6,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = "lighter";
    particles.forEach((particle, index) => {
      const orbit = particle.angle + elapsed * particle.speed + progress * 2.2;
      const collapse = 1 - progress * 0.58;
      const pulse = Math.sin(elapsed * 2.2 + particle.drift) * 18;
      const radius = particle.radius * collapse + pulse + 56;
      const wave = Math.sin(elapsed * 1.7 + index * 0.11) * 16;
      const x = centerX + Math.cos(orbit) * radius + Math.cos(orbit * 2.1) * wave;
      const y = centerY + Math.sin(orbit) * radius * 0.56 + Math.sin(orbit * 1.7) * wave;
      const alpha = 0.2 + progress * 0.62;
      context.beginPath();
      context.fillStyle =
        particle.hue === "teal"
          ? `rgba(102,213,200,${alpha})`
          : `rgba(241,199,95,${alpha})`;
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    const ringAlpha = Math.max(0, Math.min((elapsed - 0.7) / 1.4, 1));
    if (ringAlpha) {
      context.lineWidth = 1;
      context.strokeStyle = `rgba(247,242,232,${0.18 * ringAlpha})`;
      for (let ring = 0; ring < 3; ring += 1) {
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          130 + ring * 72 + Math.sin(elapsed + ring) * 8,
          58 + ring * 30,
          elapsed * 0.08,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
    }
    context.globalCompositeOperation = "source-over";

    if (elapsed > 2.45) {
      intro.classList.add("is-ready");
    }

    animationFrame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  animationFrame = requestAnimationFrame(draw);

  return () => {
    isStopped = true;
    cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
  };
}

if (intro) {
  document.body.classList.add("is-intro");
  featureVideo.pause();
  const stopParticles = runIntroParticles();
  enterButton?.addEventListener("click", () => {
    hideIntro();
    window.setTimeout(stopParticles, 760);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && intro.classList.contains("is-ready")) {
      hideIntro();
      window.setTimeout(stopParticles, 760);
    }
  });
}
