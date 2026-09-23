const PATHS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  expenses: 'M4 4h16v2H4zm0 5h16v2H4zm0 5h10v2H4zm0 5h10v2H4zm13-3h2v-2h2v2h-2v2h-2z',
  budgets: 'M12 2a10 10 0 1 0 10 10h-10V2zm2 0v8h8a8 8 0 0 0-8-8z',
  reports: 'M5 21V10h3v11H5zm5.5 0V3h3v18h-3zM16 21v-7h3v7h-3z',
  categories: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 3.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  edit: 'M4 17.25V20h2.75L17.8 8.94l-2.75-2.75L4 17.25zm15.7-10.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.2 1.2 2.75 2.75 1.36-1.04z',
  trash: 'M9 3h6l1 1h4v2H4V4h4l1-1zm-3 5h12l-1 13H7L6 8z',
  logout: 'M10 17l1.4-1.4L8.8 13H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5zM4 5h7V3H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h7v-2H4V5z',
  chevronLeft: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z',
  chevronRight: 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z',
  download: 'M5 20h14v-2H5v2zm7-2 5.5-5.5-1.4-1.4-3.1 3.1V4h-2v10.2l-3.1-3.1-1.4 1.4L12 18z',
  filter: 'M3 5h18v2l-7 7v6l-4-2v-4L3 7V5z',
  close: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z',
  wallet: 'M3 6a2 2 0 0 1 2-2h13v3h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zm2 0v1h11V6H5zm11 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z',
  copy: 'M8 3h11a2 2 0 0 1 2 2v11h-2V5H8V3zM4 7h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
