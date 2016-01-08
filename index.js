var exists = require('101/exists')
var isObject = require('101/is-object')

var isOptionalKey = require('./lib/is-optional-key.js')
var isSpreadKey = require('./lib/is-spread-key.js')
var validate = require('./lib/validate.js')

module.exports = assertArgs

function assertArgs (args, validation) {
  if (typeof args !== 'object' || !exists(args.length)) {
    throw new TypeError('"args" must be an array or array-like object (arguments)')
  }
  if (!isObject(validation)) { // strict object
    throw new TypeError('"validation" must be an object')
  }

  // copy args
  var argsLeft = Array.prototype.slice.call(args)
  var firstOptionalErr
  var ret = {}
  var argKeys = Object.keys(validation)
  var outKey

  if (argKeys.filter(isSpreadKey).length > 1) {
    throw new Error('assert-args only supports a single spread argument')
  }

  argKeys.forEach(function (key, i) {
    var spreadArgs
    var validator = validation[key]
    var arg = argsLeft[0]

    if (isSpreadKey(key)) {
      if (isOptionalKey(key)) {
        outKey = key.slice(4, -1)
        ret[outKey] = []
        // console.log('argsLeft.length', argsLeft.length)
        // console.log('argKeys.length', argKeys.length)
        // console.log('numArgKeysLeft', argKeys.length - 1 - i)
        // console.log('numArgToSlice', argsLeft.length - (argKeys.length - 1 - i))

        spreadArgs = (argKeys.length - i - 1) === 0 // last arg key
          ? argsLeft.slice()
          : argsLeft.slice(0, argsLeft.length - (argKeys.length - 1 - i))

        spreadArgs.forEach(function (arg) {
          if (!exists(arg)) {
            // non-existant args pass as optional args
            firstOptionalErr = null
            argsLeft.shift() // pass, remains [...]
            return
          }
          try {
            validate(key.slice(1, -1), arg, validator, true)
            // optional arg passes validator
            firstOptionalErr = null
            ret[outKey].push(arg) // pass
            argsLeft.shift()
          } catch (err) {
            if (firstOptionalErr && argsLeft.length > 1) {
              // optional err was thrown before and this is not the last arg
              throw firstOptionalErr
            }
            throw err
          }
        })
      } else { // isRequiredKey
        outKey = key.slice(3)
        ret[outKey] = []
        // console.log('argsLeft.length', argsLeft.length)
        // console.log('argKeys.length', argKeys.length)
        // console.log('numArgKeysLeft', (argKeys.length - 1 - i))
        // console.log('numArgToSlice', argsLeft.length - (argKeys.length - 1 - i))

        spreadArgs = (argKeys.length - i - 1) === 0 // last arg key
          ? argsLeft.slice()
          : argsLeft.slice(0, argsLeft.length - (argKeys.length - 1 - i))

        if (spreadArgs.length === 0) {
          // missing trailing required arg, fail
          throw new TypeError('"' + key + '" is required')
        }

        spreadArgs.forEach(function (arg) {
          try {
            validate(key, arg, validator, true)
            firstOptionalErr = null
            ret[outKey].push(arg) // pass
            argsLeft.shift()
          } catch (err) {
            if (firstOptionalErr && argsLeft.length > 1) {
              // optional err was thrown before and this is not the last arg
              throw firstOptionalErr
            }
            throw err
          }
        })
      }
      return
    } else if (isOptionalKey(key)) {
      key = key.slice(1, -1)

      if (argsLeft.length === 0) {
        // missing trailing optional arg, pass
        ret[key] = undefined
        return
      } else if (!exists(arg)) {
        // non-existant args pass as optional args
        firstOptionalErr = null
        ret[key] = argsLeft.shift() // pass
        return
      }

      try {
        validate(key, arg, validator)
        // optional arg passes validator
        firstOptionalErr = null
        ret[key] = argsLeft.shift()
        return
      } catch (err) {
        // optional arg failed validator
        // * set as undefined and pass for now
        // * save the error in case there are no more required args
        firstOptionalErr = firstOptionalErr || err
        ret[key] = undefined
        return
      }
    } else { // isRequiredKey
      if (argsLeft.length === 0) {
        // missing trailing required arg, fail
        throw new TypeError('"' + key + '" is required')
      }
      try {
        validate(key, arg, validator)
        // required arg passes validator, pass
        firstOptionalErr = null
        ret[key] = argsLeft.shift()
      } catch (err) {
        if (firstOptionalErr && argsLeft.length > 1) {
          // optional err was thrown before and this is not the last arg
          throw firstOptionalErr
        }
        throw err
      }
      return
    }
  })

  if (firstOptionalErr) {
    throw firstOptionalErr
  }

  return ret
}
