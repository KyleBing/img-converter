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
npm run preview
```

## 远程仓库

```
git@github.com:KyleBing/img-converter.git
```
