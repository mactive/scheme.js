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
  if(s === " " || s === "\n" || s === "\t") {
    this.read()
    return this.skipWS()
  }
}

StringBuffer.prototype.eof = function() {
  return this.position >= this.str.length
}

// (define x (+ 1 2))
// ["(", "define", "x", "(", "+", "1", "2", ")", ")"]
var token = (function (buf) {
  var res = []
  var specialChars = {
    '"': true,
    "'": true,
    "`": true,
    "(": true,
    ")": true,
    " ": true,
    "\n": true,
    "\t": true
  }
})()
