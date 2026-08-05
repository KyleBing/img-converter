# Img Converter

本地浏览器图片格式转换工具，优先支持 **BMP → PNG**，也可在 PNG / JPEG / WebP / BMP 之间互转。

## 功能

- 批量添加图片（拖拽 / 选择），缩略图预览
- 显示文件大小、尺寸、修改时间
- 勾选后批量转换，可调 JPEG/WebP 质量
- 右侧查看转换结果，单张下载 / 导出到目录 / 打包 ZIP
- 底部对比转换前后体积与尺寸
- 点击缩略图查看大图，或新窗口打开
- 全程本地处理，不上传服务器

## 技术栈

- Vue 3 + Vite + TypeScript
- Canvas API 完成 PNG / JPEG / WebP 编码
- 自实现 BMP 编码器（24-bit）
- `jszip` + `file-saver` 打包下载
- File System Access API 目录导出（Chrome / Edge）

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
