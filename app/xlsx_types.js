// @flow

/**
 * Partial (prototype-quality) flow typing for xlsx parsing library
 */

/**
 * The Excel data type for a cell.
 * b Boolean, n Number, e error, s String, d Date, z Stub
 */
export type ExcelDataType_t = 'b' | 'n' | 'e' | 's' | 'd' | 'z';

/** Comment element */
export interface Comment_t {
    /** Author of the comment block */
    a?: string;

    /** Plaintext of the comment */
    t: string;

    /** If true, mark the comment as a part of a thread */
    T?: boolean;
}

/** Cell comments */
export interface Comments_t extends Array<Comment_t> {
    /** Hide comment by default */
    hidden?: boolean;
}

/** Number Format (either a string or an index to the format table) */
export type NumberFormat_t = string | number;

/** Link object */
export interface Hyperlink_t {
    /** Target of the link (HREF) */
    Target: string;

    /** Plaintext tooltip to display when mouse is over cell */
    Tooltip?: string;
}

/** Worksheet Cell Object */
export interface CellObject_t {
    /** The raw value of the cell.  Can be omitted if a formula is specified */
    v: string;

    /** Formatted text (if applicable) */
    w?: string;

    /**
     * The Excel Data Type of the cell.
     * b Boolean, n Number, e Error, s String, d Date, z Empty
     */
    t: ExcelDataType_t;

    /** Cell formula (if applicable) */
    f?: string;

    /** Range of enclosing array if formula is array formula (if applicable) */
    F?: string;

    /** Rich text encoding (if applicable) */
    r?: any;

    /** HTML rendering of the rich text (if applicable) */
    h?: string;

    /** Comments associated with the cell */
    c?: Comments_t;

    /** Number format string associated with the cell (if requested) */
    z?: NumberFormat_t;

    /** Cell hyperlink object (.Target holds link, .tooltip is tooltip) */
    l?: Hyperlink_t;

    /** The style/theme of the cell (if applicable) */
    s?: any;
}

export type Workbook_t = {
    /**
     * A dictionary of the worksheets in the workbook.
     * Use SheetNames to reference these.
     */
    Sheets: {[string]: Worksheet_t};

    /** Ordered list of the sheet names in the workbook */
    SheetNames: Array<string>;

    /** Standard workbook Properties */
    Props?: FullProperties_t;

    /** Custom workbook Properties */
    Custprops?: any;

    Workbook?: WBProps_t;

    vbaraw?: any;
};

export type Worksheet_t = Array<Array<CellObject_t>>;

/** Basic File Properties */
export interface Properties_t {
    /** Summary tab "Title" */
    Title?: string;
    /** Summary tab "Subject" */
    Subject?: string;
    /** Summary tab "Author" */
    Author?: string;
    /** Summary tab "Manager" */
    Manager?: string;
    /** Summary tab "Company" */
    Company?: string;
    /** Summary tab "Category" */
    Category?: string;
    /** Summary tab "Keywords" */
    Keywords?: string;
    /** Summary tab "Comments" */
    Comments?: string;
    /** Statistics tab "Last saved by" */
    LastAuthor?: string;
    /** Statistics tab "Created" */
    CreatedDate?: Date;
}

/** Other supported properties */
export interface FullProperties_t extends Properties_t {
    ModifiedDate?: Date;
    Application?: string;
    AppVersion?: string;
    DocSecurity?: string;
    HyperlinksChanged?: boolean;
    SharedDoc?: boolean;
    LinksUpToDate?: boolean;
    ScaleCrop?: boolean;
    Worksheets?: number;
    SheetNames?: string[];
    ContentStatus?: string;
    LastPrinted?: string;
    Revision?: string | number;
    Version?: string;
    Identifier?: string;
    Language?: string;
};

/** Workbook-Level Attributes */
export type WBProps_t = any;