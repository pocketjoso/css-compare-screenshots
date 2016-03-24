'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (css, baseUrl) {
  var ast = undefined;
  var rules = [];
  var fontfaceRules = [];
  var externalFontface = false;
  var urlHostname = _url2.default.parse(baseUrl).hostname;
  css = css.toString();
  try {
    ast = _css2.default.parse(css);
  } catch (e) {
    return {
      css: css,
      externalFontface: externalFontface,
      error: e
    };
  }
  ast.stylesheet.rules.forEach(function (rule) {
    if (rule.type === 'font-face') {
      if (!externalFontface) {
        externalFontface = isExternalFontface(rule, urlHostname);
      }
      fontfaceRules.push(rule);
    } else {
      rules.push(rule);
    }
  });
  ast.stylesheet.rules = fontfaceRules.concat(rules);

  return {
    css: _css2.default.stringify(ast),
    externalFontface: externalFontface
  };
};

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _css = require('css');

var _css2 = _interopRequireDefault(_css);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isExternalFontface(rule, urlHostname) {
  var externalFontface = false;
  rule.declarations.forEach(function (declaration) {
    if (declaration.property === 'src') {
      var matches = declaration.value.match(/url\(([^)]*)\)/);
      if (!matches || matches.length < 2) {
        return;
      }
      var urlPath = matches[1];
      var parsedUrl = _url2.default.parse(urlPath);
      if (parsedUrl.hostname && parsedUrl.hostname !== urlHostname) {
        externalFontface = true;
        return;
      }
    }
  });
  return externalFontface;
}
// ensures font-face declarations are lifted to the top of critical css,
// as they otherwise don't work in qt (phantomjs) browser