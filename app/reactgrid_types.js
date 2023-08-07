// @flow
import React from 'react';

/**
 * Partial (prototype-quality) flow typing for reactgrid library
 */

/**
 * `Id` is a common type to identify many ReactGrids objects
 *
 * @see https://reactgrid.com/docs/3.1/7-api/1-types/4-id/
 */
export type Id_t = number | string;

/**
 * `CellChange` type is used by `onCellsChanged`. It represents mutually exclusive changes on a single cell.
 *
 * @see https://reactgrid.com/docs/3.1/7-api/1-types/2-cell-change/
 */
export type CellChange_t<TCell> = {
    /** Row's `Id` where the change ocurred */
    rowId: Id_t;
    /** Column's `Id` where the change ocurred */
    columnId: Id_t;
    /** Extracted cell type of `TCell` (e.g. `text`, `chevron` and so on) */
    type: TCell['type'];
    /** Previous content of the cell */
    previousCell: TCell;
    /** New content of the cell */
    newCell: TCell;
};

/**
 * This interface styles single cells border
 *
 * @see https://reactgrid.com/docs/3.1/7-api/0-interfaces/7-cell-style/
 */
export interface BorderProps_t {
    /** Color of border - e.g. `#eee`/`red` */
    color?: string;
    /** Style of border - e.g. `dotted`/`solid` */
    style?: string;
    /** Width of border - e.g. `2px` */
    width?: string;
}

/**
 * This interface styles single cell and prevents passing unwanted CSS properties that could break down grid rendering
 *
 * @see https://reactgrid.com/docs/3.1/7-api/0-interfaces/7-cell-style/
 */
export interface CellStyle_t {
    /** CSS `color` property */
    color?: string;
    /** CSS `background` property */
    background?: string;
    /** CSS `overflow` property */
    overflow?: string;
    /** CSS `padding-left` property */
    paddingLeft?: string;
    /** Object that contains all cell's borders properties */
    border?: {
        left?: BorderProps_t;
        top?: BorderProps_t;
        right?: BorderProps_t;
        bottom?: BorderProps_t;
    };
}

/**
 * A base for built-in cell types (e.g. `HeaderCell`) and your own
 *
 * @see https://reactgrid.com/docs/3.1/7-api/0-interfaces/4-cell/
 */
export interface Cell_t {
    /** Name of cell type, must be unique */
    type: string;
    /** Marks cell as non editable (by default: `false`) */
    nonEditable?: boolean;
    /** `Id` of group to which this cell belongs to */
    groupId?: Id_t;
    /** Allowed style properties contained in `CellStyle` interface */
    style?: CellStyle_t;
    /** Additional CSS classes */
    className?: string;
}

export interface TextCell_t extends Cell_t {
    text: string;
    placeholder?: string;
    validator?: (text: string) => boolean;
    renderer?: (text: string) => React$Element<any>;
    errorMessage?: string;
}