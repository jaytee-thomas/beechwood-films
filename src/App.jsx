import { Routes, Route } from "react-router-dom";
import Library from "./components/Library.jsx";
import Favorites from "./components/Favorites.jsx"; // ← add this

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Library />} />
      <Route path='/favorites' element={<Favorites />} /> {/* ← add this */}
    </Routes>
  );
}
