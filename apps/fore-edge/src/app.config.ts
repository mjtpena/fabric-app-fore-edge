/**
 * App configuration. No React imports here: tools/seed-fabric.mjs loads this file in Node to export seed rows.
 */
import type { Persona } from '@x10/shared/identity';
import type { AppConfig } from '@x10/shared/runtime';

import { defs, type Schema } from './model';
import { seed } from './seed';

export const personas: Persona[] = [
  { sub: 'demo-convenor', name: 'Clara Okafor', email: 'clara@example.com', isAdmin: true, role: 'Convenor' },
  { sub: 'demo-ahead', name: 'Henrik Solberg', email: 'henrik@example.com', isAdmin: false, role: 'Reader' },
  { sub: 'demo-onpace', name: 'Priya Nair', email: 'priya@example.com', isAdmin: false, role: 'Reader' },
  { sub: 'demo-behind', name: 'Tomasz Zielinski', email: 'tomasz@example.com', isAdmin: false, role: 'Reader' },
  { sub: 'demo-paused', name: 'Nadia Benali', email: 'nadia@example.com', isAdmin: false, role: 'Reader' },
  { sub: 'demo-farbehind', name: 'Owen Gallagher', email: 'owen@example.com', isAdmin: false, role: 'Reader' },
];

export const config: AppConfig<Schema> = {
  appId: 'fore-edge',
  title: 'Fore-Edge',
  tagline: 'Reading & study circle',
  accent: 'quill',
  logoPaths: [
    'M4 5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5h-13C4.7 20 4 19.3 4 18.5v-13Z',
    'M7 8h10M7 11h10M7 14h10M7 17h6',
    'M15 4v9l2-1.5L19 13V4',
  ],
  defs,
  personas,
  seed,
  nav: [
    { to: '/', label: 'Fore-Edge', end: true },
    { to: '/bookmark', label: 'Bookmark' },
    { to: '/margin', label: 'Margin' },
    { to: '/plan', label: 'Reading plan' },
    { to: '/pack', label: 'Meeting pack' },
    { to: '/about', label: 'About' },
  ],
};
