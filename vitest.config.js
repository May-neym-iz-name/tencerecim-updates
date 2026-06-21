import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['electron/**/*.test.js', 'src/**/*.test.{js,jsx}'],
    exclude: ['node_modules/**', 'ecc-kaynak/**', 'dist/**', 'dist-electron/**'],
    environment: 'node',
  },
})
