import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径，便于本地打开或任意子目录部署
  base: './',
  plugins: [vue()],
})
