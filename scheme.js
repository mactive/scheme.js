/**
 * @fileOverview A Scheme interpreter in JavaScript
 * @name scheme.js
 * @author hiddenlotus <kaihaosw@gmail.com>
 * @license MIT License
 * @created 2015-12-04
 **/

// TODO make all this a module

// TODO make it a module
var StringBuffer = (function () {
  function StringBuffer(str) {
    this.str = str
    this.position = 0
  }

  StringBuffer.prototype.read = function() {
    this.position++
  }

  StringBuffer.prototype.currentSymbol = function() {
    return this.str.charAt(this.position)
  }

  StringBuffer.prototype.skipWS = function() {
    var s = this.currentSymbol()
    // TODO whiteSpaces    make it in global module
    if(s === " " || s === "\n" || s === "\t") {
      this.read()
      return this.skipWS()
    }
  }

  StringBuffer.prototype.eof = function() {
    return this.position >= this.str.length
  }

  return function(buf) {
    return new StringBuffer(buf)
  }
})()


// TODO check error
// CPS?
function error(buf, msg) {
  return {
    msg: msg,
    content: buf.str,
    position: buf.position
  }
}


var tokenize = (function () {
  var richifyArray = function(array) {
    array.contains = function(elem) {
      return array.indexOf(elem) !== -1
    }
    return array
  }

  var whiteSpaces = [" ", "\n", "\t"]
  var booleans = ["t", "f"]
  richifyArray(whiteSpaces)
  richifyArray(booleans)

  var tokenizeString = function(buf) {
    var res = ""
    while(buf.currentSymbol() !== '"') {
      if(buf.eof()) {
        return error(buf, "Tokenize String Error")
      }
      res += buf.currentSymbol()
      buf.read()
    }
    buf.read()
    return res
  }

  // TODO bug
  // '(a b c) not just whitespace
  var tokenizeQuote = function(buf) {
    var res = ""
    while(!whiteSpaces.contains(buf.currentSymbol())) {
      if(buf.eof()) {
        return res
      }
      res += buf.currentSymbol()
      buf.read()
    }
    return res
  }

  var tokenizeBoolean = function(buf) {
    var res = ""
    var current = buf.currentSymbol()
    if(!booleans.contains(current)) {
      return error(buf, "Tokenize Boolean Error")
    }
    res += current
    buf.read()
    if(buf.eof()) {
      return res
    } else if(!whiteSpaces.contains(buf.currentSymbol())) {
      return error(buf, "Tokenize Boolean Error")
    }
    return res
  }

  var tokenizeSymbol = function(buf) {
    var res = ""
    while(!whiteSpaces.contains(buf.currentSymbol())) {
      if(buf.eof() || buf.currentSymbol() === ")") {
        return res
      }
      res += buf.currentSymbol()
      buf.read()
    }
    buf.read()
    return res
  }

  var parensCorrect = function(tokenResult) {
    var leftParensNum = 0
    var rightParensNum = 0
    for(var i = 0; i < tokenResult.length; i++) {
      if(tokenResult[i] === "(") {
        leftParensNum++
      } else if(tokenResult[i] === ")") {
        rightParensNum++
      }
    }
    return leftParensNum === rightParensNum
  }

  var tokenize = function(buf) {
    var res = []

    while(!buf.eof()) {
      var currentSymbol = buf.currentSymbol()
      if(whiteSpaces.contains(currentSymbol)) {
        buf.skipWS()
      } else if(currentSymbol === '"') {
        buf.read()
        res.push(currentSymbol)
        res.push(tokenizeString(buf))
        res.push(currentSymbol)
      } else if(currentSymbol === "\'") {
        buf.read()
        res.push("quote")
        res.push(tokenizeQuote(buf))
      } else if(currentSymbol === "#") {
        buf.read()
        res.push(currentSymbol)
        res.push(tokenizeBoolean(buf))
      } else if(currentSymbol === "(" || currentSymbol === ")") {
        buf.read()
        res.push(currentSymbol)
      } else {
        res.push(tokenizeSymbol(buf))
      }
    }

    if(!parensCorrect(res)) {
      return error(buf, "Tokenize List Error")
    }
    return res
  }

  return tokenize
})()


var parse = (function () {
  function Listify(array) {
    this.cur = 0
    this.array = array
  }

  Listify.prototype.current = function() {
    return this.array[this.cur]
  }

  Listify.prototype.next = function() {
    this.array[++this.cur]
  }

  Listify.prototype.isEmpty = function() {
    return this.array.length <= this.cur
  }

  Listify.prototype.helper = function() {
    var stack = 0
    var arr = this.array.slice(this.cur)
    var t = new Listify(arr)
    while(!t.isEmpty()) {
      if(t.current() === "(") {
        stack++
        t.next()
      } else if(t.current() === ")") {
        stack--
        t.next()
      } else {
        t.next()
      }
      if(stack === 0) {
        t.cur--
        break
      }
    }
    var p1 = arr.slice(1, t.cur)
    var p2 = arr.slice(t.cur + 1, arr.length)
    return [p1, p2]
  }

  Listify.prototype.relativeList = function() {
    return new Listify(this.helper()[0])
  }

  Listify.prototype.nextRelative = function() {
    return new Listify(this.helper()[1])
  }

  var typeInfo = function(type, value) {
    return {
      type: type,
      value: value
    }
  }

  var isNumber = function(n) {
    return !isNaN(n - 1)
  }

  var parse = function(token, res) {
    var current = token.current()
    if(token.isEmpty()) {
      return res
    } else if(current === '"') {
      token.next()
      var res = res.concat(typeInfo("String", token.current()))
      token.next()
      token.next()
      return parse(token, res)
    } else if(isNumber(current)) {
      var res = res.concat(typeInfo("Number", current))
      token.next()
      return parse(token, res)
    } else if(current === "quote") {
      token.next()
      var res = res.concat(typeInfo("Quote", token.current()))
      token.next()
      return parse(token, res)
    } else if(current === "#") {
      token.next()
      var res = res.concat(typeInfo("Boolean", "#" + token.current()))
      token.next()
      return parse(token, res)
    } else if(current === "(") {
      var subList = token.relativeList()
      var temp = parse(subList, [])
      return parse(token.nextRelative(), res.concat([temp]))
    } else {
      var res = res.concat(typeInfo("Symbol", token.current()))
      token.next()
      return parse(token, res)
    }
  }

  return function(token) {
    var res = parse((new Listify(token)), [])
    if(res.length !== 1) {
      // TODO error
      return -1
    }
    return res[0]
  }
})()


var Env = (function () {
  function Env() {
    this.env = {}
  }

  Env.prototype.add = function(par, val) {
    this.env[par] = val
  }

  Env.prototype.extends = function(pars, vals) {
    if(pars.length !== vals.length) {
      // TODO error
      return -1
    }
    var e = new Env()
    for(var i = 0; i < pars.length; i++) {
      e.add(pars[i], vals[i])
    }
    e.base = this
    return e
  }

  Env.prototype.find = function(par) {
    if(this.env.hasOwnProperty(par)) {
      return this.env[par]
    } else if(this.hasOwnProperty("base")) {
      return this.base.find(par)
    } else {
      // TODO error
      return -1
    }
  }

  return Env
})()


var globalEnv = (function () {
  var globalEnv = new Env()

  function add() {
    return [].reduce.call(arguments, function(a, b) {
      return (+a) + (+b)
    })
  }

  function sub() {
    return [].reduce.call(arguments, function(a, b) {
      return a - b
    })
  }

  function mul() {
    return [].reduce.call(arguments, function(a, b) {
      return a * b
    })
  }

  function div() {
    return [].reduce.call(arguments, function(a, b) {
      return a / b
    })
  }


  globalEnv.add("+", add)
  globalEnv.add("-", sub)
  globalEnv.add("*", mul)
  globalEnv.add("/", div)
  globalEnv.add("<", function(a, b) { return a < b })
  globalEnv.add("<=", function(a, b) { return a <= b })
  globalEnv.add(">", function(a, b) { return a > b })
  globalEnv.add(">=", function(a, b) { return a >= b })
  globalEnv.add("=", function(a, b) { return a === b })

  return globalEnv
})()


var eval = (function () {
  var isSelfEvaluated = function(exp) {
    var t = exp.type
    return (t === "Number") || (t === "String") || (t === "Boolean")
  }

  var isQuoted = function(exp) {
    return exp.type === "Quote"
  }

  var sGeneral = function(exp, key, varType, length) {
    return exp[0].type === "Symbol" && exp[0].value === key
      && (exp[1].type === varType || exp[1][0].type === varType)
      && exp.length === length
  }

  var isAssignment = function(exp) {
    return sGeneral(exp, "set!", "Symbol", 3)
  }

  var assignmentVar = function(exp) {
    return exp[1].value
  }

  var assignmentVal = function(exp) {
    return exp[2]
  }

  var isDefinition = function(exp) {
    return sGeneral(exp, "define", "Symbol", 3)
  }

  var isNormalDefine = function(exp) {
    return Array.isArray(exp[1])
  }

  var definitionVar = function(exp) {
    var t = exp[1]
    if(isNormalDefine(exp)) {
      return t[0].value
    }
    return t.value
  }

  var definitionVal = function(exp) {
    var t = exp[1]
    if(isNormalDefine(exp)) {
      var params = [t.slice(1)]
      params.unshift({type: "Symbol", value: "lambda"})
      params.push(exp[2])
      return params
    }
    return exp[2]
  }

  var isIf = function(exp) {
    return sGeneral(exp, "if", "Boolean", 4)
  }

  var ifCondition = function(exp) {
    return exp[1]
  }

  var ifThen = function(exp) {
    return exp[2]
  }

  var ifElse = function(exp) {
    return exp[3]
  }

  var isLambda = function(exp) {
    return exp.length === 3 && exp[0].value === "lambda"
      && Array.isArray(exp[1]) && Array.isArray(exp[2])
      && exp[1].every(function(elem) { return elem.type === "Symbol" })
  }

  var lambdaVars = function(exp) {
    return exp[1].map(function(elem) { return elem.value })
  }

  var lambdaBody = function(exp) {
    // TODO
    return exp[2]
  }

  var makeLambda = function(vars, body) {
    return {
      type: "Primitive",
      parameters: vars,
      body: body
    }
  }

  var isBegin = function(exp) {
    return exp[0].value === "begin" && exp.length >= 2
  }

  var beginBody = function(exp) {
    return exp.slice(1)
  }

  var isApplication = function(exp) {
    return exp.length >= 2
  }

  var applicationApp = function(exp) {
    return exp[0]
  }

  var applicationVals = function(exp) {
    return exp.slice(1)
  }

  // TODO cond let
  function eval(exp, env) {
    if(isSelfEvaluated(exp)) {
      return exp.value
    } else if(exp.type === "Symbol") {
      return env.find(exp.value)
    } else if(isQuoted(exp)) {
      return exp.value
    } else if(isAssignment(exp)) {
      env.add(assignmentVar(exp), eval(assignmentVal(exp), env))
    } else if(isDefinition(exp)) {
      env.add(definitionVar(exp), eval(definitionVal(exp), env))
    } else if(isIf(exp)) {
      var c = eval(ifCondition(exp), env)
      if(c === "#t") {
        return eval(ifThen(exp), env)
      } else {
        return eval(ifElse(exp), env)
      }
    } else if(isLambda(exp)) {
      return makeLambda(lambdaVars(exp), lambdaBody(exp))
    } else if(isBegin(exp)) {
      var body = beginBody(exp)
      var last = body.pop()
      body.map(function(x) { eval(x, env) })
      return eval(last, env)
    } else if(isApplication(exp)) {
      return apply(eval(applicationApp(exp), env),
                   applicationVals(exp).map(function(exp) { return eval(exp, env) }),
                   env)
    } else {
      // TODO error
      return -10000
    }
  }

  function apply(f, vals, env) {
    if(f.type === "Primitive") {
      var pars = f.parameters
      if(pars.length !== vals.length) {
        // TODO error
        return -11111
      }
      var newEnv = env.extends(pars, vals)
      var body = f.body.map(function(exp) { return exp.value })
      return newEnv.find(body[0]).apply(undefined, body.slice(1).map(function(exp) {
        return newEnv.find(exp)
      }))
    } else {
      return f.apply(undefined, vals)
    }
  }

  return function(exp) {
    return eval(exp, globalEnv)
  }

  // eval(parse(tokenize(StringBuffer('-4'))))
  // eval(parse(tokenize(StringBuffer('"abc  def"'))))
  // eval(parse(tokenize(StringBuffer('#f'))))
  // eval(parse(tokenize(StringBuffer('\'abc'))))

  // // TODO BUG
  // // var s = new StringBuffer("'(1 2 3)")

  // eval(parse(tokenize(StringBuffer('(set! x 10)'))))
  // eval(parse(tokenize(StringBuffer('x'))))

  // eval(parse(tokenize(StringBuffer('(define x 1)'))))
  // eval(parse(tokenize(StringBuffer('(define square (lambda (x) (* x x)))'))))
  // eval(parse(tokenize(StringBuffer('(define (square2 x) (* x x))'))))
  // // parse(tokenize(StringBuffer('(define x (lambda (x) (* x x)))')))
  // /// eval(parse(tokenize(StringBuffer('(if #f 1 2)'))))

  // // parse(tokenize(StringBuffer('(lambda (x) (* x x))')))
  // // eval(parse(tokenize(StringBuffer('(begin (set! y 1) 1 2 "abc" y)'))))

  // var a = parse(tokenize(StringBuffer('((lambda (x) (* x x)) 4)')))
  // var b = parse(tokenize(StringBuffer('(square 4)')))
  // var c = parse(tokenize(StringBuffer('(square2 4)')))
  // var d = parse(tokenize(StringBuffer('(* 10 4)')))
  // var e = parse(tokenize(StringBuffer('(+ 10 2 2)')))
  // var e = parse(tokenize(StringBuffer('(define (fib n) (if (<= n 2) 1 (+ (fib (- n 1)) (fib (- n 2)))))')))
  // var g = parse(tokenize(StringBuffer('(fib 2)')))
})()
