// PHANTOMJS SCRIPT
// use with phantomjs in order to take before/after critical css screenshots
'use strict';

var page = require('webpage').create();
var system = require('system');

var EXTERNAL_FONTFACE_RENDER_DELAY = 3000;
var STATUS_INLINED_CSS_DONE = 'INLINED_CSS_DONE';

var args = system.args;
var url = args[1];
var width = args[2];
var height = args[3];
var screenshotDist = args[4];
var fileName = args[5];
var externalFontface = args[6];
var userAgent = args[7];
var css = args.slice(8).join('');

// discard stdout from phantom exit
function phantomExit(code) {
  if (page) {
    page.close();
  }
  setTimeout(function () {
    window.phantom.exit(code);
  }, 0);
}

function renderScreenshot(suffix) {
  // even with use of both page.viewportSize and forceViewportSize func,
  // if content is taller than height, render would still a screenshot of height of content,
  // padded with blank space - so need to clip to ensure get correct height
  page.clipRect = {
    top: 0, left: 0,
    width: width,
    height: height
  };
  page.render(screenshotDist + fileName + '-' + suffix + '.jpg', { format: 'jpeg', quality: '20' });
}

function forceViewportSize(width, height) {
  // page.render by default grabs the full content of the page;
  // easiest way to cap to a certain height is by forcing it in css on html and body
  page.evaluate(function sandboxed(width, height) {
    [document.documentElement.style, document.body.style].forEach(function (elementStyles) {
      elementStyles.height = height + 'px';
      elementStyles.maxHeight = height + 'px';
      elementStyles.width = width + 'px';
      elementStyles.overflow = 'hidden';
    });
  }, width, height);
}

function generateScreenshots(url, css, width, height, externalFontface) {
  var generateConfig = {
    css: encodeURIComponent(css),
    STATUS_INLINED_CSS_DONE: STATUS_INLINED_CSS_DONE,
    renderDelay: externalFontface ? EXTERNAL_FONTFACE_RENDER_DELAY : 0
  };
  page.viewportSize = {
    width: width,
    height: height
  };

  page.open(url, function (status) {
    if (status !== 'success') {
      system.stderr.write('Error opening url \'' + page.reason_url + '\': ' + page.reason);
      phantomExit(1);
      return;
    }
    forceViewportSize(width, height);
    injectDefaultWhiteBg();
    setTimeout(function () {
      renderScreenshot('before');
      page.evaluate(generateAfterScreenshot, generateConfig);
    }, generateConfig.renderDelay);
  });
}

function injectDefaultWhiteBg() {
  page.evaluate(function () {
    var style = document.createElement('style');
    var text = document.createTextNode('body { background: #fff }');
    style.setAttribute('type', 'text/css');
    style.appendChild(text);
    document.head.insertBefore(style, document.head.firstChild);
  });
}

function generateAfterScreenshot(options) {
  var removeStyles = function removeStyles() {
    var styleElements = document.querySelectorAll('link[rel="stylesheet"], style');
    Array.prototype.forEach.call(styleElements, function (element) {
      element.parentNode.removeChild(element);
    });
  };
  var insertStyles = function insertStyles(styles) {
    var styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    // inject defaultWhiteBg to match before-render
    styles = 'body { background: #fff }' + styles;
    // if unreachable font-face src url in styles, phantomjs seems to crash here on Ubuntu :/
    styleTag.appendChild(document.createTextNode(styles));
    document.head.appendChild(styleTag);
  };
  var css = decodeURIComponent(options.css);
  removeStyles();
  insertStyles(css);

  setTimeout(function () {
    window.callPhantom({
      status: options.STATUS_INLINED_CSS_DONE
    });
  }, options.renderDelay);
}

page.onError = function (msg, trace) {
  // do nothing
};

page.onResourceError = function (resourceError) {
  page.reason = resourceError.errorString;
  page.reason_url = resourceError.url;
};

page.onResourceRequested = function (requestData, request) {
  if (/\.js(\?.*)?$/.test(requestData.url)) {
    request.abort();
  }
};

page.onCallback = function (data) {
  if (data.status === STATUS_INLINED_CSS_DONE) {
    renderScreenshot('after');
    phantomExit(0);
    return;
  }
  phantomExit(0);
};

generateScreenshots(url, css, width, height, externalFontface);