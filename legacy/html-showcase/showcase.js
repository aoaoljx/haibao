const canvas = document.getElementById("poster");
const ctx = canvas.getContext("2d");
const images = {};
const pointBox = document.getElementById("featurePoints");
const statusText = document.getElementById("statusText");
const exportPreview = document.getElementById("exportPreview");
const exportImage = document.getElementById("exportImage");
const exportDownloadLink = document.getElementById("exportDownloadLink");
const graphicTextBox = document.getElementById("graphicTextEditor");

let mode = "feature";
let points = [];
let activeGraphicTextKey = "";
const visualSelections = {
  feature: "graphic1",
  ai: "graphic5"
};

const fields = ["titleBlue", "titleDark", "subtitle", "notice", "tag"];
for (const id of fields) document.getElementById(id).addEventListener("input", handleContentInput);
document.getElementById("visualHint").addEventListener("input", (event) => {
  visualSelections[mode] = event.target.value;
  activeGraphicTextKey = "";
  render();
});

document.getElementById("addPointBtn").addEventListener("click", () => {
  points.push("");
  syncPointEditor();
  render();
});

document.getElementById("featureTab").addEventListener("click", () => setMode("feature"));
document.getElementById("aiTab").addEventListener("click", () => setMode("ai"));
document.getElementById("downloadBtn").addEventListener("click", exportPng);
document.getElementById("closeExportPreview").addEventListener("click", () => {
  exportPreview.hidden = true;
});

function setStatus(message, kind = "") {
  statusText.textContent = message;
  statusText.className = `status ${kind}`;
}

function exportPng() {
  render();
  const filename = mode === "feature" ? "效能平台-功能发布海报.png" : "效能平台-AI功能发布海报.png";
  try {
    const url = canvas.toDataURL("image/png");
    showExportPreview(url, filename);
    triggerDownload(url, filename);
    setStatus("PNG 已生成。若未自动下载，请点击下方“下载 PNG”。", "ok");
  } catch (error) {
    setStatus("导出失败：浏览器限制了 file:// 页面导出。请使用 http://127.0.0.1:8766/showcase/index.html 打开后再导出。", "error");
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function showExportPreview(url, filename) {
  exportImage.src = url;
  exportDownloadLink.href = url;
  exportDownloadLink.download = filename;
  exportDownloadLink.hidden = false;
  exportPreview.hidden = false;
}

Promise.all([
  loadImage("assets/feature-background.png"),
  loadImage("assets/ai-background.png"),
  loadImage("assets/logo.png"),
  loadImage("assets/product-badge.png"),
  loadImage("assets/poster-graphic-1-clean-v3.png"),
  loadImage("assets/poster-graphic-2-clean-v3.png"),
  loadImage("assets/poster-graphic-3-clean-v3.png"),
  loadImage("assets/poster-graphic-4-clean-v3.png"),
  loadImage("assets/poster-graphic-5-clean-v3.png")
]).then(([featureBg, aiBg, logo, productBadge, graphic1, graphic2, graphic3, graphic4, graphic5]) => {
  Object.assign(images, { featureBg, aiBg, logo, productBadge, graphic1, graphic2, graphic3, graphic4, graphic5 });
  setMode("feature");
});

const GRAPHICS = {
  graphic1: { x: 2050, y: 505, w: 1650, h: 1329 },
  graphic2: { x: 2050, y: 505, w: 1640, h: 1329 },
  graphic3: { x: 1874, y: 636, w: 2344, h: 1538 },
  graphic4: { x: 2262, y: 384, w: 1818, h: 1396 },
  graphic5: { x: 2080, y: 416, w: 2077, h: 1338 }
};

const GRAPHIC_NAMES = {
  graphic1: "图形一",
  graphic2: "图形二",
  graphic3: "图形三",
  graphic4: "图形四",
  graphic5: "图形五"
};

const GRAPHIC_TEXT_FIELDS = {
  graphic1: [
    { id: "brand", label: "顶部标题", defaultValue: "iDevflow" },
    { id: "action", label: "按钮文字", defaultValue: "提交" }
  ],
  graphic2: [
    { id: "brand", label: "顶部标题", defaultValue: "iDevflow" },
    { id: "action", label: "按钮文字", defaultValue: "登录" }
  ],
  graphic3: [
    { id: "milestone", label: "左侧卡片", defaultValue: "路标版本" },
    { id: "delivery", label: "右侧卡片", defaultValue: "敏捷交付" },
    { id: "publish", label: "按钮文字", defaultValue: "点击发布" },
    { id: "status", label: "状态标签", defaultValue: "验证中" }
  ],
  graphic4: [
    { id: "ai", label: "AI 标识", defaultValue: "AI" },
    { id: "coder", label: "搜索框标题", defaultValue: "DF Coder" }
  ],
  graphic5: [
    { id: "title", label: "底部标签", defaultValue: "测试用例" }
  ]
};

const graphicTexts = {
  feature: createDefaultGraphicTextState(),
  ai: createDefaultGraphicTextState()
};

const graphicTextTouched = {
  feature: createTouchedGraphicTextState(),
  ai: createTouchedGraphicTextState()
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function handleContentInput() {
  activeGraphicTextKey = "";
  render();
}

function createDefaultGraphicTextState() {
  const state = {};
  for (const [key, fieldsForGraphic] of Object.entries(GRAPHIC_TEXT_FIELDS)) {
    state[key] = {};
    for (const field of fieldsForGraphic) {
      state[key][field.id] = field.defaultValue;
    }
  }
  return state;
}

function createTouchedGraphicTextState() {
  const state = {};
  for (const [key, fieldsForGraphic] of Object.entries(GRAPHIC_TEXT_FIELDS)) {
    state[key] = {};
    for (const field of fieldsForGraphic) {
      state[key][field.id] = false;
    }
  }
  return state;
}

function setMode(next) {
  mode = next;
  document.getElementById("featureTab").classList.toggle("active", mode === "feature");
  document.getElementById("aiTab").classList.toggle("active", mode === "ai");
  document.getElementById("tag").parentElement.style.display = mode === "ai" ? "block" : "none";
  document.getElementById("visualHint").value = visualSelections[mode];
  activeGraphicTextKey = "";
  if (mode === "feature") {
    titleBlue.value = "代码在线编辑";
    titleDark.value = "功能发布";
    subtitle.value = "";
    notice.value = "";
    tag.value = "";
    points = [
      "代码在线编辑：轻量代码变更，在线编辑高效完成",
      "代码评论：评审信息不杂乱，标签化管理一目了然",
      "代码审核：代码审核自动匹配，代码质量更可控"
    ];
  } else {
    titleBlue.value = "AI辅助";
    titleDark.value = "生成测试用例";
    subtitle.value = "邀您抢先体验";
    notice.value = "让您专注于业务创造，而非重复工作";
    tag.value = "beta版";
    points = [
      "测试用例生成：根据需求自动生成核心测试场景",
      "智能补全：覆盖边界条件，减少重复编写"
    ];
  }
  syncPointEditor();
  render();
}

function syncPointEditor() {
  pointBox.innerHTML = "";
  points.forEach((point, index) => {
    const row = document.createElement("div");
    row.className = "point-row";
    const label = document.createElement("label");
    label.textContent = `功能点 ${index + 1}`;
    const input = document.createElement("input");
    input.value = point;
    input.addEventListener("input", () => {
      points[index] = input.value;
      handleContentInput();
    });
    const remove = document.createElement("button");
    remove.className = "remove-point";
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      points.splice(index, 1);
      syncPointEditor();
      render();
    });
    label.appendChild(input);
    row.appendChild(label);
    row.appendChild(remove);
    pointBox.appendChild(row);
  });
}

function font(px, weight = 800, italic = true) {
  return `${italic ? "italic " : ""}${weight} ${px}px "PingFang SC", "Microsoft YaHei", Arial, sans-serif`;
}

function render() {
  if (!images.featureBg) return;
  const bg = mode === "feature" ? images.featureBg : images.aiBg;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, 0, 0, 3840, 1920);
  ctx.drawImage(images.logo, 154, 135, 1495, 200);
  ctx.drawImage(images.productBadge, 160, 470, 585, 198);
  if (mode === "feature") renderFeature();
  else renderAi();
  syncGraphicTextEditor();
}

function renderFeature() {
  const blue = val("titleBlue") || "功能主标题";
  const dark = val("titleDark");
  ctx.font = font(dark ? 174 : 184, 800, true);
  ctx.fillStyle = "#2180f7";
  ctx.fillText(blue, 160, 930);
  if (dark) {
    const tw = ctx.measureText(blue).width;
    ctx.fillStyle = "#0c1f75";
    ctx.fillText(dark, 160 + tw + 45, 930);
  }
  if (val("subtitle")) {
    ctx.font = font(130, 800, true);
    ctx.fillStyle = "#0c1f75";
    ctx.fillText(val("subtitle"), blue.includes("统一") ? 430 : 160, 1285);
  }
  drawFeaturePoints(mode === "feature" ? 1180 : 1290, mode === "feature" ? 430 : 280);
  if (val("notice")) drawNotice();
  drawVisual();
}

function renderAi() {
  const gradient = val("titleBlue") || "AI辅助";
  const dark = val("titleDark") || "生成测试用例";
  ctx.font = font(156, 800, true);
  const g = ctx.createLinearGradient(160, 760, 160 + ctx.measureText(gradient).width, 760);
  g.addColorStop(0, "#7026f4");
  g.addColorStop(0.48, "#258bf8");
  g.addColorStop(1, "#50c7da");
  ctx.fillStyle = g;
  ctx.fillText(gradient, 160, 930);
  const tw = ctx.measureText(gradient).width;
  ctx.fillStyle = "#031965";
  ctx.fillText(dark, 160 + tw + 28, 930);
  const titleWidth = 28 + tw + ctx.measureText(dark).width;
  drawTag(val("tag") || "beta版", 160, 760, titleWidth);
  ctx.font = font(112, 800, true);
  ctx.fillText(val("subtitle") || "邀您抢先体验", 160, 1198);
  drawFeaturePoints(1290, 250);
  ctx.font = font(76, 400, false);
  ctx.fillStyle = "#34527f";
  ctx.fillText(val("notice") || "让您专注于业务创造，而非重复工作", 160, 1660);
  drawVisual();
}

function drawFeaturePoints(startY, maxHeight) {
  const rows = points.map((p) => p.trim()).filter(Boolean);
  if (!rows.length) return;
  const count = rows.length;
  const textSize = Math.max(46, Math.min(70, Math.floor((maxHeight - Math.max(0, count - 1) * 28) / count * 0.58)));
  const lineGap = Math.max(96, Math.min(178, Math.floor(maxHeight / count)));
  let y = startY + textSize;
  for (const row of rows) {
    const [label, ...rest] = row.split(/[:：]/);
    const text = rest.join("：");
    ctx.fillStyle = "#3a5684";
    ctx.beginPath();
    ctx.arc(168, y - textSize * 0.38, Math.max(8, textSize * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#324e7b";
    ctx.font = font(textSize, 800, false);
    const prefix = text ? `${label}：` : row;
    ctx.fillText(prefix, 218, y);
    if (text) {
      const lw = ctx.measureText(prefix).width;
      ctx.font = font(textSize, 500, false);
      fitText(text, 218 + lw + 18, y, 1760 - lw, textSize);
    }
    y += lineGap;
  }
}

function fitText(text, x, y, maxWidth, px) {
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 3) {
    t = t.slice(0, -2);
  }
  ctx.fillText(t.length < text.length ? `${t}…` : t, x, y);
}

function drawNotice() {
  roundRect(168, 1660, 87, 88, 28, "#ffc600");
  ctx.fillStyle = "#fff";
  ctx.font = font(48, 800, false);
  ctx.fillText("♥", 205, 1724);
  ctx.fillStyle = "#34527f";
  ctx.font = font(72, 800, false);
  ctx.fillText(val("notice"), 320, 1725);
}

function drawTag(text, titleX, titleY, titleWidth) {
  ctx.font = font(52, 800, false);
  const tagWidth = Math.max(255, Math.ceil(ctx.measureText(text).width + 70));
  const tagHeight = 120;
  const titleRight = titleX + titleWidth;
  const pointerX = Math.min(3200, Math.max(titleX + 920, titleRight - 42));
  const x = Math.max(titleX + 900, pointerX - 54);
  const y = titleY - 170;
  const pointerTop = y + tagHeight - 4;
  ctx.save();
  ctx.shadowColor = "rgba(210, 117, 35, 0.42)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 26;
  const fill = ctx.createLinearGradient(x, y, x + tagWidth, y + tagHeight);
  fill.addColorStop(0, "#ffd33f");
  fill.addColorStop(0.46, "#ffb43d");
  fill.addColorStop(1, "#ff722c");
  roundRect(x, y, tagWidth, tagHeight, 10, fill);
  ctx.beginPath();
  ctx.moveTo(pointerX, pointerTop);
  ctx.lineTo(pointerX + 44, pointerTop);
  ctx.lineTo(pointerX + 18, pointerTop + 54);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + 30, y + 78);
  ctx.restore();
}

function roundRect(x, y, w, h, r, fill, stroke, line = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

function allText() {
  return [val("titleBlue"), val("titleDark"), val("subtitle"), val("notice"), ...points].join(" ").toLowerCase();
}

function titleText() {
  return `${val("titleBlue")}${val("titleDark")}`.trim();
}

function resolveVisualKey() {
  const explicit = visualSelections[mode] || val("visualHint");
  if (explicit && explicit !== "auto") {
    if (["graphic1", "graphic2", "graphic3", "graphic4", "graphic5"].includes(explicit)) return explicit;
    return explicit;
  }
  const t = allText();
  if (mode === "ai") {
    if (/搜索|检查|修复|coder|代码助手|编码/.test(t)) return "graphic4";
    if (/登录|单点|sso|认证|账号|权限/.test(t)) return "graphic2";
    if (/交付|验证|路标|版本/.test(t)) return "graphic3";
    return "graphic5";
  }
  if (/交付|验证|路标|版本|需求/.test(t)) return "graphic3";
  if (/搜索|检查|修复|coder|代码助手|编码/.test(t)) return "graphic4";
  if (/ai|智能|测试|用例|文档|分析|生成|助手|问答|总结/.test(t)) return "graphic5";
  if (/登录|单点|sso|认证|账号|权限/.test(t)) return "graphic2";
  return "graphic1";
}

function drawVisual() {
  const key = resolveVisualKey();
  const img = {
    graphic1: images.graphic1,
    graphic2: images.graphic2,
    graphic3: images.graphic3,
    graphic4: images.graphic4,
    graphic5: images.graphic5
  }[key] || images.graphic1;
  const box = GRAPHICS[key] || GRAPHICS.graphic1;
  ctx.drawImage(img, box.x, box.y, box.w, box.h);
  drawGraphicText(key, box);
}

function syncGraphicTextEditor() {
  const key = resolveVisualKey();
  if (activeGraphicTextKey === `${mode}:${key}`) return;
  activeGraphicTextKey = `${mode}:${key}`;
  graphicTextBox.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = `图形文字 - ${GRAPHIC_NAMES[key]}`;
  graphicTextBox.appendChild(title);
  for (const field of GRAPHIC_TEXT_FIELDS[key] || []) {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.value = graphicTexts[mode][key][field.id] || "";
    input.addEventListener("input", () => {
      graphicTexts[mode][key][field.id] = input.value;
      graphicTextTouched[mode][key][field.id] = true;
      render();
    });
    label.appendChild(input);
    graphicTextBox.appendChild(label);
  }
}

function syncAutoGraphicText() {
  const key = resolveVisualKey();
  const suggestions = suggestGraphicText(key);
  const currentTexts = graphicTexts[mode][key];
  const currentTouched = graphicTextTouched[mode][key];
  for (const [fieldId, text] of Object.entries(suggestions)) {
    if (!currentTouched[fieldId]) currentTexts[fieldId] = text;
  }
}

function suggestGraphicText(key) {
  const title = titleText();
  const blueTitle = val("titleBlue");
  const darkTitle = val("titleDark");
  const shortTitle = compactText(title || blueTitle || darkTitle, 8);
  const t = allText();
  if (key === "graphic1") {
    return { brand: "iDevflow", action: inferActionText(t, "提交") };
  }
  if (key === "graphic2") {
    return { brand: "iDevflow", action: inferActionText(t, "登录") };
  }
  if (key === "graphic3") {
    return {
      milestone: /需求/.test(t) ? "需求路标" : "路标版本",
      delivery: /发布|上线|版本/.test(t) ? "版本交付" : "敏捷交付",
      publish: /上线/.test(t) ? "点击上线" : "点击发布",
      status: /完成|成功/.test(t) ? "已验证" : "验证中"
    };
  }
  if (key === "graphic4") {
    return { ai: /ai/i.test(title) ? "AI" : compactText(blueTitle || "AI", 4), coder: compactText(darkTitle || shortTitle || "DF Coder", 10) };
  }
  if (key === "graphic5") {
    return { title: compactText(darkTitle || title || "测试用例", 8) };
  }
  return {};
}

function inferActionText(text, fallback) {
  if (/登录|单点|sso|认证|账号/.test(text)) return "登录";
  if (/发布|上线|部署/.test(text)) return "发布";
  if (/提交|评审|审核|合并/.test(text)) return "提交";
  if (/保存|编辑|修改/.test(text)) return "保存";
  return fallback;
}

function compactText(text, maxLength) {
  const clean = String(text || "").replace(/\s+/g, "");
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function gText(key, fieldId) {
  const field = (GRAPHIC_TEXT_FIELDS[key] || []).find((item) => item.id === fieldId);
  return graphicTexts[mode][key][fieldId] ?? field?.defaultValue ?? "";
}

function graphicDefault(key, fieldId) {
  const field = (GRAPHIC_TEXT_FIELDS[key] || []).find((item) => item.id === fieldId);
  return field?.defaultValue ?? "";
}

function shouldDrawGraphicField(key, fieldId) {
  return Boolean((GRAPHIC_TEXT_FIELDS[key] || []).some((item) => item.id === fieldId));
}

function hasGraphicTextOverride(key) {
  return Boolean(GRAPHIC_TEXT_FIELDS[key]?.length);
}

function drawGraphicText(key, box) {
  if (!hasGraphicTextOverride(key)) return;
  const scaleX = box.w / images[key].naturalWidth;
  const scaleY = box.h / images[key].naturalHeight;
  const tx = (x) => box.x + x * scaleX;
  const ty = (y) => box.y + y * scaleY;
  const tw = (w) => w * scaleX;
  const th = (h) => h * scaleY;
  ctx.save();
  if (key === "graphic1") {
    if (shouldDrawGraphicField(key, "brand")) {
      drawEmbossedWhiteText(gText(key, "brand"), tx(390), ty(242), 92 * scaleX, 555 * scaleX, true);
    }
    if (shouldDrawGraphicField(key, "action")) {
      drawEmbossedWhiteText(gText(key, "action"), tx(407), ty(826), 54 * scaleX, 190 * scaleX, false, "center");
    }
  } else if (key === "graphic2") {
    if (shouldDrawGraphicField(key, "brand")) {
      drawEmbossedWhiteText(gText(key, "brand"), tx(420), ty(246), 94 * scaleX, 570 * scaleX, true);
    }
    if (shouldDrawGraphicField(key, "action")) {
      drawEmbossedWhiteText(gText(key, "action"), tx(428), ty(832), 54 * scaleX, 195 * scaleX, false, "center");
    }
  } else if (key === "graphic3") {
    if (shouldDrawGraphicField(key, "milestone")) {
      drawStackedGraphicText(gText(key, "milestone"), tx(718), ty(477), 86 * scaleX, 250 * scaleX);
    }
    if (shouldDrawGraphicField(key, "delivery")) {
      drawStackedGraphicText(gText(key, "delivery"), tx(1265), ty(563), 82 * scaleX, 250 * scaleX, "#f6fbff", "#4b85fb");
    }
    if (shouldDrawGraphicField(key, "publish")) {
      drawPlainGraphicText(gText(key, "publish"), tx(1100), ty(861), 46 * scaleX, 225 * scaleX, "#ffffff", true, "center");
    }
    if (shouldDrawGraphicField(key, "status")) {
      drawPlainGraphicText(gText(key, "status"), tx(1554), ty(263), 48 * scaleX, 155 * scaleX, "#4d88f7", true, "center");
    }
  } else if (key === "graphic4") {
    if (shouldDrawGraphicField(key, "ai")) {
      drawPlainGraphicText(gText(key, "ai"), tx(477), ty(159), 62 * scaleX, 170 * scaleX, "#3c79c8", true, "center", true);
    }
    if (shouldDrawGraphicField(key, "coder")) {
      drawPlainGraphicText(gText(key, "coder"), tx(727), ty(164), 60 * scaleX, 405 * scaleX, "#3474c2", false, "left", true);
    }
  } else if (key === "graphic5") {
    if (shouldDrawGraphicField(key, "title")) {
      drawEmbossedWhiteText(gText(key, "title"), tx(328), ty(1058), 72 * scaleX, 420 * scaleX, false, "center");
    }
  }
  ctx.restore();
}

function patchGradientRect(x, y, w, h, radius, colors, shadowColor) {
  ctx.save();
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = Math.max(8, radius * 0.45);
    ctx.shadowOffsetY = Math.max(4, radius * 0.22);
  }
  const fill = ctx.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, colors[0]);
  fill.addColorStop(1, colors[1]);
  roundRect(x, y, w, h, radius, fill);
  ctx.restore();
}

function drawEmbossedWhiteText(text, x, baseline, size, maxWidth, italic, align = "left") {
  drawPlainGraphicText(text, x, baseline, size, maxWidth, "#ffffff", true, align, italic, {
    shadowColor: "rgba(0, 40, 120, 0.45)",
    shadowBlur: Math.max(5, size * 0.08),
    shadowOffsetY: Math.max(4, size * 0.08)
  });
}

function drawPlainGraphicText(text, x, baseline, size, maxWidth, color, bold = true, align = "left", italic = false, shadow = null) {
  ctx.save();
  ctx.font = font(size, bold ? 800 : 700, italic);
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow.shadowColor;
    ctx.shadowBlur = shadow.shadowBlur;
    ctx.shadowOffsetY = shadow.shadowOffsetY;
  }
  let value = compactToWidth(text, maxWidth);
  let drawX = x;
  if (align === "center") drawX = x + (maxWidth - ctx.measureText(value).width) / 2;
  ctx.fillText(value, drawX, baseline);
  ctx.restore();
}

function drawStackedGraphicText(text, x, centerY, size, maxWidth, color = "#ffffff", stroke = "rgba(48, 101, 220, 0.55)") {
  const raw = compactText(text, 8);
  const lines = raw.length > 4 ? [raw.slice(0, 4), raw.slice(4)] : splitInHalf(raw);
  ctx.save();
  ctx.font = font(size, 800, true);
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0, 70, 160, 0.22)";
  ctx.shadowBlur = Math.max(5, size * 0.08);
  ctx.shadowOffsetY = Math.max(3, size * 0.04);
  const gap = size * 1.08;
  const startY = centerY - ((lines.length - 1) * gap) / 2;
  lines.forEach((line, index) => {
    const value = compactToWidth(line, maxWidth);
    const drawX = x + (maxWidth - ctx.measureText(value).width) / 2;
    const y = startY + index * gap;
    ctx.strokeText(value, drawX, y);
    ctx.fillText(value, drawX, y);
  });
  ctx.restore();
}

function splitInHalf(text) {
  if (text.length <= 2) return [text];
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}

function compactToWidth(text, maxWidth) {
  let value = String(text || "");
  while (ctx.measureText(value).width > maxWidth && value.length > 1) {
    value = value.slice(0, -1);
  }
  return value;
}
