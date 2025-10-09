import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Library from "./components/Library.jsx";
import Player from "./components/Player.jsx";

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Library />} />
      <Route path='/watch/:id' element={<Player />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
