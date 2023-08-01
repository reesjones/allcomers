// @flow
'use client'
import React from 'react';
import {useState} from "react";

export function Counter(props: {initial: number}): React$Element<any> {
  const [count, setCount] = useState(props.initial);
  const inc = () => { setCount(count + 1); };
  const dec = () => { setCount(count - 1); };
  return (
    <div>
      <button onClick={dec}>-</button>
      <span> {count} </span>
      <button onClick={inc}>+</button>
    </div>
  );
}

export function CounterStateless(props: {count: number, setCount: (number) => void}): React$Element<any> {
  const inc = () => { props.setCount(props.count + 1); };
  const dec = () => { props.setCount(props.count - 1); };
  return (
    <div>
      <button onClick={dec}>-</button>
      <span> {props.count} </span>
      <button onClick={inc}>+</button>
    </div>
  );
}
