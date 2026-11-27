import { Route, Routes } from 'react-router-dom';

import { AboutPage } from './pages/AboutPage';
import { BookmarkPage } from './pages/BookmarkPage';
import { HomePage } from './pages/HomePage';
import { MarginPage } from './pages/MarginPage';
import { MeetingPackPage } from './pages/MeetingPackPage';
import { ReadingPlanPage } from './pages/ReadingPlanPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bookmark" element={<BookmarkPage />} />
      <Route path="/margin" element={<MarginPage />} />
      <Route path="/plan" element={<ReadingPlanPage />} />
      <Route path="/pack" element={<MeetingPackPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );
}
