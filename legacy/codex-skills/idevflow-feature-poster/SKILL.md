---
name: idevflow-feature-poster
description: Generate iDevFlow/效能平台 normal feature release posters in the established 3840x1920 style. Use when creating, previewing, or modifying non-AI function release announcement posters with the INOVANCE + iDevFlow logo, fixed image product badge, large left title, editable function points, optional subtitle or warm notice, and a matching right-side 2.5D blue feature illustration selected from the feature text.
---

# iDevFlow Normal Feature Poster

Use this skill for normal, non-AI 效能平台功能发布海报. The authoritative style is the bundled showcase and assets, derived from the user's reference posters.

## Files

- `assets/background.png`: fixed normal feature background, 3840x1920.
- `assets/logo.png`: fixed top-left INOVANCE + iDevFlow logo.
- `assets/product-badge.png`: fixed `效能平台` badge image. Use this image, do not redraw the badge.
- `assets/poster-graphic-1.png` ... `assets/poster-graphic-5.png`: approved right-side transparent graphics supplied by the user. Paste them at the recorded poster coordinates without additional text overlay.
- `scripts/render_poster.py`: deterministic renderer for PNG output and quick previews.

## Workflow

1. Write a small JSON config with:
   - `title`: main title. Use one string for all-blue title, or split with `title_blue` and `title_dark`.
   - `subtitle`: optional large dark subtitle line.
   - `feature_points`: optional editable list. Each item can be a string like `代码审核：代码质量更可控` or `{ "label": "...", "text": "..." }`.
   - `notice`: optional bottom warm notice.
   - `visual_hint`: optional keyword override for the right-side illustration.
   - `graphic_texts`: optional right-side graphic text overrides. Use nested keys such as `{ "graphic1": { "brand": "iDevflow", "action": "提交" } }`.
2. Run:
   `python3 scripts/render_poster.py --config config.json --output poster.png`
3. Use `--preview` for a 1920x960 draft:
   `python3 scripts/render_poster.py --config config.json --output preview.png --preview`

## Style Rules

- Canvas is always 3840x1920, 2:1.
- Background and logo must come from the bundled assets.
- Product badge is fixed at left and must use `assets/product-badge.png`.
- Left typography:
  - Main title uses bold italic PingFang-style Chinese.
  - Normal primary title color is `#2180F7`; emphasis title color is `#0C1F75`.
  - Function point text uses `#34527F`; labels are bold.
  - Function points must auto-layout based on count: shrink text and line spacing before clipping.
- Right illustration must stay in the provided glossy 2.5D style:
  - Use bundled `poster-graphic-*.png` assets as the base visual.
  - Expose only these choices: `auto`, `graphic1`, `graphic2`, `graphic3`, `graphic4`, `graphic5`.
  - 图形一: code card from reference poster 25.
  - 图形二: login/key card from reference poster 26.
  - 图形三: delivery/verification board from reference poster 27.
  - 图形四: AI coder/search panel from reference poster 28.
  - 图形五: AI card from reference poster 29.
  - In `auto`, match by feature text: 交付/验证/版本/需求 -> 图形三, Coder/检查/修复/编码 -> 图形四, AI/测试/文档/分析 -> 图形五, 登录/单点/权限 -> 图形二, otherwise -> 图形一. Generic `功能发布` text must keep the default 图形一.
  - Only redraw the approved editable text fields on top of the selected graphic, preserving the original style:
    - 图形一: `brand`, `action`
    - 图形二: `brand`, `action`
    - 图形三: `milestone`, `delivery`, `publish`, `status`
    - 图形四: `ai`, `coder`
    - 图形五: `title`
  - Do not draw unrelated text, chips, labels, or generated elements on top of right-side graphics.
- Do not introduce unrelated color themes, photos, busy backgrounds, or decorative gradients outside the established style.

## Example Config

```json
{
  "title_blue": "代码在线编辑",
  "title_dark": "功能发布",
  "feature_points": [
    {"label": "代码在线编辑", "text": "轻量代码变更，在线编辑高效完成"},
    {"label": "代码评论", "text": "评审信息不杂乱，标签化管理一目了然"},
    {"label": "代码审核", "text": "代码审核自动匹配，代码质量更可控"}
  ],
  "visual_hint": "auto",
  "graphic_texts": {
    "graphic1": {
      "brand": "iDevflow",
      "action": "提交"
    }
  }
}
```
