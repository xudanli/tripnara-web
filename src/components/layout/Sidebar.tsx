import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside style={{ width: '200px', borderRight: '1px solid #e0e0e0', padding: '1rem' }}>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/dashboard/trips">Trips</Link>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/dashboard/places">Places</Link>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/dashboard/hotels">Hotels</Link>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/dashboard/trails">Trails</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

