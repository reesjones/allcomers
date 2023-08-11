# All Comers Result processing

Prototype webapp to convert result spreadsheets to athletic.net format. Result
spreadsheets are from the [Bill Roe All Comers](https://clubnorthwest.org/all-comers)
track meets.

This is part of an overall efficiency effort made necessary by unprecedented
growth in 2023 - by far the largest year ever in its 54-year history.

### Milestones
 * ~~Upload file, basic parse and render in table~~
 * ~~Render "Compiled" table~~
 * ~~Add filters, transforms, ranking, sorting~~
 * Add export function - to XLSX and copy-to-clipboard
 * Add configuration sidebar to allow user to toggle or specify filters/transforms
 * Display unparsable rows for user to validate whether any results are missed
 * Add integration/e2e tests, and more unit tests
 * Add user indication and/or confirmation when Original tab edits overwrite
   Compiled tab edits
 * Add support for racewalk results
 * Host on a website somewhere

### User flow
 * User selects `.xlsx` file
 * Unmodified spreadsheet shown in editing window under "Original" tab.
 * User edits spreadsheet in this tab - fixing typos, specifying missing fields
 * User selects Compiled tab, containing transformed data into Athletic.net upload format
 * User reviews correctness of this tab
 * If correct, click export button or "copy to clipboard"
 * If incorrect, modify either in place in Compiled tab or back in Original tab

### Transform pipeline outline
```
const pipe = new PipelineBuilder()
    .filter(new NoNameFilter())
    .filter(new DNFFilter())
    .filter(new DNSFilter())
    .filter(new NHFilter())
    .filter(new NMFilter())
    .filter(new EmptyMarkFilter())
    .filter(new EventsFilter(new Set([Event.EJoggersMile])))
    .filter(new EventsFilter(RELAY_EVENTS))
    .transform(new AddUnattachedIfEmptyTeamTransformer())
    .rank(new Ranker(lowerIsBetterEvents), RankDirection.ASCENDING)
    .rank(new Ranker(higherIsBetterEvents), RankDirection.DESCENDING)
    .build();
const transformedResults = pipe.run(props.results).map(res => new CompiledResult(res));

const inputResults = getInputResults(); // Type: Array<Result>
const outputResults = p.run(inputResults);
// Render component with outputResults
```

### Data pipeline
```
ArrayBuffer (uploaded xlsx file)
 V parseFile(ArrayBuffer): XLSX workbook
XLSX Workbook, rendered in Original tab
 V Parser.parse(XLSX.workbook): Array<Result>
Original Array<Result>
 V Pipeline.run(Array<Result>): Array<Result>
Transformed Array<Result>
 V .map(result => new CompiledResult(result))
Results wrapped in an athletic.net-specific view
 V Mapping logic
Compiled XLSX Workbook, rendered in Compiled tab
 V Export logic
CSV, XLSX, or raw text output to upload to athletic.net
```

Hosting on site - How to embed react in hugo post:
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
