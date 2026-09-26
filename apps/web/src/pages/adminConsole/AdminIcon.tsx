import React from 'react';

/** The Admin console's icon set, path for path from `ShiftOS Admin.dc.html` (const P). */
const P = {
  store: [['path', { d: 'M4 9.5 6 4h12l2 5.5' }], ['rect', { x: 4, y: 9.5, width: 16, height: 11, rx: 2.5 }], ['path', { d: 'M9.5 20.5v-6h5v6' }]],
  users: [['circle', { cx: 9, cy: 8, r: 3.2 }], ['path', { d: 'M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6' }], ['path', { d: 'M16.4 14.6c2.6.4 4.6 2.5 4.6 5.4' }]],
  building: [['rect', { x: 4, y: 3, width: 16, height: 18, rx: 3 }], ['path', { d: 'M4 9h16M12 9v12' }]],
  card: [['rect', { x: 2.5, y: 5, width: 19, height: 14, rx: 3 }], ['path', { d: 'M2.5 10h19' }]],
  bell: [['path', { d: 'M12 3.6c-3 0-4.7 2.3-4.7 5.3v3l-1.6 2.7h12.6L16.7 12v-3c0-3-1.7-5.4-4.7-5.4z' }], ['path', { d: 'M10 18.4a2 2 0 0 0 4 0' }]],
  overview: [
    ['rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 2 }],
    ['rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 2 }],
    ['rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 2 }],
    ['rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 2 }]
  ],
  gear: [
    ['circle', { cx: 12, cy: 12, r: 3 }],
    [
      'path',
      {
        d: 'M19 12a7 7 0 0 0-.15-1.45l1.85-1.4-1.5-2.6-2.2.75a7 7 0 0 0-2.5-1.45L14 3.5h-4l-.5 2.35a7 7 0 0 0-2.5 1.45l-2.2-.75-1.5 2.6 1.85 1.4A7 7 0 0 0 5 12c0 .5.05.98.15 1.45l-1.85 1.4 1.5 2.6 2.2-.75a7 7 0 0 0 2.5 1.45L10 20.5h4l.5-2.35a7 7 0 0 0 2.5-1.45l2.2.75 1.5-2.6-1.85-1.4c.1-.47.15-.95.15-1.45z'
      }
    ]
  ],
  lock: [['rect', { x: 5, y: 11, width: 14, height: 9, rx: 2.4 }], ['path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7' }]],
  x: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 8.2 }], ['path', { d: 'M12 7.5V12l3 2' }]],
  checkCircle: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M8.3 12.3l2.6 2.6 4.8-5.4' }]],
  user: [['circle', { cx: 12, cy: 8.5, r: 3.4 }], ['path', { d: 'M5.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2' }]],
  calendar: [['rect', { x: 3.5, y: 4.5, width: 17, height: 16, rx: 2.6 }], ['path', { d: 'M3.5 9.5h17M8 3v3M16 3v3' }]]
} as const;

export type AdminIconName = keyof typeof P;

export function AdminIcon({ name, size = 18 }: { name: AdminIconName; size?: number }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="block">
      {P[name].map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
