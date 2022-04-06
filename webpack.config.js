const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const basePath = path.resolve(__dirname) + '/';
const srcPath = path.resolve(__dirname) + '/src/';

module.exports = (env, argv) => {
    const mode = argv.mode;
    const isDevelopment = mode !== 'production';
    const loader = isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader;

    return {
        mode: mode,
        entry: {
            bundle: srcPath + 'lib/index.ts',
            app: srcPath + 'test/app.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].[contenthash].js',
            clean: true,
            assetModuleFilename: 'assets/[hash][ext]'
        },
        resolve: {
            extensions: ['.ts', '.js'],
        },
        devtool: 'source-map',
        devServer: {
            static: {
                directory: basePath + '/dist',
            },
            port: 3000,
            // open: true,
            hot: true,
            compress: true,
            historyApiFallback: true,
        },
        module: {
            rules: [
                {
                    test: /\.ts?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                        // options: {
                        //     // disable type checker - we will use it in fork plugin
                        //     transpileOnly: true,
                        // },
                    },
                },
                {
                    test: /\.scss$/,
                    use: [
                        loader, 
                        'css-loader',
                        'sass-loader'
                    ],
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/i,
                    type: 'asset/resource',
                },
                {
                    test: /\.(json)$/i,
                    type: 'asset/resource',
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                // Options similar to the same options in webpackOptions.output
                // both options are optional
                filename: '[name].[hash].css',
                chunkFilename: '[id].[hash].css',
            }),
            new HtmlWebpackPlugin({
                title: 'CubeNav Test page',
                filename: 'index.html',
                template: 'src/test/index.html',
            }),
            // new BundleAnalyzerPlugin(),
        ],
    };
};
