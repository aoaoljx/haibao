---
name: idevflow-ai-feature-poster
description: Generate iDevFlow/效能平台 AI-related feature release posters in the established 3840x1920 style. Use when creating, previewing, or modifying AI assistant, AI generation, intelligent analysis, or beta invitation posters with the INOVANCE + iDevFlow logo, fixed image product badge, AI gradient title, invitation subtitle, editable function points, bottom value line, beta tag, and a matching right-side 2.5D AI illustration selected from the feature text.
---

# iDevFlow AI Feature Poster

Use this skill for AI-related 效能平台功能发布海报. The authoritative style is the bundled showcase and assets, derived from the user's AI reference poster.

## Files

- `assets/background.png`: fixed AI feature background, 3840x1920.
- `assets/logo.png`: fixed top-left INOVANCE + iDevFlow logo.
- `assets/product-badge.png`: fixed `效能平台` badge image. Use this image, do not redraw the badge.
- `assets/poster-graphic-1.png` ... `assets/poster-graphic-5.png`: approved right-side transparent graphics supplied by the user. Paste them at the recorded poster coordinates without additional text overlay.
- `scripts/render_poster.py`: deterministic renderer for PNG output and quick previews.

## Workflow

1. Write a JSON config with:
   - `title_gradient`: normally an AI phrase, for example `AI辅助`.
   - `title_dark`: main feature name, for example `生成测试用例`.
   - `subtitle`: invitation line, for example `邀您抢先体验`.
   - `tag`: optional orange tag, default `beta版`.
   - `feature_points`: editable list of AI功能点. Each item can be a string like `测试用例生成：根据需求自动生成核心测试场景` or `{ "label": "...", "text": "..." }`.
   - `footer`: bottom value line.
   - `visual_hint`: optional keyword override for right-side AI illustration.
   - `graphic_texts`: optional right-side graphic text overrides. Use nested keys such as `{ "graphic5": { "title": "测试用例" } }`.
2. Run:
   `python3 scripts/render_poster.py --config config.json --output poster.png`
3. Use `--preview` for a 1920x960 draft:
   `python3 scripts/render_poster.py --config config.json --output preview.png --preview`

## Style Rules

- Canvas is always 3840x1920, 2:1.
- Background and logo must come from bundled assets.
- Product badge is fixed at left and must use `assets/product-badge.png`.
- Title pattern:
  - `title_gradient` uses purple-blue-cyan gradient.
  - `title_dark` uses deep navy `#001965`.
  - The orange `tag` uses a yellow-orange gradient, soft shadow, rounded rectangle, and downward triangle pointer. It sits above the right end of the main title, aligned to the final title character.
  - Subtitle is large deep navy.
  - Function points are supported and must auto-layout based on count.
  - Footer uses muted blue-gray `#34527F`.
- Right illustration must stay in the provided glossy 2.5D AI style:
  - Expose only these choices: `auto`, `graphic1`, `graphic2`, `graphic3`, `graphic4`, `graphic5`.
  - 图形一: code card from reference poster 25.
  - 图形二: login/key card from reference poster 26.
  - 图形三: delivery/verification board from reference poster 27.
  - 图形四: AI coder/search panel from reference poster 28.
  - 图形五: AI card from reference poster 29.
  - In `auto`, AI posters default to 图形五 unless release/login/coder keywords clearly match other graphics.
  - Only redraw the approved editable text fields on top of the selected graphic, preserving the original style:
    - 图形一: `brand`, `action`
    - 图形二: `brand`, `action`
    - 图形三: `milestone`, `delivery`, `publish`, `status`
    - 图形四: `ai`, `coder`
    - 图形五: `title`
  - Do not draw unrelated text, chips, labels, or generated elements on top of right-side graphics.
- Do not replace the AI visual with photos or flat vector icons.

## Example Config

```json
{
  "title_gradient": "AI辅助",
  "title_dark": "生成测试用例",
  "subtitle": "邀您抢先体验",
  "tag": "beta版",
  "feature_points": [
    "测试用例生成：根据需求自动生成核心测试场景",
    "智能补全：覆盖边界条件，减少重复编写"
  ],
  "footer": "让您专注于业务创造，而非重复工作",
  "visual_hint": "auto",
  "graphic_texts": {
    "graphic5": {
      "title": "测试用例"
    }
  }
}
```
