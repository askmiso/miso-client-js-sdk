import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

// UMD (dev)
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/miso.js',
    format: 'umd',
    name: 'Miso',
    indent: true
  },
  watch: true,
  plugins: [
    nodeResolve(),
    serve({
      port: 10101,
    }),
    livereload({
      delay: 500, 
      watch: 'dist',
    }),
  ],
};
