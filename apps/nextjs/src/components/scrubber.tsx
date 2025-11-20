"use client";

import React from "react";
import { Scrubber } from "react-scrubber";
import ShikiHighlighter from "react-shiki";

import "react-scrubber/lib/scrubber.css";

export const TextReplayScrubberComponent: React.FC = () => {
  const testToReplay = `def fizzbuzz(n):
    for i in range(1, n + 1):
        if i % 3 == 0 and i % 5 == 0:
            print("FizzBuzz")
        elif i % 3 == 0:
            print("Fizz")
        elif i % 5 == 0:
            print("Buzz")
        else:
            print(i)

fizzbuzz(100)

# String concatenation implementation
def fizzbuzz2(n):
    result = []
    for i in range(1, n + 1):
        output = ""
        if i % 3 == 0:
            output += "Fizz"
        if i % 5 == 0:
            output += "Buzz"
        result.append(output if output else str(i))
    
    for item in result:
        print(item)

fizzbuzz2(100)

# Join implementation
def fizzbuzz3(n):
    fizz_buzz_map = {3: "Fizz", 5: "Buzz"}
    
    for i in range(1, n + 1):
        output = "".join(word for divisor, word in fizz_buzz_map.items() if i % divisor == 0)
        print(output or i)

fizzbuzz3(100)`;

  // A list of line numbers and the character added. The line numbers have the line first, followed by the column.
  // If the previous column is one greater than the current, that means that a character was deleted
  const userTranscript = React.useMemo(
    () => [
      { line: 1, col: 0, endLine: 1, endCol: 0, char: "d" },
      { line: 1, col: 1, endLine: 1, endCol: 1, char: "e" },
      { line: 1, col: 2, endLine: 1, endCol: 2, char: "f" },
      { line: 1, col: 3, endLine: 1, endCol: 3, char: " " },
      { line: 1, col: 4, endLine: 1, endCol: 4, char: "f" },
      { line: 1, col: 5, endLine: 1, endCol: 5, char: "i" },
      { line: 1, col: 6, endLine: 1, endCol: 6, char: "t" },
      { line: 1, col: 7, endLine: 1, endCol: 7, char: "t" },
      { line: 1, col: 8, endLine: 1, endCol: 8, char: "i" },
      { line: 1, col: 9, endLine: 1, endCol: 8, char: "" },
      { line: 1, col: 8, endLine: 1, endCol: 7, char: "" },
      { line: 1, col: 7, endLine: 1, endCol: 6, char: "" },
      { line: 1, col: 6, endLine: 1, endCol: 6, char: "z" },
      { line: 1, col: 7, endLine: 1, endCol: 7, char: "z" },
      { line: 1, col: 8, endLine: 1, endCol: 8, char: "b" },
      { line: 1, col: 9, endLine: 1, endCol: 9, char: "u" },
      { line: 1, col: 10, endLine: 1, endCol: 10, char: "z" },
      { line: 1, col: 11, endLine: 1, endCol: 11, char: "z" },
      { line: 1, col: 12, endLine: 1, endCol: 12, char: "(" },
      { line: 1, col: 13, endLine: 1, endCol: 13, char: "n" },
      { line: 1, col: 14, endLine: 1, endCol: 14, char: ")" },
      { line: 1, col: 15, endLine: 1, endCol: 15, char: ":" },
      { line: 2, col: 0, endLine: 2, endCol: 2, char: "  " },
      { line: 2, col: 2, endLine: 2, endCol: 2, char: "f" },
      { line: 2, col: 3, endLine: 2, endCol: 3, char: "o" },
      { line: 2, col: 4, endLine: 2, endCol: 4, char: "r" },
      { line: 2, col: 5, endLine: 2, endCol: 5, char: " " },
      { line: 2, col: 6, endLine: 2, endCol: 6, char: "i" },
      { line: 2, col: 7, endLine: 2, endCol: 7, char: " " },
      { line: 2, col: 8, endLine: 2, endCol: 8, char: "i" },
      { line: 2, col: 9, endLine: 2, endCol: 8, char: "" },
      { line: 2, col: 8, endLine: 2, endCol: 8, char: "=" },
      { line: 2, col: 9, endLine: 2, endCol: 9, char: " " },
      { line: 2, col: 10, endLine: 2, endCol: 10, char: "1" },
      { line: 2, col: 11, endLine: 2, endCol: 11, char: ";" },
      { line: 2, col: 12, endLine: 2, endCol: 12, char: " " },
      { line: 2, col: 13, endLine: 2, endCol: 13, char: "i" },
      { line: 2, col: 14, endLine: 2, endCol: 14, char: " " },
      { line: 2, col: 15, endLine: 2, endCol: 15, char: "<" },
      { line: 2, col: 16, endLine: 2, endCol: 16, char: " " },
      { line: 2, col: 17, endLine: 2, endCol: 17, char: "n" },
      { line: 2, col: 18, endLine: 2, endCol: 18, char: ";" },
      { line: 2, col: 19, endLine: 2, endCol: 19, char: " " },
      { line: 2, col: 20, endLine: 2, endCol: 20, char: "i" },
      { line: 2, col: 21, endLine: 2, endCol: 21, char: "+" },
      { line: 2, col: 22, endLine: 2, endCol: 22, char: "+" },
      // Delete the entire wrong for loop line
      { line: 2, col: 23, endLine: 2, endCol: 22, char: "" },
      { line: 2, col: 22, endLine: 2, endCol: 21, char: "" },
      { line: 2, col: 21, endLine: 2, endCol: 20, char: "" },
      { line: 2, col: 20, endLine: 2, endCol: 19, char: "" },
      { line: 2, col: 19, endLine: 2, endCol: 18, char: "" },
      { line: 2, col: 18, endLine: 2, endCol: 17, char: "" },
      { line: 2, col: 17, endLine: 2, endCol: 16, char: "" },
      { line: 2, col: 16, endLine: 2, endCol: 15, char: "" },
      { line: 2, col: 15, endLine: 2, endCol: 14, char: "" },
      { line: 2, col: 14, endLine: 2, endCol: 13, char: "" },
      { line: 2, col: 13, endLine: 2, endCol: 12, char: "" },
      { line: 2, col: 12, endLine: 2, endCol: 11, char: "" },
      { line: 2, col: 11, endLine: 2, endCol: 10, char: "" },
      { line: 2, col: 10, endLine: 2, endCol: 9, char: "" },
      { line: 2, col: 9, endLine: 2, endCol: 8, char: "" },
      { line: 2, col: 8, endLine: 2, endCol: 7, char: "" },
      { line: 2, col: 7, endLine: 2, endCol: 6, char: "" },
      { line: 2, col: 6, endLine: 2, endCol: 5, char: "" },
      { line: 2, col: 5, endLine: 2, endCol: 4, char: "" },
      { line: 2, col: 4, endLine: 2, endCol: 3, char: "" },
      { line: 2, col: 3, endLine: 2, endCol: 2, char: "" },
      // Rewrite the for loop correctly
      { line: 2, col: 2, endLine: 2, endCol: 2, char: "f" },
      { line: 2, col: 3, endLine: 2, endCol: 3, char: "o" },
      { line: 2, col: 4, endLine: 2, endCol: 4, char: "r" },
      { line: 2, col: 5, endLine: 2, endCol: 5, char: " " },
      { line: 2, col: 6, endLine: 2, endCol: 6, char: "i" },
      { line: 2, col: 7, endLine: 2, endCol: 7, char: " " },
      { line: 2, col: 8, endLine: 2, endCol: 8, char: "i" },
      { line: 2, col: 9, endLine: 2, endCol: 9, char: "n" },
      { line: 2, col: 10, endLine: 2, endCol: 10, char: " " },
      { line: 2, col: 11, endLine: 2, endCol: 11, char: "r" },
      { line: 2, col: 12, endLine: 2, endCol: 12, char: "a" },
      { line: 2, col: 13, endLine: 2, endCol: 13, char: "n" },
      { line: 2, col: 14, endLine: 2, endCol: 14, char: "g" },
      { line: 2, col: 15, endLine: 2, endCol: 15, char: "e" },
      { line: 2, col: 16, endLine: 2, endCol: 16, char: "(" },
      { line: 2, col: 17, endLine: 2, endCol: 17, char: "1" },
      { line: 2, col: 18, endLine: 2, endCol: 18, char: "," },
      { line: 2, col: 19, endLine: 2, endCol: 19, char: " " },
      { line: 2, col: 20, endLine: 2, endCol: 20, char: "n" },
      { line: 2, col: 21, endLine: 2, endCol: 21, char: " " },
      { line: 2, col: 22, endLine: 2, endCol: 22, char: "+" },
      { line: 2, col: 23, endLine: 2, endCol: 23, char: "1" },
      { line: 2, col: 24, endLine: 2, endCol: 24, char: ")" },
      { line: 2, col: 25, endLine: 2, endCol: 25, char: ":" },
      { line: 3, col: 0, endLine: 3, endCol: 0, char: " " },
      { line: 3, col: 1, endLine: 3, endCol: 1, char: " " },
      { line: 3, col: 2, endLine: 3, endCol: 2, char: " " },
      { line: 3, col: 3, endLine: 3, endCol: 3, char: " " },
      { line: 3, col: 4, endLine: 3, endCol: 4, char: "i" },
      { line: 3, col: 5, endLine: 3, endCol: 5, char: "f" },
      { line: 2, col: 23, endLine: 2, endCol: 23, char: " " },
      { line: 3, col: 6, endLine: 3, endCol: 6, char: " " },
      { line: 3, col: 7, endLine: 3, endCol: 7, char: "i" },
      { line: 3, col: 8, endLine: 3, endCol: 8, char: " " },
      { line: 3, col: 9, endLine: 3, endCol: 9, char: "%" },
      { line: 3, col: 10, endLine: 3, endCol: 10, char: " " },
      { line: 3, col: 11, endLine: 3, endCol: 11, char: "3" },
      { line: 3, col: 12, endLine: 3, endCol: 12, char: " " },
      { line: 3, col: 13, endLine: 3, endCol: 13, char: "=" },
      { line: 3, col: 14, endLine: 3, endCol: 14, char: "=" },
      { line: 3, col: 15, endLine: 3, endCol: 15, char: " " },
      { line: 3, col: 16, endLine: 3, endCol: 16, char: "0" },
      { line: 3, col: 17, endLine: 3, endCol: 17, char: " " },
      { line: 3, col: 18, endLine: 3, endCol: 18, char: "a" },
      { line: 3, col: 19, endLine: 3, endCol: 19, char: "n" },
      { line: 3, col: 20, endLine: 3, endCol: 20, char: "d" },
      { line: 3, col: 21, endLine: 3, endCol: 21, char: " " },
      { line: 3, col: 22, endLine: 3, endCol: 22, char: "i" },
      { line: 3, col: 23, endLine: 3, endCol: 23, char: " " },
      { line: 3, col: 24, endLine: 3, endCol: 24, char: "%" },
      { line: 3, col: 25, endLine: 3, endCol: 25, char: " " },
      { line: 3, col: 26, endLine: 3, endCol: 26, char: "5" },
      { line: 3, col: 27, endLine: 3, endCol: 27, char: " " },
      { line: 3, col: 28, endLine: 3, endCol: 28, char: "=" },
      { line: 3, col: 29, endLine: 3, endCol: 29, char: "=" },
      { line: 3, col: 30, endLine: 3, endCol: 30, char: " " },
      { line: 3, col: 31, endLine: 3, endCol: 31, char: "0" },
      { line: 3, col: 32, endLine: 3, endCol: 32, char: ":" },
      { line: 4, col: 0, endLine: 4, endCol: 0, char: " " },
      { line: 4, col: 1, endLine: 4, endCol: 1, char: " " },
      { line: 4, col: 2, endLine: 4, endCol: 2, char: " " },
      { line: 4, col: 3, endLine: 4, endCol: 3, char: " " },
      { line: 4, col: 4, endLine: 4, endCol: 4, char: " " },
      { line: 4, col: 5, endLine: 4, endCol: 5, char: " " },
      { line: 4, col: 6, endLine: 4, endCol: 6, char: " " },
      { line: 4, col: 7, endLine: 4, endCol: 7, char: " " },
      { line: 4, col: 8, endLine: 4, endCol: 8, char: "p" },
      { line: 4, col: 9, endLine: 4, endCol: 9, char: "r" },
      { line: 4, col: 10, endLine: 4, endCol: 10, char: "i" },
      { line: 4, col: 11, endLine: 4, endCol: 11, char: "n" },
      { line: 4, col: 12, endLine: 4, endCol: 12, char: "t" },
      { line: 4, col: 13, endLine: 4, endCol: 13, char: "(" },
      { line: 4, col: 14, endLine: 4, endCol: 14, char: '"' },
      { line: 4, col: 15, endLine: 4, endCol: 15, char: "F" },
      { line: 4, col: 16, endLine: 4, endCol: 16, char: "i" },
      { line: 4, col: 17, endLine: 4, endCol: 17, char: "z" },
      { line: 4, col: 18, endLine: 4, endCol: 18, char: "z" },
      { line: 4, col: 19, endLine: 4, endCol: 23, char: "Buzz" },
      { line: 4, col: 23, endLine: 4, endCol: 24, char: '"' },
      { line: 4, col: 24, endLine: 4, endCol: 25, char: ")" },
      { line: 5, col: 0, endLine: 5, endCol: 0, char: " " },
      { line: 5, col: 1, endLine: 5, endCol: 1, char: " " },
      { line: 5, col: 2, endLine: 5, endCol: 2, char: " " },
      { line: 5, col: 3, endLine: 5, endCol: 3, char: " " },
      { line: 5, col: 4, endLine: 5, endCol: 4, char: "e" },
      { line: 5, col: 5, endLine: 5, endCol: 5, char: "l" },
      { line: 5, col: 6, endLine: 5, endCol: 6, char: "i" },
      { line: 5, col: 7, endLine: 5, endCol: 7, char: "f" },
      { line: 5, col: 8, endLine: 5, endCol: 8, char: " " },
      { line: 5, col: 9, endLine: 5, endCol: 9, char: "i" },
      { line: 5, col: 10, endLine: 5, endCol: 10, char: " " },
      { line: 5, col: 11, endLine: 5, endCol: 11, char: "%" },
      { line: 5, col: 12, endLine: 5, endCol: 12, char: " " },
      { line: 5, col: 13, endLine: 5, endCol: 13, char: "3" },
      { line: 5, col: 14, endLine: 5, endCol: 14, char: " " },
      { line: 5, col: 15, endLine: 5, endCol: 15, char: "=" },
      { line: 5, col: 16, endLine: 5, endCol: 16, char: "=" },
      { line: 5, col: 17, endLine: 5, endCol: 17, char: " " },
      { line: 5, col: 18, endLine: 5, endCol: 18, char: "0" },
      { line: 5, col: 19, endLine: 5, endCol: 19, char: ":" },
      { line: 6, col: 0, endLine: 6, endCol: 0, char: " " },
      { line: 6, col: 1, endLine: 6, endCol: 1, char: " " },
      { line: 6, col: 2, endLine: 6, endCol: 2, char: " " },
      { line: 6, col: 3, endLine: 6, endCol: 3, char: " " },
      { line: 6, col: 4, endLine: 6, endCol: 4, char: " " },
      { line: 6, col: 5, endLine: 6, endCol: 5, char: " " },
      { line: 6, col: 6, endLine: 6, endCol: 6, char: " " },
      { line: 6, col: 7, endLine: 6, endCol: 7, char: " " },
      { line: 6, col: 8, endLine: 6, endCol: 8, char: "p" },
      { line: 6, col: 9, endLine: 6, endCol: 9, char: "r" },
      { line: 6, col: 10, endLine: 6, endCol: 10, char: "n" },
      { line: 6, col: 11, endLine: 6, endCol: 10, char: "" },
      { line: 6, col: 10, endLine: 6, endCol: 10, char: "i" },
      { line: 6, col: 11, endLine: 6, endCol: 11, char: "n" },
      { line: 6, col: 12, endLine: 6, endCol: 12, char: "t" },
      { line: 6, col: 13, endLine: 6, endCol: 13, char: "(" },
      { line: 6, col: 14, endLine: 6, endCol: 14, char: '"' },
      { line: 6, col: 15, endLine: 6, endCol: 15, char: "F" },
      { line: 6, col: 16, endLine: 6, endCol: 16, char: "i" },
      { line: 6, col: 17, endLine: 6, endCol: 17, char: "z" },
      { line: 6, col: 18, endLine: 6, endCol: 18, char: "z" },
      { line: 6, col: 19, endLine: 6, endCol: 19, char: '"' },
      { line: 6, col: 20, endLine: 6, endCol: 20, char: ")" },
      { line: 7, col: 0, endLine: 7, endCol: 0, char: " " },
      { line: 7, col: 1, endLine: 7, endCol: 1, char: " " },
      { line: 7, col: 2, endLine: 7, endCol: 2, char: " " },
      { line: 7, col: 3, endLine: 7, endCol: 3, char: " " },
      { line: 7, col: 4, endLine: 7, endCol: 4, char: "e" },
      { line: 7, col: 5, endLine: 7, endCol: 5, char: "l" },
      { line: 7, col: 6, endLine: 7, endCol: 6, char: "i" },
      { line: 7, col: 7, endLine: 7, endCol: 7, char: "f" },
      { line: 7, col: 8, endLine: 7, endCol: 8, char: " " },
      { line: 7, col: 9, endLine: 7, endCol: 9, char: "i" },
      { line: 7, col: 10, endLine: 7, endCol: 10, char: " " },
      { line: 7, col: 11, endLine: 7, endCol: 11, char: "%" },
      { line: 7, col: 12, endLine: 7, endCol: 12, char: " " },
      { line: 7, col: 13, endLine: 7, endCol: 13, char: "5" },
      { line: 7, col: 14, endLine: 7, endCol: 14, char: " " },
      { line: 7, col: 15, endLine: 7, endCol: 15, char: "=" },
      { line: 7, col: 16, endLine: 7, endCol: 16, char: "=" },
      { line: 7, col: 17, endLine: 7, endCol: 17, char: " " },
      { line: 7, col: 18, endLine: 7, endCol: 18, char: "0" },
      { line: 7, col: 19, endLine: 7, endCol: 19, char: ":" },
      { line: 8, col: 0, endLine: 8, endCol: 0, char: " " },
      { line: 8, col: 1, endLine: 8, endCol: 1, char: " " },
      { line: 8, col: 2, endLine: 8, endCol: 2, char: " " },
      { line: 8, col: 3, endLine: 8, endCol: 3, char: " " },
      { line: 8, col: 4, endLine: 8, endCol: 4, char: " " },
      { line: 8, col: 5, endLine: 8, endCol: 5, char: " " },
      { line: 8, col: 6, endLine: 8, endCol: 6, char: " " },
      { line: 8, col: 7, endLine: 8, endCol: 7, char: " " },
      { line: 8, col: 8, endLine: 8, endCol: 8, char: "p" },
      { line: 8, col: 9, endLine: 8, endCol: 9, char: "r" },
      { line: 8, col: 10, endLine: 8, endCol: 10, char: "i" },
      { line: 8, col: 11, endLine: 8, endCol: 11, char: "n" },
      { line: 8, col: 12, endLine: 8, endCol: 12, char: "t" },
      { line: 8, col: 13, endLine: 8, endCol: 13, char: "(" },
      { line: 8, col: 14, endLine: 8, endCol: 14, char: '"' },
      { line: 8, col: 15, endLine: 8, endCol: 19, char: "Buzz" },
      { line: 8, col: 19, endLine: 8, endCol: 20, char: '"' },
      { line: 8, col: 20, endLine: 8, endCol: 21, char: ")" },
      { line: 9, col: 0, endLine: 9, endCol: 0, char: " " },
      { line: 9, col: 1, endLine: 9, endCol: 1, char: " " },
      { line: 9, col: 2, endLine: 9, endCol: 2, char: " " },
      { line: 9, col: 3, endLine: 9, endCol: 3, char: " " },
      { line: 9, col: 4, endLine: 9, endCol: 4, char: "e" },
      { line: 9, col: 5, endLine: 9, endCol: 5, char: "l" },
      { line: 9, col: 6, endLine: 9, endCol: 6, char: "s" },
      { line: 9, col: 7, endLine: 9, endCol: 7, char: "e" },
      { line: 9, col: 8, endLine: 9, endCol: 8, char: ":" },
      { line: 10, col: 0, endLine: 10, endCol: 0, char: " " },
      { line: 10, col: 1, endLine: 10, endCol: 1, char: " " },
      { line: 10, col: 2, endLine: 10, endCol: 2, char: " " },
      { line: 10, col: 3, endLine: 10, endCol: 3, char: " " },
      { line: 10, col: 4, endLine: 10, endCol: 4, char: " " },
      { line: 10, col: 5, endLine: 10, endCol: 5, char: " " },
      { line: 10, col: 6, endLine: 10, endCol: 6, char: " " },
      { line: 10, col: 7, endLine: 10, endCol: 7, char: " " },
      { line: 10, col: 8, endLine: 10, endCol: 8, char: "p" },
      { line: 10, col: 9, endLine: 10, endCol: 9, char: "r" },
      { line: 10, col: 10, endLine: 10, endCol: 10, char: "i" },
      { line: 10, col: 11, endLine: 10, endCol: 11, char: "n" },
      { line: 10, col: 12, endLine: 10, endCol: 12, char: "t" },
      { line: 10, col: 13, endLine: 10, endCol: 13, char: "(" },
      { line: 10, col: 14, endLine: 10, endCol: 14, char: "i" },
      { line: 10, col: 15, endLine: 10, endCol: 15, char: ")" },
      { line: 11, col: 0, endLine: 11, endCol: 0, char: "\n" },
      { line: 12, col: 0, endLine: 12, endCol: 0, char: "f" },
      { line: 12, col: 1, endLine: 12, endCol: 1, char: "i" },
      { line: 12, col: 2, endLine: 12, endCol: 2, char: "z" },
      { line: 12, col: 3, endLine: 12, endCol: 3, char: "z" },
      { line: 12, col: 4, endLine: 12, endCol: 8, char: "Buzz" },
      { line: 12, col: 8, endLine: 12, endCol: 9, char: "(" },
      { line: 12, col: 9, endLine: 12, endCol: 10, char: "1" },
      { line: 12, col: 10, endLine: 12, endCol: 11, char: "0" },
      { line: 12, col: 11, endLine: 12, endCol: 12, char: "0" },
      { line: 12, col: 12, endLine: 12, endCol: 13, char: ")" },
    ],
    [],
  );

  const SNAP_RELEASE_THRESHOLD = 0.5; // when released within this distance, snap to marker
  const STICK_THRESHOLD = 0.5; // while dragging, within this distance the cursor will "stick"
  const STICK_HYSTERESIS = 1.0; // distance to leave a stick once engaged

  const markers = [30.7, 70.4];

  const markerPositions = markers.map((m) => ({
    start: m - 0.3,
    end: m + 0.3,
  }));

  const [state, setState] = React.useState<{
    value: number;
    state: string;
    isScrubbing?: boolean;
    stickingTo?: number | null;
  }>({
    value: 50,
    state: "None",
    isScrubbing: false,
    stickingTo: null,
  });

  const nearestMarker = (
    v: number,
  ): { marker: number; distance: number } | null => {
    if (markers.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let nearest = markers[0]!;
    let best = Math.abs(v - nearest);
    for (let i = 1; i < markers.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const marker = markers[i]!;
      const d = Math.abs(v - marker);
      if (d < best) {
        best = d;
        nearest = marker;
      }
    }
    return { marker: nearest, distance: best };
  };

  const handleScrubStart = (value: number) => {
    setState((s) => ({ ...s, value, state: "Scrub Start", isScrubbing: true }));
  };

  const handleScrubEnd = (value: number) => {
    // On release, if within SNAP_RELEASE_THRESHOLD of a marker, snap to it.
    const found = nearestMarker(value);
    if (found && found.distance <= SNAP_RELEASE_THRESHOLD) {
      const markerValue = found.marker;
      setState((s) => ({
        ...s,
        value: markerValue,
        state: "Scrub End",
        isScrubbing: false,
        stickingTo: null,
      }));
    } else {
      setState((s) => ({
        ...s,
        value,
        state: "Scrub End",
        isScrubbing: false,
        stickingTo: null,
      }));
    }
  };

  const handleScrubChange = (value: number) => {
    // While scrubbing, if close enough to a marker, "stick" to it.
    setState((s) => {
      if (!s.isScrubbing) {
        return { ...s, value, state: "Scrub Change" };
      }

      const found = nearestMarker(value);
      // If currently sticking to a marker, only release if we moved beyond hysteresis
      if (s.stickingTo != null) {
        const dist = Math.abs(value - s.stickingTo);
        if (dist <= STICK_HYSTERESIS) {
          // Keep sticking
          return { ...s, value: s.stickingTo, state: "Scrub Change" };
        } else {
          // Leave stick
          return { ...s, value, state: "Scrub Change", stickingTo: null };
        }
      }

      if (found && found.distance <= STICK_THRESHOLD) {
        // Engage stick
        return {
          ...s,
          value: found.marker,
          state: "Scrub Change",
          stickingTo: found.marker,
        };
      }

      return { ...s, value, state: "Scrub Change" };
    });
  };

  // Original character-based scrubbing (simple version)
  const charCount = Math.round((state.value / 100) * testToReplay.length);
  const displayedTextSimple = testToReplay.slice(0, charCount);

  // Calculate how many actions to replay based on scrubber position
  const totalActions = userTranscript.length;
  const actionsToReplay = Math.round((state.value / 100) * totalActions);

  // Build the text progressively by replaying actions
  const displayedOutputText = React.useMemo(() => {
    // Initialize with empty lines
    const lines: string[] = [""];

    for (let i = 0; i < actionsToReplay; i++) {
      const action = userTranscript[i];
      if (!action) continue;

      // Ensure we have enough lines
      while (lines.length < action.line) {
        lines.push("");
      }

      const lineIndex = action.line - 1; // Convert to 0-indexed
      const currentLine = lines[lineIndex] ?? "";

      if (action.endCol < action.col) {
        // Deletion: remove character(s)
        const charsToDelete = action.col - action.endCol;
        lines[lineIndex] =
          currentLine.slice(0, action.endCol) +
          currentLine.slice(action.endCol + charsToDelete);
      } else {
        // Insertion: add character(s) at position
        lines[lineIndex] =
          currentLine.slice(0, action.col) +
          action.char +
          currentLine.slice(action.col);
      }
    }

    return lines.join("\n");
  }, [actionsToReplay, userTranscript]);

  // Choose which display mode to use
  // Set to true to use action-based replay, false to use simple character scrubbing
  const useActionBasedReplay = Boolean(true);
  const displayedText = useActionBasedReplay
    ? displayedOutputText
    : displayedTextSimple;

  return (
    <div className="h-max w-full space-y-4">
      <div className="flex h-[75vh] flex-col-reverse overflow-y-auto rounded-md">
        <ShikiHighlighter
          language="python"
          className="w-full grow [&>pre]:h-full"
          theme={{
            light: "github-light",
            dark: "github-dark",
          }}
          defaultColor="light-dark()"
          showLineNumbers={true}
          showLanguage={true}
        >
          {displayedText}
        </ShikiHighlighter>
      </div>

      <div className="h-8">
        <Scrubber
          min={0}
          max={100}
          value={state.value}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          onScrubChange={handleScrubChange}
          markers={markerPositions}
          className="[&_.bar]:h-4!"
        />
      </div>

      <div className="text-md mt-4 flex gap-8 text-center text-gray-300">
        <p>Position: {state.value.toFixed(1)}</p>
        <p>
          Remaining Characters: {charCount}/{testToReplay.length}
        </p>
      </div>
    </div>
  );
};
