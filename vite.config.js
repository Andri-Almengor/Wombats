import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base: process.env.GITHUB_PAGES === 'true'?'/Wombats/':'/',build:{rollupOptions:{input:{game:'index.html',review:'player-review.html'}}}});
