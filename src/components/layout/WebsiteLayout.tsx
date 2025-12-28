import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';

export default function WebsiteLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WebsiteNavbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

