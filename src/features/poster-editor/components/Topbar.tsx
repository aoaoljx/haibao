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
        <h1>效能平台功能发布海报模版</h1>
        <p>在线编辑文案，一键生成专属宣传海报</p>
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
