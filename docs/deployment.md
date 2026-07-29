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
}
```

重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

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
