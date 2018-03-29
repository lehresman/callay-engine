module.exports = {
  entry: {
    'callay-engine': "./src/engine.ts"
  },

  output: {
    filename: "[name].js",
    path: __dirname + "/dist"
  },

  resolve: {
    extensions: [".ts"]
  },

  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader', exclude: /node_modules/ }
    ]
  },

  plugins: [
  ]
};
