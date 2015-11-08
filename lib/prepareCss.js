'use strict';

import url from 'url';
import cssModule from 'css';

function isExternalFontface(rule, urlHostname) {
  let externalFontface = false;
  rule.declarations.forEach(function (declaration) {
    if (declaration.property === 'src') {
      let matches = declaration.value.match(/url\(([^)]*)\)/);
      let urlPath = matches[1];
      let parsedUrl = url.parse(urlPath);
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
export default function (css, baseUrl) {
  let ast;
  let rules = [];
  let fontfaceRules = [];
  let externalFontface = false;
  let urlHostname = url.parse(baseUrl).hostname;
  css = css.toString();
  try {
    ast = cssModule.parse(css);
  } catch (e) {
    return {
      css,
      externalFontface,
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
    css: cssModule.stringify(ast),
    externalFontface
  };
}