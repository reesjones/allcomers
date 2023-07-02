# All Comers Result processing

Webapp to convert result spreadsheets to athletic.net format. Result spreadsheets
are from the [Bill Roe All Comers](https://clubnorthwest.org/all-comers) track meets.

This is part of an overall efficiency effort made necessary by unprecedented
growth in 2023 - by far the largest year ever in its 54-year history.

Rough steps
 * User selects xlsx file
 * Extract XLSX data into unmodified data model (`Array<Result>`), display on left
 * Run data model thru configured pipeline 
 * Display output on right, show export/download button
 * Show relevant pipeline steps as configurations above viz

Design
 * Event (enum): All tracked events (100m, mile, pole vault, ...)
 * Result (data class): Represents one result achieved by one athlete
    * first/last name
    * event
    * mark
    * gender
    * Sub-classes for event-specific result fields. Subclass must override getScore()
    * TrackResult getScore(): returns `toInt(mark)`. JoggerMile getScore() returns score (filled in by tfrm)
    * Set of division fields (gender, implement size, hurdle height)
 * Transformer: Transforms a row. Adds a field, changes a field value.
    * Normalize implements ("4kg" -> "4 kg"), team name, etc.
    * Team affiliation - "" -> "Unattached"
    * Ensure 2 decimal places for FAT time-based marks
    * Add difference field for jogger's mile
    * Add blanks or default values for relevant athletic.net cols
    * Add rank field
 * Sorter: Sorts rows and adds 1-based rank field. Has asc/desc bit. Applied to specified events
    * TimeSorter for track events scored by a time. Ascending
    * MeterSorter for long/triple/high, discus, shot, javelin. Descending
    * ImperialSorter for pole vaule. Descending
    * Sorter asserts `all(results, r -> r.getScore() != null)`
 * Filter: Removes a row based on field values. Has include/exclude bit
    * DNF/NM filter
    * Relay filter
 * Pipeline: applies sequence of filters and transformers and emits results
    * Emit item-wise or in batches
    * An ordered map specifies output cols -> field name for the value
 * PipelineBuilder: Builds a pipeline (it's somewhat complex)
 * ResultParser: Parses input results into Array<Result>
    * GoogleSheetsResultParser: Given an xlsx parser, converts to Array<Result>.
      Adds event field and event-specific fields.
 * Presenter: Converts Array<Result> into custom output format
    * CsvPresenter: Converts to csv file, separator can be specified (default `,` but use tab for Brent)
        * AthleticNetPresenter: Converts to Athletic.net format
    * StringPresenter: Output is a string
        * Not implemented in this project
    * ArrayBufferPresenter: Output is an ArrayBuffer
        * Not implemented in this project

Pipeline code outline:
```
const p = PipelineBuilder()
    .filter(new DNFFilter())
    .filter(new RelayFilter())
    .transform(new NormalizeMarksTransformer())
    .transform(new FillUnattachedTransformer())
    .transform(new FatTimeMarkFormatTransformer())
    .transform(new JoggersMileScoreTransformer())
    .transform(new BlankAthleticNetFieldsTransformer())
    .sort(TimeSorter([Event.e100, Event.e200, Event.e400, ...]), "Place", Direction.ASC)
    .sort(JoggersMileSorter())
    .sort(MeterSorter([Event.LJ, Event.TJ, Event.Shotput, ...]), "Place", Direction.DESC)
    .sort(ImperialSorter(Event.PoleVault), "Place", Direction.DESC)
    .build();

const inres = getInputResults(); // Type: Array<Result>
// Render component with inres
const outres = p.run(inres);
// Render component with outres
```

React architecture
 * Root maintains original parsed XLSX file, and the pipeline (starts with
   default specified above). Converted file is not part of state - entirely
   derived from the first two
 * Need a high quality table component with filtering and cell editing abilities


Notes
 * Add ‘ to result to ensure 2 decimal places for athletic.net validation (hand timed)
 * Exclude DNS/DNF
 * Google sheets can’t do durations
 * Separate divisions/rankings per implement size in discus, shot, jav
 * Fill in unattached if team not listed. Athlete can claim team later if needed
 * TBD: how to handle the nonbinary division
 * Shotput: impl weight may be “4kg” or “4 kg” when parsing
 * Relay results not in athletic. Names aren’t usually official. Ppl can request if needed
 * Division is “open” except for hurdles, throws, which is hurdle height, impl weight
 * Finals or blank for round
 * Athletic upload: copy all the cols A->P (til last name), paste into csv box. Shows color coded preview with cols to do visual verification
 * Copy in excel seemed to use tabs as delim
 * Consider batching the contents to multiple csv files?
 * Forgot to ask - how does Brent count # entries?

(for later) How to embed react in hugo post:
https://josem.co/how-to-render-a-react-component-in-hugo

--------

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
