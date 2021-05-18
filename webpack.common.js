const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require('webpack');

// App directory
//const appDirectory = fs.realpathSync(process.cwd());

module.exports = {
    //entry: path.resolve(appDirectory, "src/index.ts"),
    entry: __dirname + "/src/index.ts",
    output: {
        filename: 'bundle.[contenthash].js',
        //filename: 'bundle.js',
        //path: path.resolve("./dist/"),
        path: __dirname + "/dist",
    },
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            fs: false,
            path: false, // require.resolve("path-browserify")
        },
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            },
            //{
                //test: /\.(js|mjs|jsx|ts|tsx)$/,
                //loader: "source-map-loader",
                //enforce: "pre",
            //},
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
            },
            //{
                //test: /\.(png|jpg|gif|env|glb|stl)$/i,
                //use: [
                    //{
                        //loader: "url-loader",
                        //options: {
                            //limit: 8192,
                        //},
                    //},
                //],
            //},
        ],
    },
    plugins: [
        //new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            //inject: true,
            template: __dirname + "/public/index.html",
        }),
    ],
};
