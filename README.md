#CSS before/after comparision screenshots

[![NPM version](https://badge.fury.io/js/css-compare-screenshots.svg)](http://badge.fury.io/js/css-compare-screenshots)

Take before/after screenshots of a web page when updating css, to check for regressions.

Uses `phantomjs` do the page rendering.

## Usage
```
import compareScreenshots from 'css-compare-screenshots' // or require, if you're not using ES6 yet

compareScreenshots({
  url: 'http://trello.com', // or local html file
  css: 'body { color: red }',
  width: 1300,
  height: 900,
  dist: 'comparisons/',
  fileName: 'homepage' // will generate 'homepage-before' and 'homepage-after'

  // optional
  timeout: 150000, // ms
  userAgent: 'css-compare-screenshots Penthouse module'
}).then(function () {
  // done!
})
```
