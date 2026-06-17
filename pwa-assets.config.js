import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimalPreset,
    maskable: {
      ...minimalPreset.maskable,
      padding: 0
    },
    apple: {
      ...minimalPreset.apple,
      padding: 0
    },
    transparent: {
      ...minimalPreset.transparent,
      padding: 0
    }
  },
  images: ['public/favicon.svg']
});
