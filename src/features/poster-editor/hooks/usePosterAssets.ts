import { useEffect, useState } from "react";
import { posterAssetSources, type PosterAssetName } from "@/shared/poster/assets";
import type { PosterImages } from "../rendering/posterRenderer";

type PosterAssetState =
  | {
      status: "loading";
      images: null;
      error: null;
    }
  | {
      status: "ready";
      images: PosterImages;
      error: null;
    }
  | {
      status: "error";
      images: null;
      error: Error;
    };

export function usePosterAssets(): PosterAssetState {
  const [state, setState] = useState<PosterAssetState>({
    status: "loading",
    images: null,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      try {
        const entries = await Promise.all(
          Object.entries(posterAssetSources).map(async ([name, src]) => [
            name,
            await loadImage(src)
          ])
        );

        if (!cancelled) {
          setState({
            status: "ready",
            images: Object.fromEntries(entries) as PosterImages,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            images: null,
            error: error instanceof Error ? error : new Error("素材加载失败")
          });
        }
      }
    }

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法加载海报素材：${src}`));
    image.src = src;
  });
}

export type LoadedPosterAssetName = PosterAssetName;
