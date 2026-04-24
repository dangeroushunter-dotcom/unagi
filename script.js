// スプレッドシートをCSVとして公開
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

// 現在の言語を取得
const lang = (() => {
  const p = new URLSearchParams(location.search).get("lang");
  return ["jp", "en", "zh"].includes(p) ? p : "jp";
})();

// =================================================================
// ★ 中国語の場合は完全に処理を分岐し、準備中画面だけを表示して終了する
// =================================================================
if (lang === "zh") {
  document.addEventListener("DOMContentLoaded", () => {
    // ヘッダーを描画
    const h = document.getElementById("header");
    if (h) h.innerHTML = `<h1>一之屋 菜单<br><span class="en">鳗鱼料理专门店</span></h1>`;
    
    // タブ部分を非表示に
    const tabsWrapper = document.querySelector(".tabs-wrapper");
    if (tabsWrapper) tabsWrapper.style.display = "none";
    
    // メニュー部分に準備中メッセージを描画
    const menu = document.getElementById("menu");
    if (menu) {
      menu.innerHTML = `
        <div style="text-align:center; padding:60px 20px; font-size:1.1em; color:#333;">
          <p style="font-weight:bold; font-size:1.3em;">中文菜单正在制作中。</p>
          <p>Please check the Japanese or English menu.</p>
          <div style="margin-top:40px;">
            <a href="index.html" style="color:#fff; background:#8a3b32; text-decoration:none; padding:12px 30px; border-radius:4px; display:inline-block; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">返回首页 / Back</a>
          </div>
        </div>`;
    }
  });
} else {
  // =================================================================
  // ★ 日本語・英語の場合は、通常のメニュー読み込みと表示を行う
  // =================================================================
  let allRows = [];
  let currentCategory = "";

  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const get = (row, wanted) => {
    const key = Object.keys(row).find((k) => norm(k) === norm(wanted));
    return key ? String(row[key]).trim() : "";
  };
  const catOf = (row) => get(row, "Group") || get(row, "Category");

  const t = (jp, en, zh) => (lang === "en" ? en : jp);

  // 動画リンク対応関数
  const linkify = (text) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
      const btnText = t("🎥 動画を見る", "🎥 Watch Video", "🎥 观看视频");
      return `<br><a href="${url}" target="_blank" class="video-link">${btnText}</a>`;
    });
  };

  const normalizeImageUrl = (url) => {
    const u = String(url || "").trim();
    if (!u) return "";
    const m1 = u.match(/\/file\/d\/([^/]+)/);
    const m2 = u.match(/[?&]id=([^&]+)/);
    const id = (m1 && m1[1]) || (m2 && m2[1]);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : u;
  };

  const visibleRow = (r) => {
    const v = get(r, "Visible").toLowerCase();
    return !(v && /^(×|✗|x|no|0|false)$/i.test(v));
  };

  const CATEGORY_TRANSLATION = {
    en: {
      "季節のお料理": "Seasonal Dishes",
      "うなぎ料理": "Unagi Dishes",
      "コース料理": "Course Meals",
      "お料理": "Dishes",
      "サラダ": "Salads",
      "ビール": "Beer",
      "日本酒": "Sake",
      "焼酎": "Shochu",
      "ウイスキー": "Whisky",
      "サワー類": "Sours",
      "ジャパニーズジン": "Japanese Gin",
      "ワイン": "Wine",
      "赤ワイン": "Red Wine",
      "白ワイン": "White Wine",
      "ソフトドリンク": "Soft Drinks",
      "デザート": "Dessert",
      "その他": "Others",
    }
  };

  const CATEGORY_ORDER = [
    "季節のお料理",
    "うなぎ料理",
    "コース料理",
    "お料理",
    "サラダ",
    "ビール",
    "日本酒",
    "焼酎",
    "ウイスキー",
    "サワー類",
    "ジャパニーズジン",
    "ワイン",
    "ソフトドリンク",
    "デザート",
  ];

  const renderHeader = () => {
    const h = document.getElementById("header");
    h.innerHTML = t(
      `<h1>いちのや料理メニュー<br><span class="en">うなぎ料理専門店</span></h1>`,
      `<h1>Ichinoya Menu<br><span class="en">Unagi Restaurant Menu</span></h1>`
    );
  };

  const translateCat = (cat) => CATEGORY_TRANSLATION[lang]?.[cat] || cat;

  const formatPrice = (pr) => {
    if (!pr) return "";
    let normalized = pr.replace(/ｸﾞﾗｽ/g, "グラス").replace(/ﾊｰﾌﾎﾞﾄﾙ/g, "ハーフボトル").replace(/ﾌﾙﾎﾞﾄﾙ/g, "フルボトル").replace(/ﾎﾞﾄﾙ/g, "ボトル").replace(/ﾎﾟｯﾄ/g, "ポット");

    const tr = (s) => {
      if (lang === "en") return s.replace(/グラス/g, "Glass").replace(/ハーフボトル/g, "Half Bottle").replace(/フルボトル/g, "Full Bottle").replace(/ボトル/g, "Bottle").replace(/ポット/g, "Pot");
      return s;
    };

    const formatSinglePrice = (s) => {
      let text = tr(s.trim());
      const match = text.match(/(.*?)(\d[\d,]*)(?!\s*ml)(.*)/);
      if (match) {
        const beforeLabel = match[1].trim() ? `<span class="price-label">${match[1].trim()}</span>` : "";
        const priceNum = match[2];
        const afterLabel = match[3].trim() ? `<span class="price-label">${match[3].trim()}</span>` : "";
        return `${beforeLabel}<span class="price-value">￥${priceNum}</span>${afterLabel}`;
      }
      return `<span class="price-label">${text}</span>`;
    };

    if (normalized.includes("/")) {
      return `<div class="price-container">` + normalized.split("/").map((p) => `<div class="price-line">${formatSinglePrice(p)}</div>`).join("") + `</div>`;
    }
    return `<div class="price-container"><div class="price-line">${formatSinglePrice(normalized)}</div></div>`;
  };

  const cardHTML = (row) => {
    const cat = catOf(row);
    const sub = get(row, "Category");

    const title = t(get(row, "Name (JP)"), get(row, "Name (EN)"), get(row, "Name (ZH)"));
    const jpName = get(row, "Name (JP)");
    
    const desc = linkify(t(get(row, "Description (JP)"), get(row, "Description (EN)"), get(row, "Description (ZH)")));

    const imgSrc = normalizeImageUrl(get(row, "Image URL"));
    const noImgText = t("画像準備中", "Image Coming Soon", "图片准备中");
    
    const noImgSVG = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b0a090" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    
    const placeholderHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; height:100%; color:#b0a090; font-size:0.9em; font-family:'Yu Gothic', sans-serif;">${noImgSVG}<span>${noImgText}</span></div>`;
    const hiddenPlaceholderHTML = `<div style="display:none; flex-direction:column; align-items:center; justify-content:center; gap:8px; height:100%; color:#b0a090; font-size:0.9em; font-family:'Yu Gothic', sans-serif;">${noImgSVG}<span>${noImgText}</span></div>`;

    let imgBoxHTML = "";
    if (imgSrc) {
      imgBoxHTML = `<div class="menu-img"><img src="${imgSrc}" loading="lazy" alt="${get(row, "Name (EN)") || jpName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">${hiddenPlaceholderHTML}</div>`;
    } else {
      // ★ 「サワー類」も画像枠を作らないように追加しました
      if (cat !== "その他" && cat !== "ソフトドリンク" && cat !== "サワー類") {
        imgBoxHTML = `<div class="menu-img">${placeholderHTML}</div>`;
      }
    }

    const take = get(row, "Takeout");
    const takeBadge = take && /ok/i.test(take) ? `<span class="takeout-badge">${t("テイクアウト可", "Takeout OK", "可外带")}</span>` : "";

    const noteJP = lang === "jp" ? get(row, "Note (JP)") : "";
    const noteHTML = noteJP ? `<p class="note-sub">${linkify(noteJP)}</p>` : "";
    const descHTML = desc ? `<p>${desc}</p>` : "";

    return `
      <div class="menu-item">
        ${imgBoxHTML}
        <div class="menu-text">
          ${cat ? `<div class="cat">${translateCat(cat)}${sub && sub !== cat ? " - " + translateCat(sub) : ""}</div>` : ""}
          <h2>${title}</h2>
          ${lang !== "jp" && jpName ? `<div class="jp-sub">${jpName}</div>` : ""}
          ${takeBadge}
          ${descHTML}
          ${noteHTML}
          ${formatPrice(get(row, "Price"))}
        </div>
      </div>
    `;
  };

  const renderTabs = (cats) => {
    const tabs = document.getElementById("tabs");
    const ordered = CATEGORY_ORDER.filter((c) => cats.includes(c)).concat(cats.filter((c) => !CATEGORY_ORDER.includes(c)));

    tabs.innerHTML = "";
    ordered.forEach((c) => {
      const el = document.createElement("div");
      el.className = "tab" + (c === currentCategory ? " active" : "");
      el.textContent = translateCat(c);
      el.addEventListener("click", () => {
        showCategory(c);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      tabs.appendChild(el);
    });
  };

  const showCategory = (cat) => {
    currentCategory = cat;

    const cats = [...new Set(allRows.map(catOf))].filter(Boolean);
    renderTabs(cats);

    const note = `
      <div class="note">${t(
        "※ 表示価格は税込みです。写真はイメージです。<br>ご飯大盛りは＋160円です。",
        "※ Prices include tax. Photos are for illustration only.<br>Large rice +¥160."
      )}</div>`;

    let drinkNote = "";
    
    if (cat === "焼酎") {
      drinkNote = `
        <div class="drink-note">
          ${t(
            "※ ロック、水割り、お湯割り、ソーダ割からお選びください。",
            "※ Please choose from: On the rocks, With water, With hot water, or With soda."
          )}
        </div>`;
    } else if (cat === "ウイスキー" || cat === "ジャパニーズジン") {
      drinkNote = `
        <div class="drink-note">
          ${t(
            "※ ロック、水割り、ソーダ割からお選びください。",
            "※ Please choose from: On the rocks, With water, or With soda."
          )}
        </div>`;
    }

    const itemsHTML = allRows.filter((r) => catOf(r) === cat).map(cardHTML).join("");
    document.getElementById("menu").innerHTML = note + drinkNote + itemsHTML;
  };

  // ===== load CSV =====
  Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      renderHeader();

      allRows = (res.data || []).filter(visibleRow);
      const cats = [...new Set(allRows.map(catOf))].filter(Boolean);

      if (cats.length) showCategory(cats[0]);
      else document.getElementById("menu").innerHTML = "<p style='text-align:center; padding:40px;'>メニューがありません。</p>";
    },
    error: () => {
      document.getElementById("menu").innerHTML = "<p style='text-align:center; padding:40px;'>メニューの読み込みに失敗しました。再読み込みしてください。</p>";
    },
  });
}
