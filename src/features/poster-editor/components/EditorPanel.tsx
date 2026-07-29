import type {
  GraphicOverlayText,
  GraphicSource,
  PosterEditorState
} from "../hooks/usePosterEditor";
import {
  getManualApiConfigFields,
  listImageProviderDefinitions,
  type ImageProviderConfig,
  type ImageProviderId,
  type ProviderConfigField
} from "@providers";
import type { PosterCopy, VisualAsset, VisualKey } from "@/shared/poster/types";
import { FeaturePointList } from "./FeaturePointList";

interface EditorPanelProps {
  state: PosterEditorState;
  visualOptions: VisualAsset[];
  onCopyFieldChange: <Key extends keyof PosterCopy>(field: Key, value: PosterCopy[Key]) => void;
  onAddFeaturePoint: () => void;
  onUpdateFeaturePoint: (index: number, value: string) => void;
  onRemoveFeaturePoint: (index: number) => void;
  onGraphicSourceChange: (source: GraphicSource) => void;
  onLibraryVisualChange: (key: VisualKey) => void;
  onUploadedFileChange: (file: File | null) => void;
  onKeywordsChange: (value: string) => void;
  onProviderChange: (provider: ImageProviderId) => void;
  onProviderConfigFieldChange: (
    field: keyof ImageProviderConfig | `extra.${string}`,
    value: string
  ) => void;
  onGraphicOverlayTextChange: (field: keyof GraphicOverlayText, value: string) => void;
  onGenerateVisual: () => void;
}

const graphicSourceOptions: Array<{ label: string; value: GraphicSource }> = [
  { label: "AI自动生成", value: "ai" },
  { label: "素材图库", value: "library" },
  { label: "上传图片", value: "upload" }
];

const providerOptions = listImageProviderDefinitions();

/**
 * ProviderConfigInput 必须定义在组件外部，
 * 否则每次父组件渲染都会重新创建该组件，导致输入框失焦。
 */
interface ProviderConfigInputProps {
  config: ImageProviderConfig;
  field: ProviderConfigField;
  onChange: (field: keyof ImageProviderConfig | `extra.${string}`, value: string) => void;
}

function ProviderConfigInput({ config, field, onChange }: ProviderConfigInputProps) {
  const value = getProviderConfigValue(config, field.key);
  const commonProps = {
    value,
    placeholder: field.placeholder || "",
    required: field.required,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field.key, event.target.value)
  };

  return (
    <label>
      {field.label}
      {field.type === "textarea" ? (
        <textarea {...commonProps} />
      ) : (
        <input type={toInputType(field.type)} {...commonProps} />
      )}
      {field.description ? <span className="field-hint">{field.description}</span> : null}
    </label>
  );
}

function getProviderConfigValue(
  config: ImageProviderConfig,
  field: keyof ImageProviderConfig | `extra.${string}`
) {
  if (field.startsWith("extra.")) {
    return String(config.extra?.[field.slice("extra.".length)] || "");
  }

  const value = config[field as keyof ImageProviderConfig];
  return value === undefined || value === null ? "" : String(value);
}

function toInputType(type: ProviderConfigField["type"]) {
  if (type === "password" || type === "url" || type === "number") return type;
  return "text";
}

export function EditorPanel({
  state,
  visualOptions,
  onCopyFieldChange,
  onAddFeaturePoint,
  onUpdateFeaturePoint,
  onRemoveFeaturePoint,
  onGraphicSourceChange,
  onLibraryVisualChange,
  onUploadedFileChange,
  onKeywordsChange,
  onProviderChange,
  onProviderConfigFieldChange,
  onGraphicOverlayTextChange,
  onGenerateVisual
}: EditorPanelProps) {
  const providerFields = getManualApiConfigFields(state.providerConfig.provider);

  return (
    <aside className="panel">
      <div className="panel-section">
        <h2>内容编辑</h2>
        <label>
          蓝色标题
          <input
            id="titleBlue"
            value={state.copy.titleBlue}
            onChange={(event) => onCopyFieldChange("titleBlue", event.target.value)}
          />
        </label>
        <label>
          深色标题
          <input
            id="titleDark"
            value={state.copy.titleDark || ""}
            onChange={(event) => onCopyFieldChange("titleDark", event.target.value)}
          />
        </label>
        <label>
          副标题
          <input
            id="subtitle"
            value={state.copy.subtitle || ""}
            onChange={(event) => onCopyFieldChange("subtitle", event.target.value)}
          />
        </label>
        <label>
          提示语
          <input
            id="notice"
            value={state.copy.notice || ""}
            onChange={(event) => onCopyFieldChange("notice", event.target.value)}
          />
        </label>

        <FeaturePointList
          points={state.copy.featurePoints}
          onAdd={onAddFeaturePoint}
          onUpdate={onUpdateFeaturePoint}
          onRemove={onRemoveFeaturePoint}
        />
      </div>

      <div className="panel-section">
        <h2>右侧图形</h2>
        <fieldset className="field-group">
          <legend>图形来源</legend>
          <div className="radio-list">
            {graphicSourceOptions.map((option) => (
              <label className="radio-option" key={option.value}>
                <input
                  type="radio"
                  name="graphicSource"
                  value={option.value}
                  checked={state.graphicSource === option.value}
                  onChange={() => onGraphicSourceChange(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.graphicSource === "library" ? (
          <div className="source-panel">
            <div className="gallery-grid">
              {visualOptions.map((visual) => (
                <button
                  className={`gallery-item ${
                    state.libraryVisualKey === visual.key ? "active" : ""
                  }`}
                  type="button"
                  key={visual.key}
                  onClick={() => onLibraryVisualChange(visual.key)}
                >
                  <img src={visual.assetPath} alt="" />
                  <span>{visual.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {state.graphicSource === "upload" ? (
          <div className="source-panel">
            <label className="upload-zone">
              <span className="upload-title">上传图片</span>
              <span className="upload-name">{state.uploadedFileName || "选择本地图片"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onUploadedFileChange(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        ) : null}

        {state.graphicSource === "ai" ? (
          <div className="source-panel">
            <label>
              功能关键词
              <textarea
                value={state.keywords}
                onChange={(event) => onKeywordsChange(event.target.value)}
              />
            </label>
            <div className="provider-panel">
              <h3>模型接口配置</h3>
              <label>
                图片模型
                <select
                  value={state.providerConfig.provider}
                  onChange={(event) => onProviderChange(event.target.value as ImageProviderId)}
                >
                  {providerOptions.map((provider) => (
                    <option value={provider.id} key={provider.id}>
                      {provider.displayName}
                    </option>
                  ))}
                </select>
              </label>
              {providerFields.map((field) => (
                <ProviderConfigInput
                  config={state.providerConfig}
                  field={field}
                  key={field.key}
                  onChange={onProviderConfigFieldChange}
                />
              ))}
            </div>

            {/* AI 生成按钮 */}
            <div className="generate-section">
              {state.aiGeneratedDataUrl ? (
                <div className="ai-preview-thumb">
                  <img src={state.aiGeneratedDataUrl} alt="AI 生成预览" />
                  <span className="ai-preview-label">已生成</span>
                </div>
              ) : null}
              <button
                type="button"
                className="generate-btn"
                disabled={state.isGenerating}
                onClick={onGenerateVisual}
              >
                {state.isGenerating ? (
                  <>
                    <span className="generate-spinner" />
                    生成中…
                  </>
                ) : (
                  <>✨ 生成图形</>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel-section">
        <h2>图形文字</h2>
        <label>
          顶部文字
          <input
            value={state.graphicOverlayText.topText}
            onChange={(event) => onGraphicOverlayTextChange("topText", event.target.value)}
          />
        </label>
        <label>
          标签
          <input
            value={state.graphicOverlayText.label}
            onChange={(event) => onGraphicOverlayTextChange("label", event.target.value)}
          />
        </label>
        <label>
          按钮文字
          <input
            value={state.graphicOverlayText.buttonText}
            onChange={(event) => onGraphicOverlayTextChange("buttonText", event.target.value)}
          />
        </label>
        <label>
          徽章文字
          <input
            value={state.graphicOverlayText.badgeText}
            onChange={(event) => onGraphicOverlayTextChange("badgeText", event.target.value)}
          />
        </label>
      </div>
    </aside>
  );
}
