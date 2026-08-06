import { useCallback, useRef, useState } from "react";
import { EditorPanel } from "./EditorPanel";
import { ExportPreview } from "./ExportPreview";
import { PosterCanvas } from "./PosterCanvas";
import { Topbar } from "./Topbar";
import { usePosterAssets } from "../hooks/usePosterAssets";
import { usePosterEditor } from "../hooks/usePosterEditor";
import { renderPoster } from "../rendering/posterRenderer";

interface ExportState {
  url: string;
  filename: string;
}

export function PosterEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const assets = usePosterAssets();
  const editor = usePosterEditor();
  const [exportState, setExportState] = useState<ExportState | null>(null);

  const handleExport = useCallback(() => {
    if (!canvasRef.current || assets.status !== "ready") {
      editor.setStatus("素材加载中，请稍后再试。", "error");
      return;
    }

    const filename =
      editor.state.mode === "feature"
        ? "效能平台-功能发布海报.png"
        : "效能平台-AI功能发布海报.png";

    try {
      renderPoster(canvasRef.current, {
        mode: editor.state.mode,
        copy: editor.state.copy,
        visualKey: editor.state.visualKey,
        graphicText: editor.state.graphicText,
        images: assets.images,
        aiGeneratedImage: editor.state.aiGeneratedImage
      });
      const url = canvasRef.current.toDataURL("image/png");
      setExportState({ url, filename });
      triggerDownload(url, filename);
      editor.setStatus("PNG 已生成。若未自动下载，请点击下方【下载 PNG】。", "ok");
    } catch {
      editor.setStatus("导出失败：请刷新页面后重试，或确认当前页面通过本地服务地址访问。", "error");
    }
  }, [assets, editor]);

  const statusMessage =
    assets.status === "error" ? assets.error.message : editor.state.statusMessage;
  const statusKind = assets.status === "error" ? "error" : editor.state.statusKind;

  return (
    <main>
      <Topbar mode={editor.state.mode} onModeChange={editor.selectMode} onExport={handleExport} />
      <p id="statusText" className={`status ${statusKind}`} role="status">
        {statusMessage}
      </p>

      <section className="workspace">
        <EditorPanel
          state={editor.state}
          visualOptions={editor.visualOptions}
          onCopyFieldChange={editor.updateCopyField}
          onAddFeaturePoint={editor.addFeaturePoint}
          onUpdateFeaturePoint={editor.updateFeaturePoint}
          onRemoveFeaturePoint={editor.removeFeaturePoint}
          onGraphicSourceChange={editor.updateGraphicSource}
          onLibraryVisualChange={editor.selectLibraryVisual}
          onUploadedFileChange={editor.updateUploadedFile}
          onKeywordsChange={editor.updateKeywords}
          onProviderChange={editor.updateProvider}
          onProviderConfigFieldChange={editor.updateProviderConfigField}
          onGraphicOverlayTextChange={editor.updateGraphicOverlayText}
          onRemoveBackgroundChange={editor.updateRemoveBackground}
          onGenerateVisual={editor.generateVisual}
        />

        <section className="stage">
          <PosterCanvas
            canvasRef={canvasRef}
            state={editor.state}
            images={assets.status === "ready" ? assets.images : null}
          />
          {exportState ? (
            <ExportPreview
              url={exportState.url}
              filename={exportState.filename}
              onClose={() => setExportState(null)}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
