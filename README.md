scheme.js
=========
A Scheme interpreter in JavaScript

scheme.js provides a function: `eval`, which can evaluate a scheme expression.

Example
-------

    eval("(define (square x) (* x x))")
    eval("(map square '(1 2 3))")

    eval("(filter (lambda (x) (< x 5)) '(1 7 8 3 2 9))")
    
    eval("(define (fib n) (if (<= n 2) n (+ (fib (- n 1)) (fib (- n 2)))))")
    eval("(fib 5)")
