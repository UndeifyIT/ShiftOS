import React from 'react';

/** The handoff's own stroke icons (`ShiftOS Dashboards.dc.html` ICONS) used on the schedule screen, so glyph shapes match exactly. */
const ICONS = {
  activity: [['path', { d: 'M3 12h4l2.5-6 4 12 2.5-6h5' }]],
  checkCircle: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M8.2 12.4l2.8 2.8 5-5.6' }]],
  users: [['circle', { cx: 9, cy: 8, r: 3.2 }], ['path', { d: 'M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6' }], ['path', { d: 'M16.4 14.6c2.6.4 4.6 2.5 4.6 5.4' }]],
  clipboard: [['rect', { x: 5.5, y: 4, width: 13, height: 17, rx: 3 }], ['path', { d: 'M9 4V2.8h6V4M9 11h6M9 15h4' }]],
  user: [['circle', { cx: 12, cy: 8, r: 3.4 }], ['path', { d: 'M5 20c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2' }]],
  calendar: [['rect', { x: 3, y: 4, width: 18, height: 17, rx: 3 }], ['path', { d: 'M8 2v4M16 2v4M3 10h18' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M12 7v5.3l3.8 2.2' }]],
  monitor: [['rect', { x: 3, y: 4, width: 18, height: 12, rx: 2.5 }], ['path', { d: 'M9 20h6M12 16v4' }]],
  gear: [['circle', { cx: 12, cy: 12, r: 3.2 }], ['path', { d: 'M12 3v2.4M12 18.6V21M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2' }]],
  x: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6' }]],
  minus: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M8.4 12h7.2' }]],
  megaphone: [['path', { d: 'M4 10.5v3l10 4.5V6z' }], ['path', { d: 'M14 9h3a3 3 0 0 1 0 6h-3' }]],
  upload: [['path', { d: 'M12 16V4M7.5 8.5 12 4l4.5 4.5' }], ['path', { d: 'M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16' }]],
  download: [['path', { d: 'M12 4v12M7.5 11.5 12 16l4.5-4.5' }], ['path', { d: 'M4 18.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5' }]],
  mail: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }], ['path', { d: 'M3.6 6.5 12 13l8.4-6.5' }]],
  file: [['path', { d: 'M6 3.5h7L18.5 9v11.5H6z' }], ['path', { d: 'M13 3.5V9h5.5' }]],
  shield: [['path', { d: 'M12 3l7.5 3v6c0 4.3-3.1 7.6-7.5 9-4.4-1.4-7.5-4.7-7.5-9V6z' }]],
  info: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M12 11v5M12 8h.01' }]],
  headset: [
    ['path', { d: 'M4 15v-3a8 8 0 0 1 16 0v3' }],
    ['rect', { x: 2.5, y: 14, width: 4, height: 6, rx: 2 }],
    ['rect', { x: 17.5, y: 14, width: 4, height: 6, rx: 2 }]
  ],
  eye: [['path', { d: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z' }], ['circle', { cx: 12, cy: 12, r: 2.8 }]],
  edit: [['path', { d: 'M4 20h4L20 8l-4-4L4 16z' }]],
  trash: [
    ['path', { d: 'M4.5 6.6h15' }],
    ['path', { d: 'M9.6 6.6V4.9h4.8v1.7' }],
    ['path', { d: 'M6.7 6.6l.85 13.1a1.6 1.6 0 0 0 1.6 1.5h5.7a1.6 1.6 0 0 0 1.6-1.5l.85-13.1' }],
    ['path', { d: 'M10.4 10.4v7M13.6 10.4v7' }]
  ],
  phone: [['path', { d: 'M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z' }]],
  lock: [['rect', { x: 4.5, y: 10, width: 15, height: 10.5, rx: 3 }], ['path', { d: 'M8 10V7.5a4 4 0 0 1 8 0V10' }]],
  alert: [['path', { d: 'M12 4.4 21 20H3z' }], ['path', { d: 'M12 10v4M12 17h.01' }]],
  x: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6' }]],
  minus: [['circle', { cx: 12, cy: 12, r: 8.6 }], ['path', { d: 'M8.4 12h7.2' }]],
  bulb: [['path', { d: 'M9 17h6M10 21h4' }], ['path', { d: 'M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z' }]],
  sliders: [['path', { d: 'M4 7.5h16M4 16.5h16' }], ['circle', { cx: 9, cy: 7.5, r: 2.4 }], ['circle', { cx: 15, cy: 16.5, r: 2.4 }]],
  refresh: [['path', { d: 'M20 12a8 8 0 1 1-2.6-5.9' }], ['path', { d: 'M20 4v4h-4' }]],
  search: [['circle', { cx: 11, cy: 11, r: 6.4 }], ['path', { d: 'M15.8 15.8 20.5 20.5' }]],
  coffee: [
    ['path', { d: 'M4.5 7h12v5.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z' }],
    ['path', { d: 'M16.5 8.5h2a2.5 2.5 0 0 1 0 5h-2' }],
    ['path', { d: 'M4 20.5h13' }]
  ]
} as const;

export type ScheduleIconName = keyof typeof ICONS;

export function ScheduleIcon({ name, size = 17, strokeWidth = 1.85 }: { name: ScheduleIconName; size?: number; strokeWidth?: number }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {ICONS[name].map(([tag, attrs], index) => React.createElement(tag, { key: index, ...attrs }))}
    </svg>
  );
}
