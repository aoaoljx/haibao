import type { ProviderConfigField } from "./types";

export const apiKeyField: ProviderConfigField = {
  key: "apiKey",
  label: "API Key",
  type: "password",
  required: true,
  placeholder: "由运营在界面手动输入",
  description: "只用于当前 Provider 的图片生成请求。"
};

export const optionalApiKeyField: ProviderConfigField = {
  ...apiKeyField,
  required: false
};

export const baseUrlField: ProviderConfigField = {
  key: "baseUrl",
  label: "API Base URL",
  type: "url",
  required: true,
  placeholder: "https://api.example.com",
  description: "自托管或代理服务的接口地址。"
};

export const optionalBaseUrlField: ProviderConfigField = {
  ...baseUrlField,
  required: false
};

export const modelField: ProviderConfigField = {
  key: "model",
  label: "Model",
  type: "text",
  required: true,
  placeholder: "输入模型名称",
  description: "不同 Provider 的模型名称由运营按实际 API 配置填写。"
};

export const optionalModelField: ProviderConfigField = {
  ...modelField,
  required: false
};

export const timeoutField: ProviderConfigField = {
  key: "timeoutMs",
  label: "Timeout",
  type: "number",
  required: false,
  placeholder: "120000",
  description: "图片生成最大等待时间，单位毫秒。"
};

export const workflowIdField: ProviderConfigField = {
  key: "workflowId",
  label: "Workflow ID",
  type: "text",
  required: false,
  placeholder: "ComfyUI workflow 或 SDXL pipeline 标识",
  description: "自托管工作流可用，用于区分不同图片生成流程。"
};

export const apiVersionField: ProviderConfigField = {
  key: "apiVersion",
  label: "API Version",
  type: "text",
  required: false,
  placeholder: "按 Provider 要求填写",
  description: "部分云服务需要指定 API 版本。"
};
