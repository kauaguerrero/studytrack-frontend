"use client";

import React, { useState, useEffect } from 'react';

export default function TestPage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Hello World");

  useEffect(() => {
    console.log("Test component mounted");
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>Count: {count}</p>
      <p>Message: {message}</p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Increment
      </button>
    </div>
  );
}
