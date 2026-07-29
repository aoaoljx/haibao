import type { PosterMode } from "@/shared/poster/types";

interface TopbarProps {
  mode: PosterMode;
  onModeChange: (mode: PosterMode) => void;
  onExport: () => void;
}

export function Topbar({ mode, onModeChange, onExport }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <h1>AI品牌主视觉生成平台</h1>
        <p>运营文案保持手动编辑，AI 仅负责右侧 2.5D 品牌主视觉</p>
      </div>
      <div className="actions">
        <button
          id="featureTab"
          className={mode === "feature" ? "active" : ""}
          type="button"
          onClick={() => onModeChange("feature")}
        >
          正常功能发布
        </button>
        <button
          id="aiTab"
          className={mode === "ai" ? "active" : ""}
          type="button"
          onClick={() => onModeChange("ai")}
        >
          AI 功能发布
        </button>
        <button id="downloadBtn" type="button" onClick={onExport}>
          导出 PNG
        </button>
      </div>
    </header>
  );
}
