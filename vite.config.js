export default defineConfig({
  plugins: [react()],
  base: "/calculo-motorista/",
  build: {
    outDir: 'docs' // Vamos mudar de 'dist' para 'docs'
  }
})