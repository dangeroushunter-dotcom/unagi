
// スプレッドシートをCSVとして公開
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

let allRows = [];
let currentCategory = "";

const lang = (() => {
  const p = new URLSearchParams(location.search).get("lang");
  return ["jp", "en", "zh"].includes(p) ? p : "jp";
})();

// ===== utils =====
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const get = (row, wanted) => {
  const key = Object.keys(row).find((k) => norm(k) === norm(wanted));
  return key ? String(row[key]).trim() : "";
};
const catOf = (row) => get(row, "Group") || get(row, "Category");

const t = (jp, en, zh) => (lang === "en" ? en : lang === "zh" ? zh : jp);

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

// ===== dict =====
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
    "ソフトドリンク": "Soft Drinks",
    "デザート": "Dessert",
    "その他": "Others",
  },
  zh: {
    "季節のお料理": "季节菜肴",
    "うなぎ料理": "鳗鱼料理",
    "コース料理": "套餐",
    "お料理": "单点菜肴",
    "サラダ": "沙拉",
    "ビール": "啤酒",
    "日本酒": "日本酒 / 清酒",
    "焼酎": "烧酒",
    "ウイスキー": "威士忌",
    "サワー類": "酸酒",
    "ジャパニーズジン": "日本琴酒",
    "ソフトドリンク": "软饮料",
    "デザート": "甜点",
    "その他": "其他",
  },
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
  "ソフトドリンク",
  "デザート",
];

// ===== render =====
const renderHeader = () => {
  const h = document.getElementById("header");
  h.innerHTML = t(
    `<h1>いちのや料理メニュー<br><span class="en">うなぎ料理専門店</span></h1>`,
    `<h1>Ichinoya Menu<br><span class="en">Unagi Restaurant Menu</span></h1>`,
    `<h1>一之屋 菜单<br><span class="en">鳗鱼料理专门店</span></h1>`
  );
};

const translateCat = (cat) => CATEGORY_TRANSLATION[lang]?.[cat] || cat;

const formatPrice = (pr) => {
  if (!pr) return "";
  const tr = (s) =>
    lang === "en"
      ? s.replace(/グラス/g, "Glass").replace(/ボトル/g, "Bottle").replace(/ポット/g, "Pot")
      : lang === "zh"
      ? s.replace(/グラス/g, "杯").replace(/ボトル/g, "瓶").replace(/ポット/g, "壶")
      : s;

  const toYen = (s) => s.replace(/(\d[\d,]*)(?!\s*ml)/g, "￥$1");

  if (pr.includes("/"))
    return pr
      .split("/")
      .map((p) => `<div class="price">${toYen(tr(p.trim()))}</div>`)
      .join("");

  return `<p class="price">${toYen(tr(pr.trim()))}</p>`;
};

const cardHTML = (row) => {
  const cat = catOf(row);
  const sub = get(row, "Category");

  const title = t(get(row, "Name (JP)"), get(row, "Name (EN)"), get(row, "Name (ZH)"));
  const jpName = get(row, "Name (JP)");
  const desc = t(get(row, "Description (JP)"), get(row, "Description (EN)"), get(row, "Description (ZH)"));

  const imgSrc = normalizeImageUrl(get(row, "Image URL"));
  const img = imgSrc
    ? `<div class="menu-img"><img src="${imgSrc}" loading="lazy" alt="${get(row, "Name (EN)") || jpName}" onerror="this.parentElement.style.display='none'"></div>`
    : "";

  const take = get(row, "Takeout");
  const takeBadge =
    take && /ok/i.test(take)
      ? `<span class="takeout-badge">${t("テイクアウト可", "Takeout OK", "可外带")}</span>`
      : "";

  const noteJP = lang === "jp" ? get(row, "Note (JP)") : "";
  const noteHTML = noteJP ? `<p class="note-sub">${noteJP}</p>` : "";

  // 説明文がない場合はマージンを詰める
  const descHTML = desc ? `<p>${desc}</p>` : "";

  return `
    <div class="menu-item">
      ${img}
      <div class="menu-text">
        ${
          cat
            ? `<div class="cat">${translateCat(cat)}${sub && sub !== cat ? " - " + translateCat(sub) : ""}</div>`
            : ""
        }
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
      window.scrollTo({ top: 0, behavior: 'smooth' }); // タブ切り替え時に上部へスクロール
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
      "※ Prices include tax. Photos are for illustration only.<br>Large rice +¥160.",
      "※ 价格含税，图片仅供参考。<br>加大饭需加160日元。"
    )}</div>`;

  document.getElementById("menu").innerHTML = note + allRows.filter((r) => catOf(r) === cat).map(cardHTML).join("");
};

// ===== load CSV =====
Papa.parse(SHEET_CSV_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (res) => {
    // 完全に中国語メニューを準備中にしたい場合は、ここのコメントアウトを外してください。
    /*
    if (lang === "zh") {
      document.getElementById("header").innerHTML = `<h1>一之屋 菜单<br><span class="en">鳗鱼料理专门店</span></h1>`;
      document.getElementById("menu").innerHTML = `
        <div class="note" style="text-align:center; padding:60px 20px; font-size:1.1em; color:#3e2b22;">
          <p>中文菜单正在制作中。</p>
          <p>Please check the Japanese or English menu.</p>
          <div style="margin-top:30px;">
            <a href="index.html" style="color:#8a3b32; text-decoration:none; border:1px solid #8a3b32; padding:8px 16px; border-radius:4px;">戻る / Back</a>
          </div>
        </div>`;
      return;
    }
    */

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
