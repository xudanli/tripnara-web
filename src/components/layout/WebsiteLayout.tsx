import { Outlet } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import Footer from './Footer';

export default function WebsiteLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <WebsiteNavbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

