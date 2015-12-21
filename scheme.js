/**
 * @fileOverview A Scheme interpreter in JavaScript
 * @name scheme.js
 * @author hiddenlotus <kaihaosw@gmail.com>
 * @license MIT License
 * @created 2015-12-04
 **/

// TODO make all this a module
var symbols = {
  Symbol: "Symbol",
  Number: "Number",
  String: "String",
  Boolean: "Boolean",
  Quote: "Quote",
  Primitive: "Primitive",
  Procedure: "Procedure",
  whiteSpaces: {
    " ": true,
    "\n": true,
    "\t": true
  },
  booleanSymbols: {
    "t": true,
    "f": true
  }
}


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
    if(s in symbols.whiteSpaces) {
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
    while(!(buf.currentSymbol() in symbols.whiteSpaces)) {
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
    if(!(current in symbols.booleanSymbols)) {
      return error(buf, "Tokenize Boolean Error")
    }
    res += current
    buf.read()
    if(buf.eof()) {
      return res
    } else if(!(buf.currentSymbol() in symbols.whiteSpaces)) {
      return error(buf, "Tokenize Boolean Error")
    }
    return res
  }

  var tokenizeSymbol = function(buf) {
    var res = ""
    while(!(buf.currentSymbol() in symbols.whiteSpaces)) {
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
      if(currentSymbol in symbols.whiteSpaces) {
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
      var res = res.concat(typeInfo(symbols.String, token.current()))
      token.next()
      token.next()
      return parse(token, res)
    } else if(isNumber(current)) {
      var res = res.concat(typeInfo(symbols.Number, current))
      token.next()
      return parse(token, res)
    } else if(current === "quote") {
      token.next()
      var res = res.concat(typeInfo(symbols.Quote, token.current()))
      token.next()
      return parse(token, res)
    } else if(current === "#") {
      token.next()
      var res = res.concat(typeInfo(symbols.Boolean, "#" + token.current()))
      token.next()
      return parse(token, res)
    } else if(current === "(") {
      var subList = token.relativeList()
      var temp = parse(subList, [])
      return parse(token.nextRelative(), res.concat([temp]))
    } else {
      var res = res.concat(typeInfo(symbols.Symbol, token.current()))
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

  function makePrimitive(f) {
    return {
      type: symbols.Primitive,
      value: f
    }
  }

  // TODO string to number
  function add() {
    return [].reduce.call(arguments, function(a, b) {
      return a + b
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


  globalEnv.add("+", makePrimitive(add))
  globalEnv.add("-", makePrimitive(sub))
  globalEnv.add("*", makePrimitive(mul))
  globalEnv.add("/", makePrimitive(div))
  globalEnv.add("<", makePrimitive(function(a, b) { return a < b }))
  globalEnv.add("<=", makePrimitive(function(a, b) { return a <= b }))
  globalEnv.add(">", makePrimitive(function(a, b) { return a > b }))
  globalEnv.add(">=", makePrimitive(function(a, b) { return a >= b }))
  globalEnv.add("=", makePrimitive(function(a, b) { return a === b }))
  // #t
  // #f
  // car
  // cdr
  // cons
  // null?

  return globalEnv
})()


var eval = (function () {
  var isNumber = function(exp) {
    return exp.type === symbols.Number
  }

  var isString = function(exp) {
    return exp.type === symbols.String
  }

  var isBoolean = function(exp) {
    return exp.type === symbols.Boolean
  }

  var isVar = function(exp) {
    return exp.type === symbols.Symbol
  }

  var isQuoted = function(exp) {
    return exp.type === symbols.Quote
  }

  var sGeneral = function(exp, key, length) {
    return exp[0].type === symbols.Symbol && exp[0].value === key
      && exp.length === length
  }

  var isAssignment = function(exp) {
    return sGeneral(exp, "set!", 3)
  }

  var assignmentVar = function(exp) {
    return exp[1].value
  }

  var assignmentVal = function(exp) {
    return exp[2]
  }

  var evalAssignment = function(exp, env) {
    return env.add(assignmentVar(exp), eval(assignmentVal(exp), env))
  }

  var isDefinition = function(exp) {
    return sGeneral(exp, "define", 3)
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
      params.unshift({type: symbols.Symbol, value: "lambda"})
      params.push(exp[2])
      return params
    }
    return exp[2]
  }

  var evalDefinition = function(exp, env) {
    return env.add(definitionVar(exp), eval(definitionVal(exp), env))
  }

  var isIf = function(exp) {
    return sGeneral(exp, "if", 4)
  }

  var ifCondition = function(exp) {
    return exp[1]
  }

  var ifTrue = function(exp) {
    return exp === true
  }

  var ifThen = function(exp) {
    return exp[2]
  }

  var ifElse = function(exp) {
    return exp[3]
  }

  var evalIf = function(exp, env) {
    if(ifTrue(eval(ifCondition(exp), env))) {
      return eval(ifThen(exp), env)
    } else {
      return eval(ifElse(exp), env)
    }
  }

  var isLambda = function(exp) {
    return exp.length === 3 && exp[0].value === "lambda"
      && Array.isArray(exp[1]) && Array.isArray(exp[2])
      && exp[1].every(function(elem) { return elem.type === symbols.Symbol })
  }

  var lambdaVars = function(exp) {
    return exp[1].map(function(elem) { return elem.value })
  }

  var lambdaBody = function(exp) {
    return exp.slice(2)
  }

  var makeProcedure = function(pars, body, env) {
    return {
      type: symbols.Procedure,
      parameters: pars,
      body: body,
      env: env
    }
  }

  var isCompoundProcedure = function(exp) {
    return exp.type === symbols.Procedure
  }

  var compoundProcedurePars = function(exp) {
    return exp.parameters
  }

  var compoundProcedureBody = function(exp) {
    return exp.body
  }

  var compoundProcedureEnv = function(exp) {
    return exp.env
  }

  var isBegin = function(exp) {
    return exp[0].value === "begin" && exp.length >= 2
  }

  var beginBody = function(exp) {
    return exp.slice(1)
  }

  var evalSequence = function(body, env) {
    var lastIndex = body.length - 1
    body.slice(0, lastIndex).map(function(x) { eval(x, env) })
    return eval(body[lastIndex], env)
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

  var isPrimitive = function(exp) {
    return exp.type === symbols.Primitive
  }

  var primitiveValue = function(exp) {
    return exp.value
  }

  var listOfValues = function(exps, env) {
    return exps.map(function(exp) { return eval(exp, env) })
  }

  // TODO cond let
  function eval(exp, env) {
    if(isNumber(exp)) {
      return +(exp.value)
    } else if(isString(exp)) {
      return exp.value
    } else if(isBoolean(exp)) {
      if(exp.value === "#t") {
        return true
      }
      return false
    } else if(isVar(exp)) {
      return env.find(exp.value)
    } else if(isQuoted(exp)) {
      return exp.value
    } else if(isAssignment(exp)) {
      return evalAssignment(exp, env)
    } else if(isDefinition(exp)) {
      return evalDefinition(exp, env)
    } else if(isIf(exp)) {
      return evalIf(exp, env)
    } else if(isLambda(exp)) {
      return makeProcedure(lambdaVars(exp), lambdaBody(exp), env)
    } else if(isBegin(exp)) {
      return evalSequence(beginBody(exp), env)
    } else if(isApplication(exp)) {
      return apply(eval(applicationApp(exp), env),
                   listOfValues(applicationVals(exp), env))
    } else {
      // TODO error
      return -10000
    }
  }

  function apply(procedure, vals) {
    if(isPrimitive(procedure)) {
      return primitiveValue(procedure).apply(undefined, vals)
    } else if(isCompoundProcedure(procedure)) {
      var pars = compoundProcedurePars(procedure)
      if(pars.length !== vals.length) {
        return -11111111111
      }
      var body = compoundProcedureBody(procedure)
      var newEnv = compoundProcedureEnv(procedure).extends(pars, vals)
      return evalSequence(body, newEnv)
    } else {
      return -11111
    }
  }

  return function(exp) {
    return eval(exp, globalEnv)
  }
})()


// var a = eval(parse(tokenize(StringBuffer('-4'))))
// var b = eval(parse(tokenize(StringBuffer('"abc  def"'))))
// var c = eval(parse(tokenize(StringBuffer('#f'))))
// var d = eval(parse(tokenize(StringBuffer('\'abc'))))

// TODO BUG
// var s = new StringBuffer("'(1 2 3)")

// eval(parse(tokenize(StringBuffer('(set! x 10)'))))
// eval(parse(tokenize(StringBuffer('x'))))

// eval(parse(tokenize(StringBuffer('(define x 1)'))))
// eval(parse(tokenize(StringBuffer('(define square (lambda (x) (* x x)))'))))
// eval(parse(tokenize(StringBuffer('(define (square2 x) (* x x))'))))
// eval(parse(tokenize(StringBuffer('(define x (lambda (x) (* x x)))'))))
// var a = parse(tokenize(StringBuffer('(if #t 1 2)')))
// var b = parse(tokenize(StringBuffer('(if (<= 1 2) (+ 1 2) (* 1 2))')))

// parse(tokenize(StringBuffer('(lambda (x) (* x x))')))
// eval(parse(tokenize(StringBuffer('(begin (set! y 1) 1 2 (+ 1 2 3) "abc" (* 1 2))'))))

// var a = parse(tokenize(StringBuffer('((lambda (x) (* x x)) 4)')))
// var b = eval(parse(tokenize(StringBuffer('(square 4)'))))
// var c = parse(tokenize(StringBuffer('(square2 4)')))
// var d = parse(tokenize(StringBuffer('(* 10 4)')))
// var e = parse(tokenize(StringBuffer('(+ 10 2 2)')))

// var e = parse(tokenize(StringBuffer('(define (fib n) (if (<= n 2) 1 (+ (fib (- n 1)) (fib (- n 2)))))')))
// eval(e)
// var g = parse(tokenize(StringBuffer('(fib 10)')))

// var a = parse(tokenize(StringBuffer('(define (test n) (if (= n 1) n (test (- n 1))))')))
// var b = parse(tokenize(StringBuffer('(test 1)')))
// var c = parse(tokenize(StringBuffer('(define test2 (lambda (n) (if (= n 1) 1 (test2 (- n 1)))))')))

// eval(parse(tokenize(StringBuffer('(define (x n) (if (<= 3 2) (+ 1 2) (* 1 2)))'))))
// var b = parse(tokenize(StringBuffer('(x 4)')))
