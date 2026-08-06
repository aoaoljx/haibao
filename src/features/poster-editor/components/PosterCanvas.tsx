import { RefObject, useEffect } from "react";
import type { PosterEditorState } from "../hooks/usePosterEditor";
import type { PosterImages } from "../rendering/posterRenderer";
import { renderPoster } from "../rendering/posterRenderer";

interface PosterCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: PosterEditorState;
  images: PosterImages | null;
  /** 绘制失败时回报，让界面能给出提示而不是停在一张不更新的画布上 */
  onRenderError?: (error: Error) => void;
}

export function PosterCanvas({ canvasRef, state, images, onRenderError }: PosterCanvasProps) {
  useEffect(() => {
    if (!canvasRef.current || !images) return;

    try {
      renderPoster(canvasRef.current, {
        mode: state.mode,
        copy: state.copy,
        visualKey: state.visualKey,
        graphicText: state.graphicText,
        graphicSource: state.graphicSource,
        images,
        aiGeneratedImage: state.aiGeneratedImage,
        uploadedImage: state.uploadedImage
      });
    } catch (error) {
      // 此前这里的异常会被 React 吞掉，表现为「画布不更新且毫无提示」，
      // 排查起来很费劲。抛给上层显示出来。
      onRenderError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [
    canvasRef,
    images,
    state.copy,
    state.graphicText,
    state.graphicSource,
    state.mode,
    state.visualKey,
    state.aiGeneratedImage,
    state.uploadedImage,
    onRenderError
  ]);

  return <canvas ref={canvasRef} id="poster" width={3840} height={1920} />;
}
