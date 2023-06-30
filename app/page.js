'use client'
const XLSX = require('xlsx');

export default function Home() {
  const onChange = async e => {
    const fileHandle = e.target.files[0];
    console.log(fileHandle);
    const data = await fileHandle.arrayBuffer();
    console.log(data);
    const wb = XLSX.read(data);
    console.log(wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <input type='file' onChange={onChange} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
    </main>
  )
}