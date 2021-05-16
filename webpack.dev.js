const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const fs = require('fs');

// App directory
const appDirectory = fs.realpathSync(process.cwd());
 
module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    //mode: 'none',
    devServer: {
        //contentBase: path.resolve(appDirectory, "public"),
        compress: true,
        //publicPath: '/',
        //host: '0.0.0.0', // enable to access from other devices on the network
        disableHostCheck: true,
        port: 8080,
        //https: true // enable when HTTPS is needed (like in WebXR)
    },
});
