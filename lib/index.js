'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _libPrepareCss = require('./lib/prepareCss');

var _libPrepareCss2 = _interopRequireDefault(_libPrepareCss);

var _phantomjs = require('phantomjs');

var _phantomjs2 = _interopRequireDefault(_phantomjs);

var phantomJsBinPath = _phantomjs2['default'].path;
var scriptPath = _path2['default'].join(__dirname, './lib/phantom/script.js');
var configPath = _path2['default'].join(__dirname, './lib/phantom/config.json');

exports['default'] = function (_ref) {
  var css = _ref.css;
  var url = _ref.url;
  var width = _ref.width;
  var height = _ref.height;
  var dist = _ref.dist;
  var fileName = _ref.fileName;

  var configString = '--config=' + configPath;

  var _prepareCss = (0, _libPrepareCss2['default'])(css, url);

  var preparedCss = _prepareCss.css;
  var externalFontface = _prepareCss.externalFontface;
  var error = _prepareCss.error;

  if (error) {
    console.log('prepareCss error', error);
    preparedCss = css;
  }

  // TODO: research actual limit for individual args where phantomjs(?) bails (~22000 on this laptop)
  // TODO: how to use const instead of hardcoded 15000 below?
  var cssChunks = preparedCss.match(/[\s\S]{1,15000}/g);
  var scriptArgs = [url, width, height, dist, fileName, externalFontface].concat(cssChunks);

  console.log(scriptArgs);

  return new Promise(function (resolve, reject) {
    var cp = (0, _child_process.spawn)(phantomJsBinPath, [configString, scriptPath].concat(scriptArgs));

    // for testing
    var stdOut = '';
    var stdErr = '';
    cp.stdout.on('data', function (data) {
      stdOut += data;
    });

    cp.stderr.on('data', function (data) {
      stdErr += data;
    });

    cp.on('exit', function (code) {
      if (code === 1 || stdErr.includes('PhantomJS has crashed')) {
        var errorMsg = 'Error in generateScreenshots';
        if (stdErr.length > 0) {
          errorMsg += ': ' + stdErr;
        }
        reject(new Error(errorMsg));
        return;
      }
      resolve();
    });

    process.on('SIGTERM', function () {
      cp.kill('SIGTERM');
      process.exit(1);
    });
  });
};

module.exports = exports['default'];