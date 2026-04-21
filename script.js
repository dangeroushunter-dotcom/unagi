const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7Rdo_eCMQF-HTxCjdZJDx6z8OQnYjc0WTVwuc_N6TNYpdwfFy5DLRmW35gbLZklPcuSGxmmGfafeT/pub?output=csv";

let allRows = [];
let currentCategory = "";

const lang = (() => {
  const p = new URLSearchParams(location.search).get("lang");
  return ["jp", "en", "zh"].includes(p) ? p : "jp";
})();

const t = (jp, en, zh) => (lang === "en" ? en : lang === "zh" ? zh : jp);

// 画像URLの整形
const normalizeImageUrl = (url) => {
  const u = String(url || "").trim();
  if (!u || u === "") return "";
  const m1 = u.match(/\/file\/d\/([^/]+)/);
  const m2 = u.match(/[?&]id=([^&]+)/);
  const id = (m1 && m1[1]) || (m2 && m2[1]);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : u;
};

// 金額フォーマット（以前のバージョンを継承）
const formatPrice = (pr) => {
  if (!pr) return "";
  let normalized = pr.replace(/ｸﾞﾗｽ/g, "グラス").replace(/ﾊｰﾌﾎﾞﾄﾙ/g, "ハーフボトル").replace(/ﾌﾙﾎﾞﾄﾙ/g, "フルボトル").replace(/ﾎﾞﾄﾙ/g, "ボトル");
  
  const formatSingle = (s) => {
    const match = s.trim().match(/(.*?)(\d[\d,]*)(.*)/);
    if (match) {
      return `${match[1] ? `<span class="price-label">${match[1]}</span>` : ""}<span class="price-value">￥${match[2]}</span>${match[3] ? `<span class="price-label">${match[3]}</span>` : ""}`;
    }
    return `<span class="price-label">${s}</span>`;
  };

  return `<div class="price-container">` + 
         normalized.split("/").map(p => `<div class="price-line">${formatSingle(p)}</div>`).join("") + 
         `</div>`;
};

// カード表示用HTML（画像崩れ防止版）
const cardHTML = (row) => {
  const get = (k) => String(row[k] || "").trim();
  const title = t(get("Name (JP)"), get("Name (EN)"), get("Name (ZH)"));
  const jpName = get("Name (JP)");
  const imgSrc = normalizeImageUrl(get("Image URL"));
  
  // 画像準備中用のブロック
  const placeholder = `<div class="no-img-placeholder"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>${t("画像準備中","Coming Soon","图片准备中")}</span></div>`;

  // 画像タグ（エラー時に placeholder を表示するように JS で制御）
  // 以前の parent.innerHTML 方式は危険なため、nextElementSibling 方式に変更
  const imgTag = imgSrc 
    ? `<img src="${imgSrc}" alt="${jpName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="no-img-placeholder" style="display:none;">${placeholder}</div>`
    : placeholder;

  return `
    <div class="menu-item">
      <div class="menu-img">${imgTag}</div>
      <div class="menu-text">
        <div class="cat">${t(get("Group"), get("Group"), get("Group"))}</div>
        <h2>${title}</h2>
        ${lang !== 'jp' ? `<div style="font-size:0.85em; color:#888; margin-bottom:5px;">${jpName}</div>` : ""}
        <p>${t(get("Description (JP)"), get("Description (EN)"), get("Description (ZH)"))}</p>
        ${formatPrice(get("Price"))}
      </div>
    </div>`;
};

// 以下、データの読み込みとカテゴリ表示ロジック（基本変わらず）
const showCategory = (cat) => {
  currentCategory = cat;
  const cats = [...new Set(allRows.map(r => r.Group || r.Category))].filter(Boolean);
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = cats.map(c => `<div class="tab ${c===cat?'active':''}">${c}</div>`).join("");
  document.querySelectorAll(".tab").forEach((el, i) => el.addEventListener("click", () => {
    showCategory(cats[i]);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }));
  document.getElementById("menu").innerHTML = allRows.filter(r => (r.Group || r.Category) === cat).map(cardHTML).join("");
};

Papa.parse(SHEET_CSV_URL, {
  download: true, header: true, skipEmptyLines: true,
  complete: (res) => {
    allRows = res.data.filter(r => r.Visible !== "×");
    const cats = [...new Set(allRows.map(r => r.Group || r.Category))].filter(Boolean);
    document.getElementById("header").innerHTML = `<h1>いちのや料理メニュー</h1>`;
    if (cats.length) showCategory(cats[0]);
  }
});
