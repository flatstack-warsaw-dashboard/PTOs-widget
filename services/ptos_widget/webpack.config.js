import { URL } from 'node:url';
import { readFile } from 'node:fs/promises';
import webpack from 'webpack';
import dotenv from 'dotenv'

const NODE_ENV = process.env.NODE_ENV || 'development';

const name = 'ptosWidget';

const packageJson = JSON.parse(
  await readFile(new URL('./package.json', import.meta.url), {
    encoding: 'utf8',
  }),
);
const deps = packageJson.dependencies;

dotenv.config()

export default {
  entry:  {},
  mode: NODE_ENV,
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  output: {
    filename: 'bundle.js',
    path: new URL('./dist', import.meta.url).pathname,
    clean: true,
    publicPath: 'auto',
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env)
    }),
    // new webpack.optimize.LimitChunkCountPlugin({
    //     maxChunks: 1
    // }),
    new webpack.container.ModuleFederationPlugin({
      name,
      filename: 'remote.js',
      exposes: { '.': './src/custom.tsx' },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
        },
        'styled-components': {
          singleton: true,
          requiredVersion: deps['styled-component'],
        },
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(tsx?|jsx?)$/,
        use: 'ts-loader',
        exclude: /\/node_modules\//,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    port: 3302,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
