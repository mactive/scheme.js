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
  Array.prototype.contains = Array.prototype.contains || function(elem) {
    return this.indexOf(elem) !== -1
  }

  var whiteSpaces = [" ", "\n", "t"]

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
    var booleans = ["t", "f"]
    var current = buf.currentSymbol()
    if(!booleans.contains(current)) {
      return error(buf, "Tokenize Boolean Error")
    }
    res += current
    buf.read()
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
