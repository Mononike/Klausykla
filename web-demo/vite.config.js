import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pakeisk 'klausykla' i savo repo pavadinima jei skiriasi
  base: '/Klausykla/',
})

