const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'none',
    //mode: 'production',
    //devtool: 'source-map'
});
