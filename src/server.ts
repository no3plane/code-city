import { serve } from 'bun';
import indexHtml from './frontend/index.html' assert { type: 'html' };

const PORT = 3000;

serve({
    port: PORT,
    development: {
        hmr: true,
        console: true,
    },
    routes: {
        '/': indexHtml,
        '/data': Bun.file('output/result2.csv'),
    },
});

console.log(`http://localhost:${PORT}`);
