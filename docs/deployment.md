# 部署文档

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 可访问静态资源的 Web 服务器，例如 Nginx、Apache、对象存储 CDN 或任意静态托管平台

## 本地开发

```bash
npm install
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:3000
```

## 构建

```bash
npm run build
```

构建完成后会生成：

```text
dist/
```

`dist/` 是最终部署目录。

## 本地预览生产包

```bash
npm run preview
```

默认访问地址：

```text
http://127.0.0.1:4173
```

## Nginx 部署示例

把 `dist/` 上传到服务器，例如：

```text
/var/www/idevflow-poster-maker
```

Nginx 配置示例：

```nginx
server {
  listen 80;
  server_name poster.example.com;

  root /var/www/idevflow-poster-maker;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /poster-assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # ---- 模型 API 反向代理（缺了这段，AI 生成会 404）----
  # 前端不会直连模型 API（浏览器 CORS 会拦），而是把请求改写成 /api/<provider>/...
  # 前缀只代表 origin，后面就是目标 host 上的完整路径。
  # location 与 proxy_pass 都必须带结尾斜杠，Nginx 才会把前缀替换掉而不是拼接。
  #
  #   /api/dashscope/api/v1/services/aigc/text2image/image-synthesis
  #   → https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
  #
  # 映射表以 providers/apiProxyMap.ts 为准，增删 Provider 时两边要一起改。

  location /api/dashscope/ {
    proxy_pass https://dashscope.aliyuncs.com/;
    proxy_set_header Host dashscope.aliyuncs.com;
    proxy_ssl_server_name on;
    proxy_read_timeout 300s;
  }

  location /api/openai/ {
    proxy_pass https://api.openai.com/;
    proxy_set_header Host api.openai.com;
    proxy_ssl_server_name on;
    proxy_read_timeout 300s;
  }

  location /api/gemini/ {
    proxy_pass https://generativelanguage.googleapis.com/;
    proxy_set_header Host generativelanguage.googleapis.com;
    proxy_ssl_server_name on;
    proxy_read_timeout 300s;
  }

  location /api/flux/ {
    proxy_pass https://api.bfl.ml/;
    proxy_set_header Host api.bfl.ml;
    proxy_ssl_server_name on;
    proxy_read_timeout 300s;
  }

  location /api/ideogram/ {
    proxy_pass https://api.ideogram.ai/;
    proxy_set_header Host api.ideogram.ai;
    proxy_ssl_server_name on;
    proxy_read_timeout 300s;
  }
}
```

`proxy_ssl_server_name on` 不能省：上游是 HTTPS，缺了 SNI 会握手失败。

重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

### 代理是开放转发，注意暴露面

这些 `location` 会把任何人发到本站的请求转发给对应模型厂商。调用方需要自带 API Key
（Key 来自浏览器输入，不存在服务器上），所以不会盗刷你的额度，但站点仍然成了这五个域名的
公开转发通道。如果服务对公网开放，建议至少加内网 IP 白名单或登录鉴权：

```nginx
location /api/dashscope/ {
  allow 10.0.0.0/8;
  deny all;
  # ...其余同上
}
```

### 纯静态托管（对象存储 / CDN）无法直接支持 AI 生成

对象存储和多数静态托管平台不能配反向代理。把 `dist/` 直接丢上去，海报编辑和导出都正常，
但 AI 生成会因为拿不到 `/api/*` 转发而失败。这种场景需要另外准备一个能反代的入口
（Nginx、网关、或平台自带的 Edge Function / Rewrites 能力）。

## 模型接口配置

产品已将图片模型能力抽象为统一接口：

```ts
generateImage(input, config)
```

Provider 配置由运营在界面输入，当前支持以下 Provider 类型：

- GPT Image
- Gemini
- Flux
- Ideogram
- ComfyUI
- SDXL

当前 Web 前端只保存页面运行期输入的配置。生产环境如果需要长期保存 API Key，建议在服务器侧增加配置存储或代理服务，再由 `providers/` 下的具体适配器调用。

## 接入真实图片模型

接入新模型时只需要补对应 Provider：

1. 在 `providers/types.ts` 中确认 Provider ID。
2. 在对应 Provider 文件中实现 `generateImage()` 的真实 HTTP 调用。
3. 确保返回值符合 `GenerateImageResult`，即 PNG base64 和 data URL。
4. 如果需要新增配置字段，在 `providers/configFields.ts` 中维护。
5. 运行 `npm run build` 验证。

## 部署检查

部署前建议执行：

```bash
npm run typecheck
npm run build
```

上线后检查：

- 页面可以正常打开。
- 海报素材可以加载。
- 素材图库、上传图片和导出 PNG 正常。
- AI 自动生成区域可以选择 Provider 并填写接口配置。
