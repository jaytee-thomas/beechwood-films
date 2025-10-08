import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Library from "./components/Library.jsx";

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Library />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
