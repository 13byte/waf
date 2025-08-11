import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@context': path.resolve(__dirname, './src/context'),
      '@pages': path.resolve(__dirname, './src/pages')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    historyApiFallback: true
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    historyApiFallback: true
  }
})
