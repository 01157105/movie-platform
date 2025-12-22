console.log("app.js loaded");

const API_KEY = "76102c3aa14f9954c0abd93123d484a2";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const grid = document.querySelector(".grid");
const searchBar = document.getElementById("searchBar");
const qEl = document.getElementById("q");
const btnSearch = document.getElementById("btnSearch");
const GENRE_ZH_TW_FIX = {
    28: "動作",
    12: "冒險",
    16: "動畫",
    35: "喜劇",
    80: "犯罪",
    99: "紀錄片",
    18: "劇情",
    10751: "家庭",
    14: "奇幻",
    36: "歷史",
    27: "恐怖",
    10402: "音樂",
    9648: "懸疑",
    10749: "愛情",
    878: "科幻",
    10770: "電視電影",
    53: "驚悚",
    10752: "戰爭",
    37: "西部",

    10759: "動作冒險",
    10765: "科幻奇幻",
    10766: "肥皂劇",
    10767: "談話節目",
    10768: "戰爭政治"
};
// =====================
// Favorites (localStorage)
// =====================
function getFavorites() {
    return JSON.parse(localStorage.getItem("favorites")) || [];
}

function saveFavorites(list) {
    localStorage.setItem("favorites", JSON.stringify(list));
}

function isFavorite(id) {
    return getFavorites().some(m => m.id === id);
}

function toggleFavorite(movie) {
    let favs = getFavorites();

    if (isFavorite(movie.id)) {
        favs = favs.filter(m => m.id !== movie.id);
        alert("已從收藏移除");
    } else {
        favs = [movie, ...favs.filter(m => m.id !== movie.id)];
        alert("已加入收藏");
    }

    saveFavorites(favs);
}

// =====================
// TMDB
// =====================
async function fetchTrending({ page = 1, append = false } = {}) {
    try {
        if (listLoading) return;
        listLoading = true;
        renderLoadMoreBar(); // ✅ 立即把按鈕變成載入中/disabled

        const type = mode === "tv" ? "tv" : "movie";
        const url = `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}&language=zh-TW&page=${page}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        listHasMore = page < (data.total_pages || 1);

        renderMixedResults(data.results || [], { append });
    } catch (err) {
        console.error(err);
        if (!append) {
            grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
        取得資料失敗：${err.message}
      </div>`;
        }
    } finally {
        listLoading = false;
        renderLoadMoreBar(); // ✅ 一定要重畫，把 disabled 拿掉
    }
}




async function searchMedia(keyword, { page = 1, append = false } = {}) {
    try {
        const q = (keyword || "").trim();
        if (!q) return;

        if (listLoading) return;
        listLoading = true;
        renderLoadMoreBar(); // ✅

        const url = `${BASE_URL}/search/${mode}?api_key=${API_KEY}&language=zh-TW&query=${encodeURIComponent(q)}&page=${page}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        listHasMore = page < (data.total_pages || 1);

        renderMixedResults(data.results || [], { append });
    } catch (err) {
        console.error(err);
        if (!append) {
            grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
        搜尋失敗：${err.message}
      </div>`;
        }
    } finally {
        listLoading = false;
        renderLoadMoreBar(); // ✅ 關鍵：搜尋也要重畫，不然按鈕會一直 disabled
    }
}


async function fetchGenres(type) {
    if (genresCache[type]) return genresCache[type];

    const url = `${BASE_URL}/genre/${type}/list?api_key=${API_KEY}&language=zh-TW`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch genres");

    const data = await res.json();
    genresCache[type] = data.genres || [];
    return genresCache[type];
}


async function searchAny(keyword) {
    try {
        const q = (keyword || "").trim();
        if (!q) return;

        const endpoint = mode === "tv" ? "search/tv" : "search/movie";
        const url = `${BASE_URL}/${endpoint}?api_key=${API_KEY}&language=zh-TW&query=${encodeURIComponent(q)}&page=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        renderMixedResults(data.results || []);
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      搜尋失敗：${err.message}
    </div>`;
    }
}

function renderMixedResults(items, { append = false } = {}) {
    if (!append) grid.innerHTML = "";

    items.forEach(item => {
        const poster = item.poster_path ? (IMAGE_BASE + item.poster_path) : "https://via.placeholder.com/300x450?text=No+Image";
        const title = item.title || item.name || "(無標題)";
        const date = item.release_date || item.first_air_date || "未知";
        const voteNum = (typeof item.vote_average === "number") ? item.vote_average : null;
        const score = (voteNum !== null) ? voteNum.toFixed(1) : "N/A";

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="p">
        <p class="t">${title}</p>
        <p class="m">日期：${date} · ⭐ ${score}</p>
        <div class="btn-row">
          <button class="fav-btn">${isFavorite(item.id) ? "💔 移除收藏" : "❤️ 加入收藏"}</button>
          <button class="review-btn">✍️ 寫影評</button>
        </div>
      </div>
    `;

        // 卡片點擊：開詳細（但按鈕要阻止冒泡）
        card.addEventListener("click", async () => {
            try {
                detailBody.innerHTML = `<div style="padding:14px;">載入中...</div>`;
                openModal();
                const detail = await fetchDetail(mode, item.id);
                renderDetail(detail, mode);
            } catch (e) {
                detailBody.innerHTML = `<div style="padding:14px;">載入失敗：${e.message}</div>`;
            }
        });

        // fav（要 stopPropagation，不然會同時開 modal）
        const favBtn = card.querySelector(".fav-btn");
        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorite({
                id: item.id,
                title,
                poster: item.poster_path,
                release_date: date,
                vote: voteNum,
                media_type: mode,
            });
            favBtn.textContent = isFavorite(item.id) ? "💔 移除收藏" : "❤️ 加入收藏";
        });

        // review（也要 stopPropagation）
        card.querySelector(".review-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            openReviewEditor({
                id: item.id,
                title,
                poster: item.poster_path,
                media_type: mode
            });
        });

        grid.appendChild(card);
    });
}

function renderLoadMoreBar() {
    const old = document.getElementById("loadMoreBar");
    if (old) old.remove();

    if (!canShowLoadMore()) return;
    if (!listHasMore && !listLoading) return; // 沒更多且沒在載入，就不顯示

    const bar = document.createElement("div");
    bar.id = "loadMoreBar";
    bar.className = "load-more-bar";

    bar.innerHTML = `
    <button id="btnLoadMore" class="load-more-btn">
      ${listLoading ? "載入中..." : "載入更多"}
    </button>
  `;

    grid.insertAdjacentElement("afterend", bar);

    const btn = document.getElementById("btnLoadMore");
    btn.disabled = listLoading; // ✅ 用 JS 設 disabled 最穩

    btn.addEventListener("click", () => {
        if (listLoading) return;
        loadNextPage();
    });
}

function loadNextPage() {
    if (!listHasMore || listLoading) return;

    listPage += 1;

    if (currentPage === "explore") {
        fetchExploreByState({ page: listPage, append: true });
    } else if (currentPage === "search") {
        if (!lastQuery) return;
        searchMedia(lastQuery, { page: listPage, append: true });
    }
}


function renderMovies(movies) {
    grid.innerHTML = "";

    movies.forEach(movie => {
        const poster = movie.poster_path
            ? IMAGE_BASE + movie.poster_path
            : "https://via.placeholder.com/300x450?text=No+Image";

        const title = movie.title || "(無標題)";
        const date = movie.release_date || "未知";
        const voteNum = (typeof movie.vote_average === "number") ? movie.vote_average : null;
        const score = (voteNum !== null) ? voteNum.toFixed(1) : "N/A";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="p">
        <p class="t">${title}</p>
        <p class="m">上映日期：${date} · ⭐ ${score}</p>

        <div class="btn-row">
          <button class="fav-btn">
            ${isFavorite(movie.id) ? "💔 移除收藏" : "❤️ 加入收藏"}
          </button>
          <button class="review-btn">✍️ 寫影評</button>
        </div>
      </div>
    `;

        // 收藏按鈕
        const favBtn = card.querySelector(".fav-btn");
        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            toggleFavorite({
                id: movie.id,
                title,
                poster: movie.poster_path,
                release_date: date,
                vote: voteNum
            });

            favBtn.textContent = isFavorite(movie.id) ? "💔 移除收藏" : "❤️ 加入收藏";
        });

        // 寫影評按鈕
        const reviewBtn = card.querySelector(".review-btn");
        reviewBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openReviewEditor({
                id: movie.id,
                title,
                poster: movie.poster_path
            });
        });

        grid.appendChild(card);
    });
}


// =====================
// Tabs routing
// =====================
const pageTitle = document.getElementById("pageTitle");
let currentPage = "explore";
let mode = "movie"; // "movie" or "tv"
let showPublicOnly = false;

let currentGenre = ""; // '' = All
const genresCache = { movie: null, tv: null };

// =====================
// Pagination state
// =====================
let listPage = 1;          // 目前第幾頁
let listHasMore = true;    // 還有沒有下一頁
let listLoading = false;   // 防連點
let lastQuery = "";        // 搜尋關鍵字（search 用）

function canShowLoadMore() {
    return currentPage === "explore" || currentPage === "search";
}


document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        currentPage = btn.dataset.page;
        route();
    });
});

async function renderGenreSelect() {
    const select = document.getElementById("genreSelect");
    if (!select) return;

    const genres = await fetchGenres(mode);

    select.innerHTML = `
      <option value="">全部分類</option>
      ${genres.map(g => {
        const name = GENRE_ZH_TW_FIX[g.id] || g.name;
        return `<option value="${g.id}">${name}</option>`;
    }).join("")}
    `;

    select.value = currentGenre;
}

function renderModeBar({ note }) {
    const old = document.getElementById("modeBar");
    if (old) old.remove();

    const bar = document.createElement("div");
    bar.id = "modeBar";
    bar.className = "mode-bar";

    bar.innerHTML = `
    <div class="mode-pill">
      <button id="btnMovie" class="${mode === "movie" ? "active" : ""}">
        電影 Movie
      </button>
      <button id="btnTv" class="${mode === "tv" ? "active" : ""}">
        影集 TV
      </button>
    </div>
    <select id="genreSelect" class="genre-select">
        <option value="">全部分類</option>
    </select>
    <div class="mode-note">${note || ""}</div>
  `;

    pageTitle.insertAdjacentElement("afterend", bar);

    document.getElementById("btnMovie").addEventListener("click", () => {
        if (mode === "movie") return;
        mode = "movie";
        handleModeChange();
    });

    document.getElementById("btnTv").addEventListener("click", () => {
        if (mode === "tv") return;
        mode = "tv";
        handleModeChange();
    });

    renderGenreSelect();

    document.getElementById("genreSelect")
        .addEventListener("change", (e) => {
            currentGenre = e.target.value;
            listPage = 1;
            listHasMore = true;
            fetchExploreByState();
        });
}

function fetchExploreByState({ page = 1, append = false } = {}) {
    if (currentGenre) {
        fetchByGenre({ page, append });
    } else {
        fetchTrending({ page, append });
    }
}

async function fetchByGenre({ page = 1, append = false } = {}) {
    try {
        if (listLoading) return;
        listLoading = true;
        renderLoadMoreBar();

        const url = `${BASE_URL}/discover/${mode}?api_key=${API_KEY}&language=zh-TW&with_genres=${currentGenre}&page=${page}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        listHasMore = page < (data.total_pages || 1);

        renderMixedResults(data.results || [], { append });
    } catch (err) {
        console.error(err);
    } finally {
        listLoading = false;
        renderLoadMoreBar();
    }
}

function updateSearchPlaceholder() {
    if (!qEl) return;
    qEl.placeholder =
        mode === "tv"
            ? "搜尋影集，例如：Breaking Bad"
            : "搜尋電影，例如：阿凡達";
}


function handleModeChange() {
    // ✅ 先更新 placeholder（不會被 return 擋掉）
    updateSearchPlaceholder();

    // 重新渲染 pills（active 狀態）
    renderModeBar({
        note: currentPage === "search" ? "搜尋電影 / 影集" : "探索熱門電影 / 影集"
    });

    if (currentPage === "explore") {
        pageTitle.textContent = mode === "tv" ? "探索熱門影集" : "探索熱門電影";

        listPage = 1;
        listHasMore = true;
        renderLoadMoreBar(); // 先畫出來（載入中狀態會在 fetchTrending 內處理）

        fetchTrending({ page: 1, append: false });
        return;
    }


    if (currentPage === "search") {
        pageTitle.textContent = "搜尋結果";

        listPage = 1;
        listHasMore = true;

        const q = (qEl?.value || "").trim();
        lastQuery = q;

        if (q) {
            searchMedia(q, { page: 1, append: false });
        } else {
            renderLoadMoreBar(); // 沒關鍵字就不顯示
        }
        return;
    }

}






function route() {
    const oldBar = document.getElementById("loadMoreBar");
    if (oldBar) oldBar.remove();
    const old = document.getElementById("modeBar");
    if (old) old.remove();
    if (searchBar) searchBar.classList.add("hidden");
    if (currentPage === "explore") {
        pageTitle.textContent = mode === "tv" ? "探索熱門影集" : "探索熱門電影";
        listPage = 1;
        listHasMore = true;
        lastQuery = "";
        fetchExploreByState({ page: 1, append: false });
        renderModeBar({
            note: "探索熱門電影 / 影集"
        });
        return;
    }


    if (currentPage === "favorites") {
        pageTitle.textContent = "我的收藏";
        renderFavoritesPage();
        return;
    }
    if (currentPage === "search") {
        pageTitle.textContent = "搜尋";
        searchBar.classList.remove("hidden");
        listPage = 1;
        listHasMore = true;
        lastQuery = "";
        renderModeBar({ note: "搜尋電影 / 影集" });
        updateSearchPlaceholder(); // ✅ 用同一套
        const old = document.getElementById("loadMoreBar");
        if (old) old.remove();
        grid.innerHTML = `
    <div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      請在上方輸入關鍵字後按「搜尋」。
    </div>
  `;
        return;
    }




    if (currentPage === "reviews") {
        pageTitle.textContent = "我的影評";

        grid.innerHTML = `
            <div class="reviews-layout">
                <aside class="reviews-side">
                    <button id="togglePublic" class="tab reviews-toggle">
                        ${showPublicOnly ? "✅ 只看公開：開" : "⬜ 只看公開：關"}
                    </button>
                    <div class="reviews-hint">提示：公開 / 私人是在寫影評時選擇</div>
                </aside>

                <section id="reviewsList" class="reviews-list"></section>
                </div>
            `;

        document.getElementById("togglePublic").addEventListener("click", () => {
            showPublicOnly = !showPublicOnly;
            route(); // 重新渲染 reviews 頁
        });

        renderReviewsPage(document.getElementById("reviewsList"));
        return;
    }

    if (currentPage === "wall") {
        pageTitle.textContent = "公開影評牆";
        renderPublicWall();
        return;
    }


    if (currentPage === "about") {
        pageTitle.textContent = "關於";
        grid.innerHTML = `
    <div class="about-card">
      <h3>🎬 電影評價 × 收藏平台</h3>

      <p>
        本專題串接 <strong>TMDB API</strong>，
        提供電影 / 影集的探索、收藏與影評功能，
        並實作分頁、Modal、Skeleton Loading 與狀態管理。
      </p>

      <div class="about-actions">
        <a
          href="https://www.canva.com/design/DAG8P9qw26Q/kS5cOPRtS5ES7X3FfpB5lQ/edit?ui=e30"
          target="_blank"
          rel="noopener"
          class="about-link"
        >
          📑 查看專案簡報（Canva）
        </a>
      </div>
    </div>
  `;
        return;
    }

}

// 先做最簡收藏頁（Step 4 的一半）
function renderFavoritesPage() {
    const favs = getFavorites();

    if (favs.length === 0) {
        grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">目前沒有收藏。</div>`;
        return;
    }

    grid.innerHTML = "";
    favs.forEach(item => {
        const poster = item.poster
            ? (IMAGE_BASE + item.poster)
            : "https://via.placeholder.com/300x450?text=No+Image";

        const title = item.title || "(無標題)";
        const date = item.release_date || "未知";
        const score = (typeof item.vote === "number") ? item.vote.toFixed(1) : "N/A";

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="p">
        <p class="t">${title}</p>
        <p class="m">上映日期：${date} · ⭐ ${score}</p>

        <div class="btn-row">
          <button class="fav-btn">💔 移除收藏</button>
          <button class="review-btn">✍️ 寫影評</button>
        </div>
      </div>
    `;

        // 移除收藏
        card.querySelector(".fav-btn").addEventListener("click", () => {
            toggleFavorite({ id: item.id });
            renderFavoritesPage();
        });

        // 寫影評
        card.querySelector(".review-btn").addEventListener("click", () => {
            openReviewEditor({
                id: item.id,
                title: item.title,
                poster: item.poster
            });
        });

        grid.appendChild(card);
    });
}

function renderReviewsPage(container = grid) {
    let reviews = getReviews().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (showPublicOnly) {
        reviews = reviews.filter(r => r.isPublic);
    }

    if (!reviews.length) {
        container.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      目前沒有影評（或沒有符合篩選條件）。請到「探索」或「搜尋」點 ✍️ 寫影評。
    </div>`;
        return;
    }

    container.innerHTML = "";
    reviews.forEach(r => {
        const poster = r.poster ? (IMAGE_BASE + r.poster) : "https://via.placeholder.com/300x450?text=No+Image";
        const score = (typeof r.rating === "number") ? r.rating.toFixed(1) : "N/A";
        const pub = r.isPublic ? "公開" : "私人";
        const timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "";

        const card = document.createElement("div");
        card.className = "card review-card";
        card.innerHTML = `
      <img src="${poster}" alt="${r.title}">
      <div class="p">
        <p class="t">${r.title}</p>
        <p class="m">我的評分：⭐ ${score} · ${pub}</p>
        <p class="m">更新時間：${timeStr}</p>
        <p class="m" style="white-space:pre-wrap;margin-top:8px;">
          ${(r.content || "").slice(0, 200)}${(r.content || "").length > 200 ? "..." : ""}
        </p>
        <div class="btn-row">
          <button class="review-edit">✍️ 編輯</button>
          <button class="review-del">🗑️ 刪除</button>
        </div>
      </div>
    `;

        card.querySelector(".review-edit").addEventListener("click", () => {
            openReviewEditor({ id: r.id, title: r.title, poster: r.poster });
        });

        card.querySelector(".review-del").addEventListener("click", () => {
            if (!confirm(`確定刪除影評？\n${r.title}`)) return;
            deleteReview(r.id);
            renderReviewsPage(container);
        });

        container.appendChild(card);
    });
}

function renderPublicWall() {
    const reviews = getReviews()
        .filter(r => r.isPublic)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (!reviews.length) {
        grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      目前沒有公開影評。
    </div>`;
        return;
    }

    // 直接用主 grid 當卡片牆
    grid.innerHTML = "";
    reviews.forEach(r => {
        const poster = r.poster ? (IMAGE_BASE + r.poster) : "https://via.placeholder.com/300x450?text=No+Image";
        const score = (typeof r.rating === "number") ? r.rating.toFixed(1) : "N/A";
        const timeStr = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "";

        const card = document.createElement("div");
        card.className = "card review-card";
        card.innerHTML = `
      <img src="${poster}" alt="${r.title}">
      <div class="p">
        <p class="t">${r.title}</p>
        <p class="m">⭐ ${score} · 公開</p>
        <p class="m">更新時間：${timeStr}</p>
        <p class="m" style="white-space:pre-wrap;margin-top:8px;">
          ${(r.content || "").slice(0, 220)}${(r.content || "").length > 220 ? "..." : ""}
        </p>
      </div>
    `;
        grid.appendChild(card);
    });
}

// =====================
// smartFetch (simple)
// =====================
async function smartFetch(url) {
    console.log("[smartFetch] ready"); // ✅ 加這行
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res;
}



// =====================
// Detail Modal
// =====================
const detailModal = document.getElementById("detailModal");
const detailBody = document.getElementById("detailBody");
const detailClose = document.getElementById("detailClose");

function openModal() {
    detailModal.classList.remove("hidden");
    detailModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}
function closeModal() {
    detailModal.classList.add("hidden");
    detailModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}
detailClose?.addEventListener("click", closeModal);
detailModal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closeModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detailModal.classList.contains("hidden")) closeModal();
});

async function fetchDetail(type, id) {
    // type: "movie" or "tv"
    const url = `${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=zh-TW&append_to_response=credits,videos`;
    const res = await smartFetch(url);
    return res.json();
}

function pickTrailerKey(videos) {
    const list = videos?.results || [];
    const yt = list.filter(v => v.site === "YouTube");

    // 先挑 Official Trailer / Trailer / Teaser（依序）
    const prefer = (re) =>
        yt.find(v =>
            (v.type && re.test(v.type)) ||
            (v.name && re.test(v.name))
        );

    const officialTrailer =
        yt.find(v => /official/i.test(v.name || "")) && prefer(/trailer/i);

    const trailer = officialTrailer || prefer(/trailer/i) || prefer(/teaser/i) || yt[0];
    return trailer?.key || "";
}


function renderDetail(detail, type) {
    const title = detail.title || detail.name || "(無標題)";
    const date = detail.release_date || detail.first_air_date || "未知";
    const score = (typeof detail.vote_average === "number") ? detail.vote_average.toFixed(1) : "N/A";
    const poster = detail.poster_path ? (IMAGE_BASE + detail.poster_path) : "https://via.placeholder.com/300x450?text=No+Image";
    const overview = detail.overview || "（無簡介）";
    const genres = (detail.genres || []).slice(0, 8).map(g => g.name);
    const cast = (detail.credits?.cast || []).slice(0, 12).map(c => c.name);
    const trailerKey = pickTrailerKey(detail.videos);

    detailBody.innerHTML = `
    <div class="detail-hero">
      <img src="${poster}" alt="${title}">
      <div>
        <h3 style="margin:0 0 6px;">${title}</h3>
        <div style="color:#666;font-size:13px;">${type.toUpperCase()} · ${date} · ⭐ ${score}</div>

        <div class="badges">
          ${genres.map(x => `<span class="badge">${x}</span>`).join("")}
        </div>

        <div class="detail-section">
          <h4>簡介</h4>
          <div style="white-space:pre-wrap;color:#333;line-height:1.6;">${overview}</div>
        </div>

        <div class="detail-section">
          <h4>主要演員</h4>
          <div class="cast-row">
            ${cast.length ? cast.map(n => `<span class="cast-chip">${n}</span>`).join("") : `<span style="color:#666;font-size:13px;">（無資料）</span>`}
          </div>
        </div>
      </div>
    </div>

    ${trailerKey ? `
      <div class="detail-section">
        <h4>預告片</h4>
        <iframe class="trailer" src="https://www.youtube.com/embed/${trailerKey}" allowfullscreen></iframe>
      </div>
    ` : ""}
  `;
}

// =====================
// Review Modal (new)
// =====================
const reviewModal = document.getElementById("reviewModal");
const reviewClose = document.getElementById("reviewClose");
const reviewCancel = document.getElementById("reviewCancel");
const reviewSave = document.getElementById("reviewSave");

const reviewMovieName = document.getElementById("reviewMovieName");
const reviewStars = document.getElementById("reviewStars");
const reviewScoreText = document.getElementById("reviewScoreText");
const reviewContentEl = document.getElementById("reviewContent");
const reviewPublicEl = document.getElementById("reviewPublic");

// 暫存正在編輯的電影資訊
let reviewDraft = {
    id: null,
    title: "",
    poster: null,
    media_type: "movie",
    rating: 0
};

function openReviewModal() {
    reviewModal.classList.remove("hidden");
    reviewModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeReviewModal() {
    reviewModal.classList.add("hidden");
    reviewModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

reviewClose?.addEventListener("click", closeReviewModal);
reviewCancel?.addEventListener("click", closeReviewModal);

// 點遮罩關閉（外層有 data-close）
reviewModal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closeReviewModal();
});

// ESC 關閉（避免跟 detailModal 衝突：兩個都能關）
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !reviewModal.classList.contains("hidden")) {
        closeReviewModal();
    }
});

function setRating(val) {
    reviewDraft.rating = val;
    renderStars(val);
    reviewScoreText.textContent = `${val} / 10`;
}

function renderStars(current) {
    reviewStars.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "star" + (i <= current ? " active" : "");
        b.textContent = i <= current ? "★" : "☆";
        b.setAttribute("aria-label", `rate ${i}`);
        b.addEventListener("click", () => setRating(i));
        reviewStars.appendChild(b);
    }
}

reviewSave?.addEventListener("click", () => {
    const rating = Number(reviewDraft.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
        alert("評分必須是 1~10");
        return;
    }

    const content = (reviewContentEl.value || "").trim();
    const isPublic = !!reviewPublicEl.checked;

    upsertReview({
        id: reviewDraft.id,
        title: reviewDraft.title,
        poster: reviewDraft.poster,
        rating,
        content,
        isPublic,
        updatedAt: Date.now()
    });

    closeReviewModal();
    alert("影評已儲存");

    if (currentPage === "reviews") renderReviewsPage();
    if (currentPage === "wall") renderPublicWall();
});


// =====================
// Reviews (localStorage)
// =====================
function getReviews() {
    return JSON.parse(localStorage.getItem("reviews")) || [];
}

function saveReviews(list) {
    localStorage.setItem("reviews", JSON.stringify(list));
}

function getReviewById(id) {
    return getReviews().find(r => r.id === id) || null;
}

function upsertReview(review) {
    let list = getReviews();
    const idx = list.findIndex(r => r.id === review.id);
    if (idx >= 0) list[idx] = review;
    else list.unshift(review);
    saveReviews(list);
}

function deleteReview(id) {
    const list = getReviews().filter(r => r.id !== id);
    saveReviews(list);
}

function openReviewEditor(movieInfo) {
    const existing = getReviewById(movieInfo.id);

    reviewDraft = {
        id: movieInfo.id,
        title: movieInfo.title,
        poster: movieInfo.poster,
        media_type: movieInfo.media_type || mode || "movie",
        rating: existing?.rating ?? 8
    };

    reviewMovieName.textContent = movieInfo.title || "(無標題)";
    reviewContentEl.value = existing?.content ?? "";
    reviewPublicEl.checked = existing?.isPublic ?? false;

    setRating(reviewDraft.rating);
    openReviewModal();
}




btnSearch.addEventListener("click", () => {
    pageTitle.textContent = "搜尋結果";
    lastQuery = qEl.value.trim();
    if (!lastQuery) return;

    listPage = 1;
    listHasMore = true;

    const old = document.getElementById("loadMoreBar");
    if (old) old.remove();

    searchMedia(lastQuery, { page: 1, append: false });
});


qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        pageTitle.textContent = "搜尋結果";
        lastQuery = qEl.value.trim();
        listPage = 1;
        listHasMore = true;
        searchMedia(lastQuery, { page: 1, append: false });
    }
});


window.addEventListener("scroll", () => {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    topbar.classList.toggle("scrolled", window.scrollY > 4);
});


// ✅ 啟動
route();
