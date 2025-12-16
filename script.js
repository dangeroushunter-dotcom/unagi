const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

let allRows = [];
let currentCategory = "";

// === 言語取得（日本語 / 英語 / 中国語） ===
const params = new URLSearchParams(window.location.search);
const langParam = params.get("lang");
let currentLang = ["jp", "en", "zh"].includes(langParam) ? langParam : "jp";

// === 数値を日本円表記に（※今は未使用、必要ならPrice整形で使える） ===
function yen(v) {
  const n = Number(v);
  return isNaN(n) ? v : n.toLocaleString("ja-JP");
}

// === 列名揺れ対策 ===
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
function get(row, wanted) {
  const key = Object.keys(row).find((k) => norm(k) === norm(wanted));
  return key ? String(row[key]).trim() : "";
}

function getCategory(row) {
  return get(row, "Group") || get(row, "Category");
}

// === Google Drive 共有リンク → 画像表示用URLに変換 ===
function normalizeImageUrl(url) {
  if (!url) return "";
  const u = String(url).trim();

  // 1) https://drive.google.com/file/d/FILE_ID/view?...
  const m1 = u.match(/\/file\/d\/([^/]+)/);
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // 2) https://drive.google.com/open?id=FILE_ID
  // 3) https://drive.google.com/uc?id=FILE_ID&export=download 等
  const m2 = u.match(/[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;

  // すでに直リンク or 外部URL
  return u;
}

// === カテゴリ翻訳辞書 ===
const CATEGORY_TRANSLATION = {
  jp: {
    "季節のお料理": "季節のお料理",
    "うなぎ料理": "うなぎ料理",
    "コース料理": "コース料理",
    "お料理": "お料理",
    "サラダ": "サラダ",
    "ビール": "ビール",
    "日本酒": "日本酒",
    "焼酎": "焼酎",
    "ウイスキー": "ウイスキー",
    "サワー類": "サワー類",
    "ジャパニーズジン": "ジャパニーズジン",
    "ソフトドリンク": "ソフトドリンク",
    "デザート": "デザート",
    "その他": "その他",
  },
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
    "ソフトドリンク": "Soft Drinks",
    "デザート": "Dessert",
    "その他": "Others",
  },
  zh: {}, // 現状は準備中表示なので未使用
};

// === カテゴリ順序 ===
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
  "ソフトドリンク",
  "デザート",
];

// === ヘッダー切り替え ===
function renderHeader() {
  const header = document.getElementById("header");

  if (currentLang === "en") {
    header.innerHTML = `
      <h1>Ichinoya Menu<br><span class="en">Unagi Restaurant Menu</span></h1>
    `;
  } else if (currentLang === "zh") {
    header.innerHTML = `
      <h1>一之屋 菜单<br><span class="en">鳗鱼料理专门店</span></h1>
    `;
  } else {
    header.innerHTML = `
      <h1>いちのや料理メニュー<br><span class="en">うなぎ料理専門店</span></h1>
    `;
  }
}

// === メニューカード描画 ===
function cardHTML(row) {
  const cat = getCategory(row);
  const sub = get(row, "Category");

  const jp = get(row, "Name (JP)");
  const en = get(row, "Name (EN)");
  const zh = get(row, "Name (ZH)");

  const djp = get(row, "Description (JP)");
  const den = get(row, "Description (EN)");
  const dzh = get(row, "Description (ZH)");

  const pr = get(row, "Price");
  const imgU = get(row, "Image URL");
  const take = get(row, "Takeout");

  // === 画像（Drive対応 + 遅延読み込み + エラー時の保険） ===
  const imgSrc = normalizeImageUrl(imgU);
  const img = imgSrc
    ? `<img src="${imgSrc}" loading="lazy" alt="${en || jp || ""}" onerror="this.style.display='none'">`
    : "";

  // === テイクアウトバッジ ===
  const takeBadge =
    take && /ok/i.test(take)
      ? `<span class="takeout-badge">${
          currentLang === "zh"
            ? "可外带"
            : currentLang === "en"
            ? "Takeout OK"
            : "テイクアウト可"
        }</span>`
      : "";

  // === タイトル・説明 ===
  const title = currentLang === "zh" ? zh : currentLang === "en" ? en : jp;
  const desc = currentLang === "zh" ? dzh : currentLang === "en" ? den : djp;

  // === 備考欄（日本語のみ） ===
  let noteHTML = "";
  if (currentLang === "jp") {
    const njp = get(row, "Note (JP)");
    if (njp) noteHTML = `<p class="note-sub">${njp}</p>`;
  }

  // === 価格整形（既存ロジックを維持） ===
  let prText = "";
  if (pr) {
    const translatePriceTerm = (text) => {
      if (currentLang === "en") {
        return text.replace(/グラス/g, "Glass").replace(/ボトル/g, "Bottle").replace(/ポット/g, "Pot");
      } else if (currentLang === "zh") {
        return text.replace(/グラス/g, "杯").replace(/ボトル/g, "瓶").replace(/ポット/g, "壶");
      }
      return text;
    };

    if (pr.includes("/")) {
      const parts = pr.split("/");
      prText = parts
        .map((p) => {
          let part = translatePriceTerm(p.trim());
          const formatted = part.replace(/(\d[\d,]*)/g, "￥$1");
          return `<div class="price">${formatted}</div>`;
        })
        .join("");
    } else {
      let part = translatePriceTerm(pr.trim());
      const formatted = part.replace(/(\d[\d,]*)(?!\s*ml)/g, "￥$1");
      prText = `<p class="price">${formatted}</p>`;
    }
  }

  // === カテゴリ翻訳 ===
  const catLabel = CATEGORY_TRANSLATION[currentLang]?.[cat] || cat;

  // === HTML出力 ===
  return `
    <div class="menu-item">
      <div class="menu-img">${img}</div>
      <div class="menu-text">
        ${
          cat
            ? `<div class="cat">${catLabel}${sub && sub !== cat ? " - " + sub : ""}</div>`
            : ""
        }
        <h2>${title}</h2>
        ${currentLang !== "jp" && jp ? `<div class="jp-sub">${jp}</div>` : ""}
        ${takeBadge}
        <p>${desc}</p>
        ${noteHTML}
        ${prText}
      </div>
    </div>
  `;
}

// === タブ描画（★onclick廃止：安全なイベント登録方式） ===
function renderTabs(categories) {
  const tabsEl = document.getElementById("tabs");

  const ordered = CATEGORY_ORDER.filter((c) => categories.includes(c)).concat(
    categories.filter((c) => !CATEGORY_ORDER.includes(c))
  );

  tabsEl.innerHTML = "";

  ordered.forEach((cat) => {
    const label = CATEGORY_TRANSLATION[currentLang]?.[cat] || cat;

    const div = document.createElement("div");
    div.className = "tab" + (cat === currentCategory ? " active" : "");
    div.textContent = label;

    div.addEventListener("click", () => showCategory(cat));
    tabsEl.appendChild(div);
  });
}

// === カテゴリ表示 ===
function showCategory(cat) {
  currentCategory = cat;

  const categories = [...new Set(allRows.map((r) => getCategory(r)))];
  renderTabs(categories);

  const filtered = allRows.filter((r) => getCategory(r) === cat);

  const noteHTML = `
    <div class="note">
      ${
        currentLang === "zh"
          ? "※ 价格含税，图片仅供参考。加大饭需加160日元。"
          : currentLang === "en"
          ? "※ Prices include tax. Photos are for illustration only. Large rice +¥160."
          : "※ 表示価格は税込みです。写真はイメージです。ご飯大盛りは160円です。"
      }
    </div>`;

  document.getElementById("menu").innerHTML = noteHTML + filtered.map(cardHTML).join("");
}

// === CSV読み込み ===
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (res) => {
    // ✅ 中国語メニューは「準備中」表示して終了
    if (currentLang === "zh") {
      document.getElementById("header").innerHTML = `
        <h1>一之屋 菜单<br><span class="en">鳗鱼料理专门店</span></h1>
      `;
      document.getElementById("menu").innerHTML = `
        <div class="note" style="text-align:center; padding:40px; font-size:1.1em;">
          <p>中文菜单正在制作中。</p>
          <p>Please check the Japanese or English menu.</p>
        </div>
      `;
      return;
    }

    // ✅ 通常メニュー処理
    renderHeader();

    allRows = (res.data || []).filter((r) => {
      const vis = get(r, "Visible").trim().toLowerCase();
      return !(vis && vis.match(/^(×|✗|x|no|0|false)$/i));
    });

    const categories = [...new Set(allRows.map((r) => getCategory(r)))].filter(Boolean);
    if (categories.length > 0) showCategory(categories[0]);
    else document.getElementById("menu").innerHTML = "<p>メニューがありません。</p>";
  },
  error: () => {
    document.getElementById("menu").innerHTML = "<p>メニューの読み込みに失敗しました。</p>";
  },
});
