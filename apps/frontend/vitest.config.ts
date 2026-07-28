import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    /**
     * `lib/env.ts` valida as variáveis na importação e lança se faltarem. Um
     * teste de componente que alcance a camada de serviço — mesmo sem chamar
     * a API — quebra na importação sem isto. O endereço é fictício de
     * propósito: nenhum teste deve sair para a rede.
     */
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:0/api',
      NEXT_PUBLIC_USE_MOCKS: 'false',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
