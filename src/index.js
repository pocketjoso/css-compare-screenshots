'use strict'
import path from 'path'
import { spawn } from 'child_process'

import prepareCss from './prepareCss'

import phantomjs from 'phantomjs-prebuilt'
const phantomJsBinPath = phantomjs.path
const scriptPath = path.join(__dirname, './phantom/script.js')
const configPath = path.join(__dirname, './phantom/config.json')

const DEFAULT_TIMEOUT = 15000

export default function ({ css, url, width, height, dist, fileName, timeout = DEFAULT_TIMEOUT }) {
  const timeoutWait = timeout
  const configString = '--config=' + configPath
  let { css: preparedCss, externalFontface, error } = prepareCss(css, url)
  if (error) {
    console.log('prepareCss error', error)
    preparedCss = css
  }

  // TODO: research actual limit for individual args where phantomjs(?) bails (~22000 on this laptop)
  // TODO: how to use const instead of hardcoded 15000 below?
  const cssChunks = preparedCss.match(/[\s\S]{1,15000}/g)
  const scriptArgs = [
    url,
    width,
    height,
    dist,
    fileName,
    externalFontface
  ].concat(cssChunks)

  let hasTimedOut = false

  return new Promise(function (resolve, reject) {
    const cp = spawn(phantomJsBinPath, [configString, scriptPath].concat(scriptArgs))
    let stdErr = ''

    cp.stderr.on('data', function (data) {
      stdErr += data
    })

    // kill after timeout
    const killTimeout = setTimeout(function () {
      hasTimedOut = true
      cp.kill('SIGTERM')
    }, timeoutWait)

    cp.on('exit', function (code) {
      if (hasTimedOut || code === 1 || stdErr.indexOf('PhantomJS has crashed') > -1) {
        let errorMsg = 'css-compare-screenshots error'
        if (hasTimedOut) {
          errorMsg += ': PhantomJS process timed out after ' + timeoutWait / 1000 + 's.'
        }
        if (stdErr.length > 0) {
          errorMsg += ': ' + stdErr
        }
        return reject(new Error(errorMsg))
      } else {
        resolve()
      }
      // need to clean up after ourselves; can't rely on that the parent process will be terminated any time soon.
      process.removeListener('SIGTERM', sigtermHandler)
      cp.kill('SIGTERM')
    })

    function exitHandler () {
      cp.kill('SIGTERM')
    }
    function sigtermHandler () {
      cp.kill('SIGTERM')
      process.exit(1)
    }
    process.on('exit', exitHandler)
    process.on('SIGTERM', sigtermHandler)
  })
}
