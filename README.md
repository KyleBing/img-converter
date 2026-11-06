# Img Converter

本地浏览器图片格式转换工具，支持常见栅格格式互转。

## 功能

- 批量添加图片（拖拽 / 选择 / 文件夹），缩略图预览
- 显示文件大小、尺寸、修改时间
- 勾选后批量转换，可调 JPEG / WebP / AVIF 质量
- **输出**：PNG / JPEG / WebP / AVIF / GIF / BMP / ICO / TIFF
- **输入**：上述格式，以及 SVG、HEIC/HEIF、CUR、JFIF 等
- 右侧查看转换结果，单张下载 / 导出到目录 / 打包 ZIP
- 底部对比转换前后体积与尺寸
- 点击缩略图查看大图，或新窗口打开
- 全程本地处理，不上传服务器

## 技术栈

- Vue 3 + Vite + TypeScript
- Canvas API：PNG / JPEG / WebP / AVIF
- 自实现 BMP、ICO 编码；`gifenc` 单帧 GIF；`utif2` TIFF；`heic-to` HEIC 解码
- `jszip` + `file-saver` 打包下载
- File System Access API 目录导出（Chrome / Edge）

线上地址：[https://kylebing.cn/tools/img-converter/](https://kylebing.cn/tools/img-converter/)

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建完成后会自动将 `dist` 打成 zip，输出到 `archive/`（如 `img-converter_v0.1.0_2026-08-05_135400.zip`）。

```bash
npm run preview
```

## 部署

```bash
npm run deploy
```

先执行 `npm run build`，再把 `dist/` rsync 到 `root@kylebing.cn:/var/www/html/tools/img-converter/`。主机、用户和目录可用 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PATH` 覆盖。`SKIP_BUILD=1` 时跳过构建，直接上传已有的 `dist/`。

## GitHub Pages

推送到 `master` 或手动运行 Actions 工作流 `Deploy GitHub Pages` 即可部署。

构建在 CI 的临时目录完成，**不会在仓库里生成或提交 `dist`**。

首次使用请在仓库设置中开启 Pages：

1. **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**

站点地址一般为：

```
https://kylebing.github.io/img-converter/
```

## 远程仓库

```
git@github.com:KyleBing/img-converter.git
```
