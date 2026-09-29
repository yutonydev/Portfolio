import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Lets the Lanyard import its binary .glb model instead of parsing it as text.
  assetsInclude: ['**/*.glb'],
})
