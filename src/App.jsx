import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Landing from "./components/Landing.jsx";
import Library from "./components/Library.jsx";
import Player from "./components/Player.jsx";
import AdminPortals from "./components/AdminPortals.jsx";
import useAuth from "./store/useAuth.js";
import useLibraryStore from "./store/useLibraryStore.js";

export default function App() {
  const [search, setSearch] = useState("");
  const refreshSession = useAuth((state) => state.refresh);
  const refreshVideos = useLibraryStore((state) => state.refreshVideos);

  useEffect(() => {
    document.body.classList.remove("bf-railCollapsed");
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  return (
    <>
      <Header search={search} setSearch={setSearch} />
      <AdminPortals />
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/library' element={<Library mode='home' search={search} />} />
        <Route path='/about' element={<Library mode='about' search={search} />} />
        <Route path='/favorites' element={<Library mode='favorites' search={search} />} />
        <Route path='/vids' element={<Library mode='vids' search={search} />} />
        <Route path='/reels' element={<Library mode='reels' search={search} />} />
        <Route path='/watch/:id' element={<Player />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </>
  );
}
