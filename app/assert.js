// @flow

export default function assert(condition: boolean, message: string = "Assertion failed") {
  if (!condition) throw new Error(message)
}