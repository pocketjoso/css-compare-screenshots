'use strict'
import path from 'path'
import { spawn } from 'child_process'

import prepareCss from './prepareCss'

import phantomjs from 'phantomjs'
const phantomJsBinPath = phantomjs.path
const scriptPath = path.join(__dirname, './lib/phantom/script.js')
const configPath = path.join(__dirname, './lib/phantom/config.json')

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

  console.log(scriptArgs)

  return new Promise(function (resolve, reject) {
    const cp = spawn(phantomJsBinPath, [configString, scriptPath].concat(scriptArgs))

    // for testing
    let stdOut = ''
    let stdErr = ''
    cp.stdout.on('data', function (data) {
      stdOut += data
    })

    cp.stderr.on('data', function (data) {
      stdErr += data
    })

    cp.on('exit', function (code) {
      if (code === 1 || stdErr.includes('PhantomJS has crashed')) {
        let errorMsg = 'Error in generateScreenshots'
        if (stdErr.length > 0) {
          errorMsg += ': ' + stdErr
        }
        reject(new Error(errorMsg))
        return
      }
      resolve()
    })

    process.on('SIGTERM', function () {
      cp.kill('SIGTERM')
      process.exit(1)
    })
  })
}
