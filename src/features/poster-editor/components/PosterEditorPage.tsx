import { useCallback, useEffect, useRef, useState } from "react";
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

  // 上一次导出的 object URL，换新的时要主动释放，否则整张海报一直占着内存
  const exportUrlRef = useRef<string | null>(null);

  const replaceExportUrl = useCallback((url: string | null) => {
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    exportUrlRef.current = url;
  }, []);

  useEffect(() => () => replaceExportUrl(null), [replaceExportUrl]);

  const handleExport = useCallback(() => {
    if (!canvasRef.current || assets.status !== "ready") {
      editor.setStatus("素材加载中，请稍后再试。", "error");
      return;
    }

    const canvas = canvasRef.current;
    const filename =
      editor.state.mode === "feature"
        ? "效能平台-功能发布海报.png"
        : "效能平台-AI功能发布海报.png";

    try {
      renderPoster(canvas, {
        mode: editor.state.mode,
        copy: editor.state.copy,
        visualKey: editor.state.visualKey,
        graphicText: editor.state.graphicText,
        graphicSource: editor.state.graphicSource,
        images: assets.images,
        aiGeneratedImage: editor.state.aiGeneratedImage,
        uploadedImage: editor.state.uploadedImage
      });

      // 用 toBlob 而不是 toDataURL：
      // 3840x1920 的 PNG 转成 data URL 有十几 MB，Chrome 会拦掉这么大的
      // data: 下载（点了没反应），<img src> 也常常渲染不出来。
      // blob: 链接没有这个尺寸限制，预览和下载都稳。
      canvas.toBlob((blob) => {
        if (!blob) {
          editor.setStatus("导出失败：画布内容为空，请稍后重试。", "error");
          return;
        }

        const url = URL.createObjectURL(blob);
        replaceExportUrl(url);
        setExportState({ url, filename });
        triggerDownload(url, filename);
        editor.setStatus("PNG 已生成。若未自动下载，请点击下方【下载 PNG】。", "ok");
      }, "image/png");
    } catch {
      editor.setStatus("导出失败：请刷新页面后重试，或确认当前页面通过本地服务地址访问。", "error");
    }
  }, [assets, editor, replaceExportUrl]);

  const handleRenderError = useCallback(
    (error: Error) => {
      editor.setStatus(`画布绘制失败：${error.message}`, "error");
    },
    [editor]
  );

  const closeExportPreview = useCallback(() => {
    replaceExportUrl(null);
    setExportState(null);
  }, [replaceExportUrl]);

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
          onGraphicTextFieldChange={editor.updateGraphicTextField}
          onRemoveBackgroundChange={editor.updateRemoveBackground}
          onGenerateVisual={editor.generateVisual}
        />

        <section className="stage">
          <PosterCanvas
            canvasRef={canvasRef}
            state={editor.state}
            images={assets.status === "ready" ? assets.images : null}
            onRenderError={handleRenderError}
          />
          {exportState ? (
            <ExportPreview
              url={exportState.url}
              filename={exportState.filename}
              onClose={closeExportPreview}
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
