const NOW_PLAYING_URL = "/api/now-playing";
const MOVIE_DETAIL_URL = "/api/movie";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const trackEl = document.getElementById("track");
const statusEl = document.getElementById("status");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const favListEl = document.getElementById("favList");
const favCountEl = document.getElementById("favCount");

const modalEl = document.getElementById("modal");
const modalBackdropEl = document.getElementById("modalBackdrop");
const modalCloseEl = document.getElementById("modalClose");
const modalHeroEl = document.getElementById("modalHero");
const modalPosterWrapEl = document.getElementById("modalPosterWrap");
const modalTitleEl = document.getElementById("modalTitle");
const modalChipsEl = document.getElementById("modalChips");
const modalOverviewEl = document.getElementById("modalOverview");
const modalStatsEl = document.getElementById("modalStats");

let modalLastFocusEl = null;
let currentResults = [];
let currentIndex = 0;
let autoplayTimer = null;
let autoplayPausedUntil = 0;
let drag = null;
let favorites = new Map(); // session-only: Map movieId -> { id, title, poster_path, adult }

function isFav(movieId) {
  return favorites.has(String(movieId));
}

function setStatus(message) {
  statusEl.textContent = message || "";
}

function renderGrid(list) {
  trackEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const m of list) {
    i += 1;
    frag.appendChild(movieCard(m, i));
  }
  trackEl.appendChild(frag);
}

function movieCard(movie, rank) {
  const title = movie?.title || movie?.name || "제목 없음";
  const posterPath = movie?.poster_path;
  const movieId = String(movie?.id ?? "");
  const adult = Boolean(movie?.adult);

  const card = document.createElement("article");
  card.className = "card";
  card.draggable = false;
  card.dataset.movieId = movieId;
  card.dataset.title = title;

  const posterBtn = document.createElement("button");
  posterBtn.className = "posterBtn";
  posterBtn.type = "button";
  posterBtn.draggable = false;
  posterBtn.dataset.movieId = movieId;
  posterBtn.dataset.title = title;
  posterBtn.setAttribute("aria-label", `${title} 상세 보기`);

  if (posterPath) {
    const img = document.createElement("img");
    img.className = "poster";
    img.alt = title;
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    img.src = `${IMG_BASE}${posterPath}`;
    img.onerror = () => {
      const fb = document.createElement("div");
      fb.className = "fallback";
      fb.innerHTML = `이미지를 불러오지 못했어요.<strong>${escapeHtml(title)}</strong>`;
      posterBtn.prepend(fb);
      img.remove();
    };
    posterBtn.appendChild(img);
  } else {
    const fb = document.createElement("div");
    fb.className = "fallback";
    fb.innerHTML = `포스터가 없어요.<strong>${escapeHtml(title)}</strong>`;
    posterBtn.appendChild(fb);
  }

  if (Number.isFinite(rank) && rank > 0) {
    const r = document.createElement("div");
    r.className = "rank";
    r.textContent = String(rank);
    posterBtn.appendChild(r);
  }

  const favBtn = document.createElement("button");
  favBtn.className = `favBtn${isFav(movieId) ? " isOn" : ""}`;
  favBtn.type = "button";
  favBtn.dataset.movieId = movieId;
  favBtn.setAttribute("aria-label", isFav(movieId) ? "찜 해제" : "찜");
  favBtn.innerHTML = heartSvg();
  posterBtn.appendChild(favBtn);

  const meta = document.createElement("div");
  meta.className = "cardMeta";
  const t = document.createElement("div");
  t.className = "cardTitle";
  t.textContent = title;
  meta.appendChild(t);

  // 연령 마크: now_playing에 등급이 없어서 adult=true인 경우만 표시(청불)
  if (adult) {
    const age = document.createElement("div");
    age.className = "age age--adult";
    age.textContent = "청불";
    meta.appendChild(age);
  }

  card.appendChild(posterBtn);
  card.appendChild(meta);

  return card;
}

function heartSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12.001 20.5s-7.2-4.35-9.35-8.28C.98 9.12 2.02 6.5 4.62 5.5c1.76-.68 3.72-.17 4.97 1.1.45.45.81.99 1.05 1.58.24-.59.6-1.13 1.05-1.58 1.25-1.27 3.21-1.78 4.97-1.1 2.6 1 3.64 3.62 1.97 6.72C19.2 16.15 12.001 20.5 12.001 20.5Z"
        stroke="rgba(255,255,255,0.95)" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `.trim();
}

function toggleFavoriteFromMovie(movie) {
  const id = String(movie?.id ?? "");
  if (!id) return;
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.set(id, {
      id: Number(id),
      title: String(movie?.title || movie?.name || ""),
      poster_path: movie?.poster_path ? String(movie.poster_path) : "",
      adult: Boolean(movie?.adult),
    });
  }
  renderFavorites();
  for (const btn of trackEl.querySelectorAll(".favBtn")) {
    if (!(btn instanceof HTMLElement)) continue;
    if (btn.dataset.movieId === id) {
      btn.classList.toggle("isOn", favorites.has(id));
      btn.setAttribute("aria-label", favorites.has(id) ? "찜 해제" : "찜");
    }
  }
}

function renderFavorites() {
  const arr = Array.from(favorites.values());
  favCountEl.textContent = arr.length > 0 ? `${arr.length}편` : "아직 없어요";
  favListEl.innerHTML = "";
  if (arr.length === 0) return;

  const frag = document.createDocumentFragment();
  for (const f of arr) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "posterBtn favItem";
    item.dataset.movieId = String(f.id);
    item.dataset.title = f.title || "상세 보기";
    item.setAttribute("aria-label", `${f.title || "영화"} 상세 보기`);

    if (f.poster_path) {
      const img = document.createElement("img");
      img.className = "poster";
      img.alt = f.title || "포스터";
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      img.src = `${IMG_BASE}${f.poster_path}`;
      item.appendChild(img);
    } else {
      const fb = document.createElement("div");
      fb.className = "fallback";
      fb.innerHTML = `포스터가 없어요.<strong>${escapeHtml(f.title || "제목 없음")}</strong>`;
      item.appendChild(fb);
    }

    frag.appendChild(item);
  }
  favListEl.appendChild(frag);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchNowPlaying() {
  const url = new URL(NOW_PLAYING_URL, window.location.origin);
  url.searchParams.set("language", "ko-KR");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB 요청 실패: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  return res.json();
}

async function fetchMovieDetail(movieId) {
  const url = new URL(MOVIE_DETAIL_URL, window.location.origin);
  url.searchParams.set("id", String(movieId));
  url.searchParams.set("language", "ko-KR");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`상세 요청 실패: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  return res.json();
}

function formatMinutes(min) {
  if (!Number.isFinite(min) || min <= 0) return "정보 없음";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function formatDate(iso) {
  if (!iso) return "정보 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "정보 없음";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function statItem(k, v) {
  const el = document.createElement("div");
  el.className = "stat";
  const kk = document.createElement("div");
  kk.className = "stat__k";
  kk.textContent = k;
  const vv = document.createElement("div");
  vv.className = "stat__v";
  vv.textContent = v;
  el.appendChild(kk);
  el.appendChild(vv);
  return el;
}

function openModal() {
  modalLastFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalEl.classList.add("isOpen");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modalCloseEl.focus();
}

function closeModal() {
  modalEl.classList.remove("isOpen");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (modalLastFocusEl) modalLastFocusEl.focus();
}

function setModalLoading(title) {
  modalHeroEl.style.backgroundImage = "";
  modalPosterWrapEl.innerHTML = "";
  modalTitleEl.textContent = title || "불러오는 중…";
  modalChipsEl.innerHTML = `<span class="chip chip--red">Curtain Up</span><span class="chip">Loading</span>`;
  modalOverviewEl.textContent = "상세 정보를 무대 위로 올리는 중…";
  modalStatsEl.innerHTML = "";
}

function renderModal(detail) {
  const title = detail?.title || detail?.name || "제목 없음";
  const overview = detail?.overview || "줄거리 정보가 없어요.";
  const genres = Array.isArray(detail?.genres) ? detail.genres.map((g) => g?.name).filter(Boolean) : [];
  const runtime = formatMinutes(detail?.runtime);
  const release = formatDate(detail?.release_date);
  const rating = Number.isFinite(detail?.vote_average) ? `${detail.vote_average.toFixed(1)} / 10` : "정보 없음";
  const votes = Number.isFinite(detail?.vote_count) ? `${detail.vote_count.toLocaleString("ko-KR")}명` : "정보 없음";
  const popularity = Number.isFinite(detail?.popularity) ? `${Math.round(detail.popularity).toLocaleString("ko-KR")}` : "정보 없음";

  modalTitleEl.textContent = title;
  modalOverviewEl.textContent = overview;

  modalChipsEl.innerHTML = "";
  modalChipsEl.appendChild(chip("Now Playing", true));
  if (genres.length > 0) {
    for (const g of genres.slice(0, 4)) modalChipsEl.appendChild(chip(g, false));
  } else {
    modalChipsEl.appendChild(chip("장르 정보 없음", false));
  }

  modalStatsEl.innerHTML = "";
  modalStatsEl.appendChild(statItem("개봉일", release));
  modalStatsEl.appendChild(statItem("러닝타임", runtime));
  modalStatsEl.appendChild(statItem("평점", rating));
  modalStatsEl.appendChild(statItem("평가수", votes));
  modalStatsEl.appendChild(statItem("인기도", popularity));

  modalPosterWrapEl.innerHTML = "";
  if (detail?.poster_path) {
    const img = document.createElement("img");
    img.alt = title;
    img.loading = "eager";
    img.decoding = "async";
    img.src = `${IMG_BASE}${detail.poster_path}`;
    modalPosterWrapEl.appendChild(img);
  } else {
    const fb = document.createElement("div");
    fb.className = "fallback";
    fb.innerHTML = `포스터가 없어요.<strong>${escapeHtml(title)}</strong>`;
    modalPosterWrapEl.appendChild(fb);
  }

  if (detail?.backdrop_path) {
    modalHeroEl.style.backgroundImage = `url("${BACKDROP_BASE}${detail.backdrop_path}")`;
    modalHeroEl.style.backgroundSize = "cover";
    modalHeroEl.style.backgroundPosition = "center";
  } else {
    modalHeroEl.style.backgroundImage = "";
  }
}

function chip(text, isRed) {
  const el = document.createElement("span");
  el.className = `chip${isRed ? " chip--red" : ""}`;
  el.textContent = text;
  return el;
}

async function load() {
  trackEl.innerHTML = "";
  setStatus("오늘의 상영작을 불러오는 중…");

  try {
    const data = await fetchNowPlaying();
    const results = Array.isArray(data?.results) ? data.results : [];
    currentResults = results;
    currentIndex = 0;

    if (results.length === 0) {
      setStatus("표시할 영화가 없어요.");
      return;
    }

    renderGrid(results);
    updateNavButtons();
    snapToIndex(0, false);
    setStatus(`${results.length}편 상영 중`);
  } catch (err) {
    console.error(err);
    setStatus(`에러: ${err?.message || "불러오기에 실패했어요."}`);

    const fb = document.createElement("div");
    fb.className = "fallback";
    fb.innerHTML =
      "데이터를 불러오지 못했어요.<br/>브라우저 콘솔(F12)과 네트워크 탭에서 에러를 확인해 주세요.";
    trackEl.appendChild(fb);
  }
}

function visibleCount() {
  const w = window.innerWidth;
  if (w <= 420) return 1;
  if (w <= 720) return 2;
  if (w <= 980) return 3;
  return 4;
}

function maxIndex() {
  return Math.max(0, (currentResults?.length || 0) - visibleCount());
}

function updateNavButtons() {
  const max = maxIndex();
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= max;
}

function stepSizePx() {
  const first = trackEl.querySelector(".card");
  if (!(first instanceof HTMLElement)) return 0;
  const second = first.nextElementSibling;
  const gap =
    second instanceof HTMLElement ? Math.max(0, second.offsetLeft - first.offsetLeft - first.offsetWidth) : 16;
  return first.offsetWidth + gap;
}

function snapToIndex(idx, smooth = true) {
  const max = maxIndex();
  currentIndex = Math.min(max, Math.max(0, idx));
  const step = stepSizePx();
  const x = step * currentIndex;
  trackEl.style.transitionDuration = smooth ? "" : "0ms";
  trackEl.style.transform = `translate3d(${-x}px, 0, 0)`;
  updateNavButtons();
}

function currentTranslateX() {
  const step = stepSizePx();
  return -(step * currentIndex);
}

function setTranslateX(px) {
  trackEl.style.transform = `translate3d(${px}px, 0, 0)`;
}

function onDragStart(e) {
  if (!(e instanceof PointerEvent)) return;
  if (e.button !== 0) return;
  if (modalEl.classList.contains("isOpen")) return;

  const step = stepSizePx();
  if (step <= 0) return;

  pauseAutoplay(12_000);
  drag = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startTranslateX: currentTranslateX(),
    moved: false,
    captured: false,
    step,
  };
}

function onDragMove(e) {
  if (!drag || !(e instanceof PointerEvent)) return;
  if (e.pointerId !== drag.pointerId) return;

  const dx = e.clientX - drag.startX;
  if (Math.abs(dx) > 12) drag.moved = true;

  if (drag.moved && !drag.captured) {
    drag.captured = true;
    trackEl.classList.add("isDragging");
    try {
      trackEl.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  const max = maxIndex();
  const minPx = -(drag.step * max);
  const maxPx = 0;
  // slight rubber band at edges
  let next = drag.startTranslateX + dx;
  if (next > maxPx) next = maxPx + (next - maxPx) * 0.25;
  if (next < minPx) next = minPx + (next - minPx) * 0.25;

  setTranslateX(next);
}

function onDragEnd(e) {
  if (!drag || !(e instanceof PointerEvent)) return;
  if (e.pointerId !== drag.pointerId) return;

  const didMove = drag.moved && drag.captured;
  if (drag.captured) trackEl.classList.remove("isDragging");
  drag = null;

  // no real drag happened → allow normal click behavior
  if (!didMove) return;

  // snap to nearest index based on current transform
  const m = trackEl.style.transform.match(/translate3d\((-?\d+(\.\d+)?)px/);
  const px = m ? Number(m[1]) : currentTranslateX();
  const step = stepSizePx();
  const idx = step > 0 ? Math.round(Math.abs(px) / step) : currentIndex;
  snapToIndex(idx, true);

  // prevent click opening modal after drag
  if (didMove) {
    pauseAutoplay(12_000);
    trackEl.dataset.justDragged = "1";
    window.setTimeout(() => {
      delete trackEl.dataset.justDragged;
    }, 160);
  }
}

function pauseAutoplay(ms = 7000) {
  autoplayPausedUntil = Date.now() + ms;
}

function startAutoplay() {
  stopAutoplay();
  autoplayTimer = window.setInterval(() => {
    if (modalEl.classList.contains("isOpen")) return;
    if (Date.now() < autoplayPausedUntil) return;
    const max = maxIndex();
    if (max <= 0) return;
    const next = currentIndex >= max ? 0 : currentIndex + 1;
    snapToIndex(next, true);
  }, 5_000);
}

function stopAutoplay() {
  if (autoplayTimer) window.clearInterval(autoplayTimer);
  autoplayTimer = null;
}

prevBtn.addEventListener("click", () => {
  pauseAutoplay(12_000);
  snapToIndex(currentIndex - 1, true);
});
nextBtn.addEventListener("click", () => {
  pauseAutoplay(12_000);
  snapToIndex(currentIndex + 1, true);
});

trackEl.addEventListener("pointerdown", onDragStart);
trackEl.addEventListener("pointermove", onDragMove);
trackEl.addEventListener("pointerup", onDragEnd);
trackEl.addEventListener("pointercancel", onDragEnd);
trackEl.addEventListener("dragstart", (e) => e.preventDefault());

window.addEventListener("resize", () => {
  snapToIndex(currentIndex, false);
});

trackEl.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    pauseAutoplay(12_000);
    snapToIndex(currentIndex - 1, true);
  }
  if (e.key === "ArrowRight") {
    pauseAutoplay(12_000);
    snapToIndex(currentIndex + 1, true);
  }
});

trackEl.addEventListener("click", async (e) => {
  if (trackEl.dataset.justDragged === "1") return;
  const target = e.target instanceof Element ? e.target : null;
  const favBtn = target?.closest?.(".favBtn");
  if (favBtn instanceof HTMLElement) {
    e.preventDefault();
    e.stopPropagation();
    const id = favBtn.dataset.movieId;
    const movie = currentResults.find((m) => String(m?.id ?? "") === String(id));
    if (movie) toggleFavoriteFromMovie(movie);
    return;
  }

  const btn = target?.closest?.(".posterBtn");
  if (!(btn instanceof HTMLElement)) return;

  const movieId = btn.dataset.movieId;
  if (!movieId) return;

  setModalLoading(btn.dataset.title || "상세 보기");
  openModal();

  try {
    const detail = await fetchMovieDetail(movieId);
    renderModal(detail);
  } catch (err) {
    console.error(err);
    modalTitleEl.textContent = "상세 정보를 불러오지 못했어요";
    modalChipsEl.innerHTML = `<span class="chip chip--red">Oops</span>`;
    modalOverviewEl.textContent = err?.message || "잠시 후 다시 시도해 주세요.";
    modalStatsEl.innerHTML = "";
  }
});

favListEl.addEventListener("click", async (e) => {
  const target = e.target instanceof Element ? e.target : null;
  const btn = target?.closest?.(".posterBtn");
  if (!(btn instanceof HTMLElement)) return;

  const movieId = btn.dataset.movieId;
  if (!movieId) return;

  setModalLoading(btn.dataset.title || "상세 보기");
  openModal();

  try {
    const detail = await fetchMovieDetail(movieId);
    renderModal(detail);
  } catch (err) {
    console.error(err);
    modalTitleEl.textContent = "상세 정보를 불러오지 못했어요";
    modalChipsEl.innerHTML = `<span class="chip chip--red">Oops</span>`;
    modalOverviewEl.textContent = err?.message || "잠시 후 다시 시도해 주세요.";
    modalStatsEl.innerHTML = "";
  }
});

modalBackdropEl.addEventListener("click", closeModal);
modalCloseEl.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalEl.classList.contains("isOpen")) closeModal();
});

load();
startAutoplay();
