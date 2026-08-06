import { useCallback, useMemo, useState, useEffect } from "react";
import type { ImageProviderConfig, ImageProviderId } from "@providers";
import {
  clonePosterCopy,
  createDefaultGraphicTextState,
  posterPresets
} from "@/shared/poster/defaults";
import { getVisualByKey, visualMapping } from "@/shared/poster/visualMapping";
import type {
  PosterCopy,
  PosterMode,
  VisualKey,
  VisualTextValueMap
} from "@/shared/poster/types";
import { generateVisualImage } from "@/services/visual-generation";

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
  removeBackground: boolean;
  statusMessage: string;
  statusKind: "" | "ok" | "error";
  aiGeneratedImage: HTMLImageElement | null;
  aiGeneratedDataUrl: string | null;
  isGenerating: boolean;
}

const STORAGE_KEY = "idevflow-poster-provider-config";

/** 从 localStorage 加载保存的配置 */
function loadSavedProviderConfig(): ImageProviderConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 确保结构完整
      return {
        provider: parsed.provider || "gpt-image",
        apiKey: parsed.apiKey || "",
        baseUrl: parsed.baseUrl || "",
        model: parsed.model || "",
        workflowId: parsed.workflowId || "",
        apiVersion: parsed.apiVersion || "",
        timeoutMs: parsed.timeoutMs || 120000,
        extra: parsed.extra || {}
      };
    }
  } catch (error) {
    console.warn("加载保存的配置失败:", error);
  }
  return {
    provider: "gpt-image",
    apiKey: "",
    baseUrl: "",
    model: "",
    workflowId: "",
    apiVersion: "",
    timeoutMs: 120000,
    extra: {}
  };
}

/** 保存配置到 localStorage */
function saveProviderConfig(config: ImageProviderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("保存配置失败:", error);
  }
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
  
  // 从 localStorage 加载配置，而不是使用硬编码默认值
  const [providerConfig, setProviderConfig] = useState<ImageProviderConfig>(loadSavedProviderConfig);
  
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
  // 模型不产透明底时在客户端去背。默认开启；万一去背伤到主体，运营可以关掉重试。
  const [removeBackground, setRemoveBackground] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"" | "ok" | "error">("");
  const [aiGeneratedImageByMode, setAiGeneratedImageByMode] = useState<
    Record<PosterMode, HTMLImageElement | null>
  >({
    feature: null,
    ai: null
  });
  const [aiGeneratedDataUrlByMode, setAiGeneratedDataUrlByMode] = useState<
    Record<PosterMode, string | null>
  >({
    feature: null,
    ai: null
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // 每次配置变更时自动保存到 localStorage
  useEffect(() => {
    saveProviderConfig(providerConfig);
  }, [providerConfig]);

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
      removeBackground,
      statusMessage,
      statusKind,
      aiGeneratedImage: aiGeneratedImageByMode[mode],
      aiGeneratedDataUrl: aiGeneratedDataUrlByMode[mode],
      isGenerating
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
      removeBackground,
      statusKind,
      statusMessage,
      uploadedFileNameByMode,
      visualKey,
      aiGeneratedImageByMode,
      aiGeneratedDataUrlByMode,
      isGenerating
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

  // 切换模型时保留已有配置，只更新 provider 字段
  const updateProvider = useCallback((provider: ImageProviderId) => {
    setProviderConfig((current) => ({
      ...current,
      provider
      // 不再清空 model、workflowId、apiVersion，保留用户之前的配置
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

  const generateVisual = useCallback(async () => {
    if (isGenerating) return;

    // 校验 API Key
    if (!providerConfig.apiKey?.trim()) {
      setStatus("请先配置模型接口的 API Key。", "error");
      return;
    }

    setIsGenerating(true);
    setStatus("正在调用模型生成图形，请稍候…", "");

    try {
      const currentKeywords = keywordTouchedByMode[mode]
        ? keywordsByMode[mode]
        : deriveKeywords(copy);

      const result = await generateVisualImage({
        mode,
        titleBlue: copy.titleBlue,
        titleDark: copy.titleDark,
        featurePoints: copy.featurePoints,
        keywords: currentKeywords,
        graphicText: graphicOverlayTextByMode[mode],
        // 按图形最终要落进的槽位反推请求尺寸，避免生成方图后被拉伸
        targetBounds: getVisualByKey(visualKey).posterBounds,
        removeBackground,
        providerConfig
      });

      // 将 base64 转为 HTMLImageElement
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("生成的图片加载失败"));
        img.src = result.image.dataUrl;
      });

      setAiGeneratedImageByMode((current) => ({
        ...current,
        [mode]: img
      }));
      setAiGeneratedDataUrlByMode((current) => ({
        ...current,
        [mode]: result.image.dataUrl
      }));

      // 自动切换到 AI 生成来源
      setGraphicSourceByMode((current) => ({
        ...current,
        [mode]: "ai"
      }));

      const modelLabel = result.image.model || providerConfig.provider;
      setStatus(
        result.backgroundRemoved
          ? `图形生成成功，已自动去除背景（模型：${modelLabel}）`
          : `图形生成成功。该模型不产透明底，图形可能带背景色块，可在预览中确认（模型：${modelLabel}）`,
        "ok"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "图形生成失败，请重试。";
      setStatus(message, "error");
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    providerConfig,
    mode,
    keywordTouchedByMode,
    keywordsByMode,
    copy,
    graphicOverlayTextByMode,
    visualKey,
    removeBackground
  ]);

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
    updateRemoveBackground: setRemoveBackground,
    generateVisual,
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
