// @flow
import type {CellObject_t} from './xlsx_types';

export function assert(
  condition: boolean,
  message: string = "Assertion failed",
) {
  if (!condition) throw new Error(message);
}

// Allocates and returns new CellObject
export function emptyCell(): CellObject_t {
  return {'t': 's', 'v': '', 'r': '', 'h': '', 'w': ''};
}

// Allocates and returns new row (array) of CellObjects with specified width
export function emptyRow(width: number): () => Array<CellObject_t> {
  const fn = () => {
    const arr = new Array<any>(width);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = emptyCell();
    }
    return arr;
  }
  return fn;
}

/**
 * Fills any null indices less than paddedSize of `arr` with objects T generated
 * by `filler` function. If paddedSize null, does not pad the end of the array
 */
export function fillEmpty<T>(arr: Array<T>, filler: () => T, paddedSize?: number): Array<T> {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null) {
      arr[i] = filler();
    }
  }
  if (paddedSize != null) {
    // TODO check memory safety here (assuming auto array resizing)
    for (let i = arr.length; i < paddedSize; i++) {
      arr[i] = filler();
    }
  }
  return arr;
}

export function camelize(str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return "";
    return index === 0 ? match.toUpperCase() : match.toLowerCase();
  });
}

/**
 * VSCode syntax highlighting breaks past instances of casting enums to strings.
 * Keep this at the bottom to avoid highlighting issues
 */
export function str(f: any): string {
  return f == null  ? "" : (f: string);
}