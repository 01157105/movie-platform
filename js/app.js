console.log("app.js loaded");

const API_KEY = "76102c3aa14f9954c0abd93123d484a2";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const grid = document.querySelector(".grid");
const searchBar = document.getElementById("searchBar");
const qEl = document.getElementById("q");
const btnSearch = document.getElementById("btnSearch");

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
async function fetchTrending() {
    try {
        const type = mode === "tv" ? "tv" : "movie";
        const url = `${BASE_URL}/trending/${type}/week?api_key=${API_KEY}&language=zh-TW`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        renderMixedResults(data.results || []);
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      取得資料失敗：${err.message}
    </div>`;
    }
}


async function searchMedia(keyword) {
    try {
        const q = keyword.trim();
        if (!q) return;

        const url = `${BASE_URL}/search/${mode}?api_key=${API_KEY}&language=zh-TW&query=${encodeURIComponent(q)}&page=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        renderMixedResults(data.results || []); // ✅ 統一用同一套卡片 UI
    } catch (err) {
        console.error(err);
        grid.innerHTML = `
      <div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
        搜尋失敗：${err.message}
      </div>
    `;
    }
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

function renderMixedResults(items) {
    grid.innerHTML = "";

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

        // fav
        const favBtn = card.querySelector(".fav-btn");
        favBtn.addEventListener("click", () => {
            toggleFavorite({
                id: item.id,
                title,
                poster: item.poster_path,
                release_date: date,
                vote: voteNum,
                media_type: mode, // 加分：記錄是 movie / tv
            });
            favBtn.textContent = isFavorite(item.id) ? "💔 移除收藏" : "❤️ 加入收藏";
        });

        // review
        card.querySelector(".review-btn").addEventListener("click", () => {
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

document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        currentPage = btn.dataset.page;
        route();
    });
});

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
        fetchTrending();
        return;
    }

    if (currentPage === "search") {
        pageTitle.textContent = "搜尋結果";
        const q = (qEl?.value || "").trim();
        if (q) searchMedia(q);
        return;
    }
}






function route() {
    const old = document.getElementById("modeBar");
    if (old) old.remove();
    if (searchBar) searchBar.classList.add("hidden");
    if (currentPage === "explore") {
        pageTitle.textContent = mode === "tv" ? "探索熱門影集" : "探索熱門電影";

        renderModeBar({
            note: "探索熱門電影 / 影集"
        });

        fetchTrending();
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

        renderModeBar({ note: "搜尋電影 / 影集" });

        updateSearchPlaceholder(); // ✅ 用同一套

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
        grid.innerHTML = `<div style="padding:16px;background:#fff;border:1px solid #ddd;border-radius:14px;">
      <h3>電影評價 × 收藏平台</h3>
      <p>串接 TMDB API，提供探索、收藏與影評功能。</p>
    </div>`;
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

    const ratingStr = prompt(
        `請輸入評分（1~10）\n${movieInfo.title}`,
        existing?.rating ?? "8"
    );
    if (ratingStr === null) return;

    const rating = Number(ratingStr);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
        alert("評分必須是 1~10 的數字");
        return;
    }

    const content = prompt(
        `請輸入影評內容\n${movieInfo.title}`,
        existing?.content ?? ""
    );
    if (content === null) return;

    const isPublic = confirm("是否設為公開？\n（確定=公開 / 取消=私人）");

    upsertReview({
        id: movieInfo.id,
        title: movieInfo.title,
        poster: movieInfo.poster,
        rating,
        content,
        isPublic,
        updatedAt: Date.now()
    });

    alert("影評已儲存");

    if (currentPage === "reviews") renderReviewsPage();
}



btnSearch.addEventListener("click", () => {
    pageTitle.textContent = "搜尋結果";
    searchMedia(qEl.value);
});

qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        pageTitle.textContent = "搜尋結果";
        searchMedia(qEl.value);
    }
});

window.addEventListener("scroll", () => {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  topbar.classList.toggle("scrolled", window.scrollY > 4);
});


// ✅ 啟動
route();
