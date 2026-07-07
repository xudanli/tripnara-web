import { Outlet } from 'react-router-dom';
import { ExplorationTravelContextProvider } from './ExplorationTravelContext';
import { ExploreTravelContextStatusBanner } from '../components/ExploreTravelContextStatusBanner';

/** 探索流程路由布局 — 注入 Travel Context Provider（contextId === scenarioId） */
export default function ExplorationTravelContextLayout() {
  return (
    <ExplorationTravelContextProvider>
      <ExploreTravelContextStatusBanner />
      <Outlet />
    </ExplorationTravelContextProvider>
  );
}
