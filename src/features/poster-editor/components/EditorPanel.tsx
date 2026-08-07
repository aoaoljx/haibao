import type { PosterEditorState } from "../hooks/usePosterEditor";
import {
  configuredProviders,
  getImageProviderDefinition,
  providersAwaitingAdapter,
  type ImageProviderId
} from "@providers";
import type { GraphicSource, PosterCopy, VisualAsset, VisualKey } from "@/shared/poster/types";
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
  onRemoveBackgroundChange: (value: boolean) => void;
  onGenerateVisual: () => void;
}

const graphicSourceOptions: Array<{ label: string; value: GraphicSource }> = [
  { label: "AI自动生成", value: "ai" },
  { label: "素材图库", value: "library" },
  { label: "上传图片", value: "upload" }
];

/**
 * 只列出 .env 里真正配了密钥的模型。
 *
 * 这样不会再出现「下拉里选得到、点了才报错」——能选中的一定是能用的。
 * 在模块级求值：构建时注入的常量，运行期不会变。
 */
const readyProviders = configuredProviders().map(getImageProviderDefinition);

/** 配了密钥但适配器还没接的，单独提示，免得运营以为自己配错了 */
const pendingProviders = providersAwaitingAdapter().map(
  (id) => getImageProviderDefinition(id).displayName
);

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
  onRemoveBackgroundChange,
  onGenerateVisual
}: EditorPanelProps) {
  const providerDefinition = getImageProviderDefinition(state.providerConfig.provider);
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
                  title={visual.description}
                >
                  <img src={visual.assetPath} alt="" />
                  <span>
                    {visual.name}
                    {/* 推荐只是提示，不限制选择 */}
                    {visual.preferredModes.includes(state.mode) ? (
                      <em className="gallery-tag">推荐</em>
                    ) : null}
                  </span>
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
              <h3>图片模型</h3>
              {readyProviders.length ? (
                <>
                  <label>
                    使用模型
                    <select
                      value={state.providerConfig.provider}
                      onChange={(event) => onProviderChange(event.target.value as ImageProviderId)}
                    >
                      {readyProviders.map((provider) => (
                        <option value={provider.id} key={provider.id}>
                          {provider.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="field-hint">
                    密钥由服务端从 .env 读取，不经过浏览器，因此这里无需填写。
                    要新增或更换模型，编辑项目根目录的 .env 后重启服务。
                  </p>
                </>
              ) : (
                <p className="field-hint field-hint-warn">
                  还没有可用的图片模型。请复制 .env.example 为 .env，
                  填入 DASHSCOPE_API_KEY 或 OPENAI_API_KEY，然后重启服务。
                </p>
              )}
              {pendingProviders.length ? (
                <p className="field-hint field-hint-warn">
                  已在 .env 里配置但<strong>尚未支持</strong>：{pendingProviders.join("、")}。
                  这几个 Provider 只在注册表里占位，适配器还没接，所以不会出现在上面的列表里。
                </p>
              ) : null}
              {providerDefinition.supportsTransparentBackground ? null : (
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={state.removeBackground}
                    onChange={(event) => onRemoveBackgroundChange(event.target.checked)}
                  />
                  <span>
                    自动去除背景
                    <span className="field-hint">
                      该模型不产透明底。海报右侧图形需要透明，默认自动抠掉背景；
                      若发现主体被误伤，可关掉后重新生成。
                    </span>
                  </span>
                </label>
              )}
            </div>

            {/* AI 生成按钮 */}
            <div className="generate-section">
              {state.aiGeneratedDataUrl ? (
                <div className="ai-preview-thumb">
                  <img src={state.aiGeneratedDataUrl} alt="AI 生成预览" />
                  <span className="ai-preview-label">已生成</span>
                </div>
              ) : null}
              {state.generationTrace ? (
                <p className="field-hint trace-hint">
                  按关键词命中「{state.generationTrace.sceneName}」场景模板
                  {state.generationTrace.matchedCategories.length
                    ? `（${state.generationTrace.matchedCategories.join("、")}）`
                    : "（未命中关键词，按当前海报类型兜底）"}
                  。出图方向不对时，先调整上方的功能关键词。
                </p>
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

    </aside>
  );
}
