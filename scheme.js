/**
 * @fileOverview A Scheme interpreter in JavaScript
 * @name scheme.js
 * @author hiddenlotus <kaihaosw@gmail.com>
 * @license MIT License
 * @created 2015-12-04
 **/

// TODO make all this a module

// TODO make it a module
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

  var whiteSpaces = [" ", "\n", "t"]
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

  // var s = new StringBuffer('"a b cd   "')
  // var s = new StringBuffer('\'abce  \'defabc "bcdef" "abc d" #t #f ')
  // var s = new StringBuffer('#t #ff #t')
  // var s = new StringBuffer('\'abcdef \'abce')
  // var s = new StringBuffer('(define x (+ 1 2))')
  // var s = new StringBuffer('(define x (lambda (x) (* x x)))')
  // var s = new StringBuffer('(define x \'("abc" \'a #t #t 1 "abc"))')
  // var s = new StringBuffer('(define x \'("abc" \'a #t #t 1 "abc))')
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

  Listify.prototype.listHelper = function() {
    last = this.array.lastIndexOf(")")
    return [new Listify(this.array.slice(1, last)), new Listify(this.array.slice(last + 1))]
  }

  Listify.prototype.relativeList = function() {
    return this.listHelper()[0]
  }

  Listify.prototype.nextList = function() {
    return this.listHelper()[1]
  }

  Listify.prototype.hasSubList = function() {
    return this.array.slice(1, this.array.length-1).indexOf("(") !== -1
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
      var res = res.concat(typeInfo("Boolean", token.current()))
      token.next()
      return parse(token, res)
    } else if(current === "(") {
      var subList = token.relativeList()
      var temp = parse(subList, [])
      res.push(temp)
      return parse(token.nextList(), res)
    } else {
      var res = res.concat(typeInfo("Symbol", token.current()))
      token.next()
      return parse(token, res)
    }
  }

  return function(token) {
    return parse((new Listify(token)), [])
  }

  // var s1 = new StringBuffer('(define x 1)')
  // var s2 = new StringBuffer('(define x (+ x 2))')
  // var s3 = new StringBuffer('(define x (+ (+ 1 2) (+ 3 4)))')
  // var s4 = new StringBuffer('((lambda x 4) 3)')
  // var b1 = tokenize(s1)
  // var b2 = tokenize(s2)
  // var b3 = tokenize(s3)
  // var b4 = tokenize(s4)

  // var s = new StringBuffer('(define a (+ 1 2))')
  // var b = tokenize(s)

})()
