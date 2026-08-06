import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  configuredProviders,
  defaultProvider,
  isImageProviderId,
  providerExtras,
  providerModel,
  type ImageProviderConfig,
  type ImageProviderId
} from "@providers";
import {
  clonePosterCopy,
  createDefaultGraphicTextState,
  posterPresets
} from "@/shared/poster/defaults";
import { toPromptTextSlots } from "@/shared/poster/graphicText";
import { getVisualByKey, visualMapping } from "@/shared/poster/visualMapping";
import type {
  GraphicSource,
  PosterCopy,
  PosterMode,
  VisualKey,
  VisualTextValueMap
} from "@/shared/poster/types";
import { generateVisualImage, type VisualGenerationTrace } from "@/services/visual-generation";

type GraphicTextByMode = Record<PosterMode, Record<VisualKey, VisualTextValueMap>>;

export interface PosterEditorState {
  mode: PosterMode;
  copy: PosterCopy;
  visualKey: VisualKey;
  graphicText: Record<VisualKey, VisualTextValueMap>;
  graphicSource: GraphicSource;
  libraryVisualKey: VisualKey;
  uploadedFileName: string;
  uploadedImage: HTMLImageElement | null;
  keywords: string;
  providerConfig: ImageProviderConfig;
  removeBackground: boolean;
  generationTrace: VisualGenerationTrace | null;
  statusMessage: string;
  statusKind: "" | "ok" | "error";
  aiGeneratedImage: HTMLImageElement | null;
  aiGeneratedDataUrl: string | null;
  isGenerating: boolean;
}

/** 记住上次选的模型。只是个偏好，不含任何凭据。 */
const SELECTED_PROVIDER_KEY = "idevflow-poster-selected-provider";

/**
 * 组装当前的 Provider 配置。
 *
 * 密钥不在这里——它由 vite 服务端从 .env 读取并在转发时注入请求头。
 * 这里只有「用哪个模型」和一些非机密调节项。
 */
function buildProviderConfig(provider: ImageProviderId): ImageProviderConfig {
  return {
    provider,
    model: providerModel(provider),
    extra: providerExtras(provider)
  };
}

/** 读取上次选择；已失效（比如 .env 里删了对应的 Key）时回落到默认 */
function loadSelectedProvider(): ImageProviderId {
  try {
    const saved = localStorage.getItem(SELECTED_PROVIDER_KEY);
    if (saved && isImageProviderId(saved) && configuredProviders().includes(saved)) {
      return saved;
    }
  } catch {
    // localStorage 不可用时按默认走，不打断使用
  }
  return defaultProvider();
}

export function usePosterEditor() {
  const [mode, setMode] = useState<PosterMode>("feature");
  const [copy, setCopy] = useState<PosterCopy>(() => clonePosterCopy(posterPresets.feature.copy));
  const [visualKey, setVisualKey] = useState<VisualKey>("graphic1");
  const [graphicTextByMode, setGraphicTextByMode] = useState<GraphicTextByMode>(() => ({
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
  const [uploadedImageByMode, setUploadedImageByMode] = useState<
    Record<PosterMode, HTMLImageElement | null>
  >({
    feature: null,
    ai: null
  });
  const [keywordsByMode, setKeywordsByMode] = useState<Record<PosterMode, string>>({
    feature: deriveKeywords(posterPresets.feature.copy),
    ai: deriveKeywords(posterPresets.ai.copy)
  });

  // 只记「用哪个模型」，密钥在服务端
  const [selectedProvider, setSelectedProvider] = useState<ImageProviderId>(loadSelectedProvider);
  const providerConfig = useMemo(() => buildProviderConfig(selectedProvider), [selectedProvider]);

  const [keywordTouchedByMode, setKeywordTouchedByMode] = useState<Record<PosterMode, boolean>>({
    feature: false,
    ai: false
  });
  // 模型不产透明底时在客户端去背。默认开启；万一去背伤到主体，运营可以关掉重试。
  const [removeBackground, setRemoveBackground] = useState(true);
  // Prompt Engine 命中的场景与类目。规则引擎本来就算好了，摊开给运营看，
  // 出图不对时能判断是关键词没写对还是模型不给力。
  const [generationTrace, setGenerationTrace] = useState<VisualGenerationTrace | null>(null);
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

  // 记住模型选择，方便下次打开。存的只是个 Provider ID，不含凭据。
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_PROVIDER_KEY, selectedProvider);
    } catch {
      // 隐私模式等场景下写不进去，不影响使用
    }
  }, [selectedProvider]);

  // 卸载时释放上传图片占用的 object URL。
  // 用 ref 读最新值 + 空依赖，避免把仍在使用的图提前 revoke 掉。
  const uploadedImagesRef = useRef(uploadedImageByMode);
  uploadedImagesRef.current = uploadedImageByMode;
  useEffect(() => {
    return () => {
      for (const image of Object.values(uploadedImagesRef.current)) {
        revokeObjectUrl(image);
      }
    };
  }, []);

  const state: PosterEditorState = useMemo(
    () => ({
      mode,
      copy,
      visualKey,
      graphicText: graphicTextByMode[mode],
      graphicSource: graphicSourceByMode[mode],
      libraryVisualKey: libraryVisualByMode[mode],
      uploadedFileName: uploadedFileNameByMode[mode],
      uploadedImage: uploadedImageByMode[mode],
      keywords: keywordTouchedByMode[mode] ? keywordsByMode[mode] : deriveKeywords(copy),
      providerConfig,
      removeBackground,
      generationTrace,
      statusMessage,
      statusKind,
      aiGeneratedImage: aiGeneratedImageByMode[mode],
      aiGeneratedDataUrl: aiGeneratedDataUrlByMode[mode],
      isGenerating
    }),
    [
      copy,
      graphicSourceByMode,
      graphicTextByMode,
      keywordTouchedByMode,
      keywordsByMode,
      libraryVisualByMode,
      mode,
      providerConfig,
      removeBackground,
      generationTrace,
      statusKind,
      statusMessage,
      uploadedFileNameByMode,
      uploadedImageByMode,
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
    async (file: File | null) => {
      setUploadedFileNameByMode((current) => ({
        ...current,
        [mode]: file?.name || ""
      }));

      if (!file) {
        setUploadedImageByMode((current) => {
          revokeObjectUrl(current[mode]);
          return { ...current, [mode]: null };
        });
        return;
      }

      try {
        const image = await loadImageFromFile(file);
        setUploadedImageByMode((current) => {
          // 换图时释放上一张的 object URL，避免长时间使用累积内存
          revokeObjectUrl(current[mode]);
          return { ...current, [mode]: image };
        });
        setStatus("");
      } catch {
        setStatus("图片读取失败，请换一张试试。", "error");
      }
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
    setSelectedProvider(provider);
    setStatusMessage("");
    setStatusKind("");
  }, []);

  /**
   * 修改当前图形的某个文字槽位。
   *
   * 这里是图形文字的唯一真相源：画布和 Prompt 都读它。
   * 此前存在两份互不相通的 state——面板改的那份只喂 Prompt，
   * 画布读的那份没有 setter 永远是默认值，于是"改了看不到变化"。
   */
  const updateGraphicTextField = useCallback(
    (fieldId: string, value: string) => {
      setGraphicTextByMode((current) => ({
        ...current,
        [mode]: {
          ...current[mode],
          [visualKey]: {
            ...current[mode][visualKey],
            [fieldId]: value
          }
        }
      }));
    },
    [mode, visualKey]
  );

  const generateVisual = useCallback(async () => {
    if (isGenerating) return;

    // 密钥在服务端，前端只能检查这个模型有没有被配置过
    if (!configuredProviders().includes(providerConfig.provider)) {
      setStatus(
        "还没有可用的图片模型。请在项目根目录的 .env 里填入对应的 API Key（参考 .env.example），然后重启服务。",
        "error"
      );
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
        // 把当前图形的各字段折算成 Prompt 需要的四类槽位
        graphicText: toPromptTextSlots(
          getVisualByKey(visualKey),
          graphicTextByMode[mode][visualKey]
        ),
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

      setGenerationTrace(result.trace);

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
    graphicTextByMode,
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
    updateGraphicTextField,
    updateRemoveBackground: setRemoveBackground,
    generateVisual,
    setStatus
  };
}

/**
 * 把上传的文件解码成可直接 drawImage 的图片。
 *
 * 用 object URL 而不是 base64 data URL：大图转 base64 会占用可观内存，
 * 而这张图只在本次会话里画到 canvas 上，不需要序列化。
 * 代价是必须自己 revoke，见 revokeObjectUrl()。
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法解码上传的图片"));
    };
    image.src = url;
  });
}

function revokeObjectUrl(image: HTMLImageElement | null) {
  if (image?.src.startsWith("blob:")) {
    URL.revokeObjectURL(image.src);
  }
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
