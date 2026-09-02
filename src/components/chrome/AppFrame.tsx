import type { ReactNode } from 'react';

/**
 * The upright column the whole app sits in.
 *
 * Extracted from AppShell so the public routes get it too. They render outside
 * AppShell, so while this wrapper lived inside it they were the one part of the
 * app with no portrait column - the splash and signup screens stretched on a
 * wide window while every screen behind them did not.
 *
 * The column itself is `.app-root` in styles/index.css; see the note there for
 * why the cap is an aspect rather than a pixel count.
 */
export default function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-frame">
      <div className="app-root bg-app-bg flex flex-col">
        {children}
      </div>
    </div>
  );
}
