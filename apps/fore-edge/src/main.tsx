import { mountApp } from '@x10/shared/runtime';
import { Bookmark, BookOpen, CalendarRange, FileText, Info, MessageSquareText } from 'lucide-react';

import { App } from './App';
import { config } from './app.config';
import './index.css';

const icons = [
  <BookOpen key="book" />,
  <Bookmark key="bm" />,
  <MessageSquareText key="margin" />,
  <CalendarRange key="plan" />,
  <FileText key="pack" />,
  <Info key="about" />,
];

const nav = config.nav.map((item, idx) => ({
  ...item,
  icon: icons[idx],
}));

mountApp({ ...config, nav }, <App />);
