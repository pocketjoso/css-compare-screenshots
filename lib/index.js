'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref) {
  var css = _ref.css,
      url = _ref.url,
      width = _ref.width,
      height = _ref.height,
      dist = _ref.dist,
      fileName = _ref.fileName,
      _ref$timeout = _ref.timeout,
      timeout = _ref$timeout === undefined ? DEFAULT_TIMEOUT : _ref$timeout,
      _ref$userAgent = _ref.userAgent,
      userAgent = _ref$userAgent === undefined ? DEFAULT_USER_AGENT : _ref$userAgent;

  var timeoutWait = timeout;
  var configString = '--config=' + configPath;

  var _prepareCss = (0, _prepareCss3.default)(css, url),
      preparedCss = _prepareCss.css,
      externalFontface = _prepareCss.externalFontface,
      error = _prepareCss.error;

  if (error) {
    console.log('prepareCss error', error);
    preparedCss = css;
  }

  // TODO: research actual limit for individual args where phantomjs(?) bails (~22000 on this laptop)
  // TODO: how to use const instead of hardcoded 15000 below?
  var cssChunks = preparedCss.match(/[\s\S]{1,15000}/g);
  var scriptArgs = [url, width, height, dist, fileName, externalFontface, userAgent].concat(cssChunks);

  var hasTimedOut = false;

  return new Promise(function (resolve, reject) {
    var cp = (0, _child_process.spawn)(phantomJsBinPath, [configString, scriptPath].concat(scriptArgs));
    var stdErr = '';

    cp.stderr.on('data', function (data) {
      stdErr += data;
    });

    // kill after timeout
    var killTimeout = setTimeout(function () {
      hasTimedOut = true;
      cp.kill('SIGTERM');
    }, timeoutWait);

    cp.on('exit', function (code) {
      if (hasTimedOut || code === 1 || stdErr.indexOf('PhantomJS has crashed') > -1) {
        var errorMsg = 'css-compare-screenshots error';
        if (hasTimedOut) {
          errorMsg += ': PhantomJS process timed out after ' + timeoutWait / 1000 + 's.';
        }
        if (stdErr.length > 0) {
          errorMsg += ': ' + stdErr;
        }
        return reject(new Error(errorMsg));
      } else {
        resolve();
      }
      // need to clean up after ourselves; can't rely on that the parent process will be terminated any time soon.
      process.removeListener('SIGTERM', sigtermHandler);
      cp.kill('SIGTERM');
    });

    function exitHandler() {
      cp.kill('SIGTERM');
    }
    function sigtermHandler() {
      cp.kill('SIGTERM');
      process.exit(1);
    }
    process.on('exit', exitHandler);
    process.on('SIGTERM', sigtermHandler);
  });
};

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _prepareCss2 = require('./prepareCss');

var _prepareCss3 = _interopRequireDefault(_prepareCss2);

var _phantomjsPrebuilt = require('phantomjs-prebuilt');

var _phantomjsPrebuilt2 = _interopRequireDefault(_phantomjsPrebuilt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var phantomJsBinPath = _phantomjsPrebuilt2.default.path;
var scriptPath = _path2.default.join(__dirname, './phantom/script.js');
var configPath = _path2.default.join(__dirname, './phantom/config.json');

var DEFAULT_TIMEOUT = 15000;
var DEFAULT_USER_AGENT = 'css-compare-screenshots Penthouse module';