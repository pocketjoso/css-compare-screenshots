'use strict'
import path from 'path'
import { spawn } from 'child_process'

import prepareCss from './prepareCss'

import phantomjs from 'phantomjs-prebuilt'
const phantomJsBinPath = phantomjs.path
const scriptPath = path.join(__dirname, './phantom/script.js')
const configPath = path.join(__dirname, './phantom/config.json')

export default function ({ css, url, width, height, dist, fileName }) {
  let configString = '--config=' + configPath
  let { css: preparedCss, externalFontface, error } = prepareCss(css, url)
  if (error) {
    console.log('prepareCss error', error)
    preparedCss = css
  }

  // TODO: research actual limit for individual args where phantomjs(?) bails (~22000 on this laptop)
  // TODO: how to use const instead of hardcoded 15000 below?
  let cssChunks = preparedCss.match(/[\s\S]{1,15000}/g)
  let scriptArgs = [
    url,
    width,
    height,
    dist,
    fileName,
    externalFontface
  ].concat(cssChunks)

  return new Promise(function (resolve, reject) {
    const cp = spawn(phantomJsBinPath, [configString, scriptPath].concat(scriptArgs))
    let stdErr = ''

    cp.stderr.on('data', function (data) {
      stdErr += data
    })

    cp.on('exit', function (code) {
      if (code === 1 || stdErr.indexOf('PhantomJS has crashed') > -1) {
        let errorMsg = 'Error in generateScreenshots'
        if (stdErr.length > 0) {
          errorMsg += ': ' + stdErr
        }
        reject(new Error(errorMsg))
        return
      } else {
        resolve()
      }
      // need to clean up after ourselves; can't rely on that the parent process will be terminated any time soon.
      process.removeListener('SIGTERM', sigtermHandler)
      cp.kill('SIGTERM')
    })

    function sigtermHandler () {
      cp.kill('SIGTERM')
      process.exit(1)
    }

    process.on('SIGTERM', sigtermHandler)
  })
}
