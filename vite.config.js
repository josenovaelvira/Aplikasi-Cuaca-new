import { defineConfig } from 'vite';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
    plugins: [viteSingleFile()],
    resolve: {
        alias: {
            // Fix for broken lucide package entry point
            'lucide': 'lucide/dist/cjs/lucide.js',
        },
    },
});
