!function (path, CleanCSS, util) {
  'use strict';

  const
    number = util.number,
    replaceMultiple = util.regexp.replaceMultiple,
    time = util.time,
    SOURCE_MAP_SUFFIX = '.map';

  module.exports = function (inputs, outputs, options, callback) {
    if (arguments.length === 3) {
      callback = arguments[2];
      options = null;
    }

    options || (options = {});

    if (!options.sourceMappingURL) {
      options.sourceMappingURL = function (filename) {
        return filename;
      };
    } else if (typeof options.sourceMappingURL === 'string') {
      const sourceMappingBaseURL = options.sourceMappingURL;

      options.sourceMappingURL = function (filename) {
        return sourceMappingBaseURL + filename;
      };
    }

    const 
      that = this;

    let
      numFiles = 0,
      numBytesInput = 0,
      numBytesOutput = 0;

    Object.keys(inputs.deleted).forEach(fileName => {
      outputs[fileName] = null;
    });

    Object.keys(inputs.newOrChanged).forEach(fileName => {
      const
        startTime = Date.now(),
        extname = path.extname(fileName),
        input = inputs.newOrChanged[fileName],
        inputLength = input.length;

      if (/\.css$/.test(extname)) {
        let
          cleanResult = new CleanCSS(options).minify(input.toString()),
          output = new Buffer(cleanResult.styles),
          outputLength = output.length;

        outputs[fileName] = output;

        if (cleanResult.sourceMap) {
          outputs[fileName + SOURCE_MAP_SUFFIX] = new Buffer(JSON.stringify(cleanResult.sourceMap));
        }

        numFiles++;
        numBytesInput += inputLength;
        numBytesOutput += outputLength;

        that.log(`Cleaned CSS ${fileName}${cleanResult.sourceMap ? ' with source map' : ''}, took ${time.humanize(Date.now() - startTime)} (${number.bytes(inputLength)} -> ${number.bytes(outputLength)}, ${(((outputLength / inputLength) - 1) * 100).toFixed(1)}%)`);
      } else if (/\.html$/.test(extname)) {
        let
          output = new Buffer(processHTML(input.toString(), options)),
          outputLength = output.length;

        outputs[fileName] = output;

        numFiles++;
        numBytesInput += inputLength;
        numBytesOutput += outputLength;

        that.log(`Cleaned HTML ${fileName}, took ${time.humanize(Date.now() - startTime)} (${number.bytes(inputLength)} -> ${number.bytes(outputLength)}, ${(((outputLength / inputLength) - 1) * 100).toFixed(1)}%)`);
      } else {
        outputs[fileName] = input;
      }
    });

    if (numFiles) {
      that.log(`Total cleaned ${numFiles} file${~-numFiles ? 's' : ''}, (${number.bytes(numBytesInput)} -> ${number.bytes(numBytesOutput)}, ${(((numBytesOutput / numBytesInput) - 1) * 100).toFixed(1)}%)`);
    } else {
      that.log('No files were cleaned');
    }

    callback(null, outputs);
  };

  function isJavaScript(filename) {
    return /\.js$/i.test(filename);
  }

  function processHTML(html, options) {
    return replaceMultiple(
      html,
      [
        [
          /((?:<style [^>]*?type=")(?:text\/css)(?:"[^>]*>))([\s\S]*?)(<\/style>)/gmi,
          function (match0, match1, match2, match3, index, input) {
            return [
              match1,
              new CleanCSS(options).minify(match2).styles,
              match3
            ].join('');
          }
        ]
      ]
    );
  }
}(
  require('path'),
  require('clean-css'),
  require('publishjs').util
);
