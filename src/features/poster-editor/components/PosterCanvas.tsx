import { RefObject, useEffect } from "react";
import type { PosterEditorState } from "../hooks/usePosterEditor";
import type { PosterImages } from "../rendering/posterRenderer";
import { renderPoster } from "../rendering/posterRenderer";

interface PosterCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: PosterEditorState;
  images: PosterImages | null;
}

export function PosterCanvas({ canvasRef, state, images }: PosterCanvasProps) {
  useEffect(() => {
    if (!canvasRef.current || !images) return;
    renderPoster(canvasRef.current, {
      mode: state.mode,
      copy: state.copy,
      visualKey: state.visualKey,
      graphicText: state.graphicText,
      images,
      aiGeneratedImage: state.aiGeneratedImage
    });
  }, [canvasRef, images, state.copy, state.graphicText, state.mode, state.visualKey, state.aiGeneratedImage]);

  return <canvas ref={canvasRef} id="poster" width={3840} height={1920} />;
}
