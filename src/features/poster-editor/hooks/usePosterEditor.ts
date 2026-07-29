import { useCallback, useMemo, useState } from "react";
import type { ImageProviderConfig, ImageProviderId } from "@providers";
import {
  clonePosterCopy,
  createDefaultGraphicTextState,
  posterPresets
} from "@/shared/poster/defaults";
import { visualMapping } from "@/shared/poster/visualMapping";
import type {
  PosterCopy,
  PosterMode,
  VisualKey,
  VisualTextValueMap
} from "@/shared/poster/types";

export type GraphicSource = "ai" | "library" | "upload";

export interface GraphicOverlayText {
  topText: string;
  label: string;
  buttonText: string;
  badgeText: string;
}

type GraphicTextByMode = Record<PosterMode, Record<VisualKey, VisualTextValueMap>>;

export interface PosterEditorState {
  mode: PosterMode;
  copy: PosterCopy;
  visualKey: VisualKey;
  graphicText: Record<VisualKey, VisualTextValueMap>;
  graphicSource: GraphicSource;
  libraryVisualKey: VisualKey;
  uploadedFileName: string;
  keywords: string;
  providerConfig: ImageProviderConfig;
  graphicOverlayText: GraphicOverlayText;
  statusMessage: string;
  statusKind: "" | "ok" | "error";
}

export function usePosterEditor() {
  const [mode, setMode] = useState<PosterMode>("feature");
  const [copy, setCopy] = useState<PosterCopy>(() => clonePosterCopy(posterPresets.feature.copy));
  const [visualKey, setVisualKey] = useState<VisualKey>("graphic1");
  const [graphicTextByMode] = useState<GraphicTextByMode>(() => ({
    feature: createDefaultGraphicTextState(),
    ai: createDefaultGraphicTextState()
  }));
  const [graphicSourceByMode, setGraphicSourceByMode] = useState<Record<PosterMode, GraphicSource>>(
    {
      feature: "ai",
      ai: "ai"
    }
  );
  const [libraryVisualByMode, setLibraryVisualByMode] = useState<Record<PosterMode, VisualKey>>({
    feature: "graphic1",
    ai: "graphic5"
  });
  const [uploadedFileNameByMode, setUploadedFileNameByMode] = useState<Record<PosterMode, string>>({
    feature: "",
    ai: ""
  });
  const [keywordsByMode, setKeywordsByMode] = useState<Record<PosterMode, string>>({
    feature: deriveKeywords(posterPresets.feature.copy),
    ai: deriveKeywords(posterPresets.ai.copy)
  });
  const [providerConfig, setProviderConfig] = useState<ImageProviderConfig>({
    provider: "gpt-image",
    apiKey: "",
    baseUrl: "",
    model: "",
    workflowId: "",
    apiVersion: "",
    timeoutMs: 120000,
    extra: {}
  });
  const [keywordTouchedByMode, setKeywordTouchedByMode] = useState<Record<PosterMode, boolean>>({
    feature: false,
    ai: false
  });
  const [graphicOverlayTextByMode, setGraphicOverlayTextByMode] = useState<
    Record<PosterMode, GraphicOverlayText>
  >({
    feature: {
      topText: "iDevflow",
      label: "",
      buttonText: "提交",
      badgeText: ""
    },
    ai: {
      topText: "AI",
      label: "测试用例",
      buttonText: "生成",
      badgeText: "beta版"
    }
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"" | "ok" | "error">("");

  const state: PosterEditorState = useMemo(
    () => ({
      mode,
      copy,
      visualKey,
      graphicText: graphicTextByMode[mode],
      graphicSource: graphicSourceByMode[mode],
      libraryVisualKey: libraryVisualByMode[mode],
      uploadedFileName: uploadedFileNameByMode[mode],
      keywords: keywordTouchedByMode[mode] ? keywordsByMode[mode] : deriveKeywords(copy),
      providerConfig,
      graphicOverlayText: graphicOverlayTextByMode[mode],
      statusMessage,
      statusKind
    }),
    [
      copy,
      graphicOverlayTextByMode,
      graphicSourceByMode,
      graphicTextByMode,
      keywordTouchedByMode,
      keywordsByMode,
      libraryVisualByMode,
      mode,
      providerConfig,
      statusKind,
      statusMessage,
      uploadedFileNameByMode,
      visualKey
    ]
  );

  const selectMode = useCallback((nextMode: PosterMode) => {
    const presetCopy = clonePosterCopy(posterPresets[nextMode].copy);
    const presetVisual = posterPresets[nextMode].selection === "auto"
      ? visualMapping.fallback[nextMode]
      : posterPresets[nextMode].selection;

    setMode(nextMode);
    setCopy(presetCopy);
    setVisualKey(presetVisual);
    setGraphicSourceByMode((current) => ({
      ...current,
      [nextMode]: "ai"
    }));
    setLibraryVisualByMode((current) => ({
      ...current,
      [nextMode]: presetVisual
    }));
    setKeywordsByMode((current) => ({
      ...current,
      [nextMode]: deriveKeywords(presetCopy)
    }));
    setKeywordTouchedByMode((current) => ({
      ...current,
      [nextMode]: false
    }));
    setStatusMessage("");
    setStatusKind("");
  }, []);

  const updateCopyField = useCallback(<Key extends keyof PosterCopy>(
    field: Key,
    value: PosterCopy[Key]
  ) => {
    setCopy((current) => ({
      ...current,
      [field]: value
    }));
    setStatusMessage("");
    setStatusKind("");
  }, []);

  const addFeaturePoint = useCallback(() => {
    setCopy((current) => ({
      ...current,
      featurePoints: [...current.featurePoints, ""]
    }));
  }, []);

  const updateFeaturePoint = useCallback((index: number, value: string) => {
    setCopy((current) => ({
      ...current,
      featurePoints: current.featurePoints.map((point, pointIndex) =>
        pointIndex === index ? value : point
      )
    }));
  }, []);

  const removeFeaturePoint = useCallback((index: number) => {
    setCopy((current) => ({
      ...current,
      featurePoints: current.featurePoints.filter((_, pointIndex) => pointIndex !== index)
    }));
  }, []);

  const updateGraphicSource = useCallback(
    (source: GraphicSource) => {
      setGraphicSourceByMode((current) => ({
        ...current,
        [mode]: source
      }));
      setStatusMessage("");
      setStatusKind("");
    },
    [mode]
  );

  const selectLibraryVisual = useCallback(
    (key: VisualKey) => {
      setLibraryVisualByMode((current) => ({
        ...current,
        [mode]: key
      }));
      setVisualKey(key);
    },
    [mode]
  );

  const updateUploadedFile = useCallback(
    (file: File | null) => {
      setUploadedFileNameByMode((current) => ({
        ...current,
        [mode]: file?.name || ""
      }));
    },
    [mode]
  );

  const updateKeywords = useCallback(
    (value: string) => {
      setKeywordsByMode((current) => ({
        ...current,
        [mode]: value
      }));
      setKeywordTouchedByMode((current) => ({
        ...current,
        [mode]: true
      }));
    },
    [mode]
  );

  const updateProvider = useCallback((provider: ImageProviderId) => {
    setProviderConfig((current) => ({
      ...current,
      provider,
      model: "",
      workflowId: "",
      apiVersion: ""
    }));
    setStatusMessage("");
    setStatusKind("");
  }, []);

  const updateProviderConfigField = useCallback(
    (field: keyof ImageProviderConfig | `extra.${string}`, value: string) => {
      setProviderConfig((current) => {
        if (field.startsWith("extra.")) {
          return {
            ...current,
            extra: {
              ...current.extra,
              [field.slice("extra.".length)]: value
            }
          };
        }

        if (field === "timeoutMs") {
          return {
            ...current,
            timeoutMs: value ? Number(value) : undefined
          };
        }

        return {
          ...current,
          [field]: value
        };
      });
      setStatusMessage("");
      setStatusKind("");
    },
    []
  );

  const updateGraphicOverlayText = useCallback(
    (field: keyof GraphicOverlayText, value: string) => {
      setGraphicOverlayTextByMode((current) => ({
        ...current,
        [mode]: {
          ...current[mode],
          [field]: value
        }
      }));
    },
    [mode]
  );

  const setStatus = useCallback((message: string, kind: "" | "ok" | "error" = "") => {
    setStatusMessage(message);
    setStatusKind(kind);
  }, []);

  return {
    state,
    visualOptions: visualMapping.visuals,
    selectMode,
    updateCopyField,
    addFeaturePoint,
    updateFeaturePoint,
    removeFeaturePoint,
    updateGraphicSource,
    selectLibraryVisual,
    updateUploadedFile,
    updateKeywords,
    updateProvider,
    updateProviderConfigField,
    updateGraphicOverlayText,
    setStatus
  };
}

function deriveKeywords(copy: PosterCopy) {
  const fragments = [
    copy.titleBlue,
    copy.titleDark,
    copy.subtitle,
    ...copy.featurePoints.map((point) => point.split(/[:：]/)[0])
  ];
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const fragment of fragments) {
    const value = String(fragment || "")
      .replace(/[，,。.;；:：/|｜、]+/g, " ")
      .trim();
    if (!value) continue;

    for (const item of value.split(/\s+/)) {
      const normalized = item.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      keywords.push(normalized);
      if (keywords.length >= 8) return keywords.join("、");
    }
  }

  return keywords.join("、");
}
