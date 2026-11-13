import React, { Suspense, lazy } from 'react';
// import logo from './logo.svg';
import './App.scss';
import MyInfo from './my_info';

// The team page is code-split so portfolio visitors never download it.
const SoccerPage = lazy(() => import('./soccer'));

const isSoccerRoute = () => window.location.pathname.replace(/\/+$/, '') === '/soccer';

const App = () => {
  if (isSoccerRoute()) {
    return (
      <Suspense fallback={null}>
        <SoccerPage />
      </Suspense>
    );
  }
  return (
    <div>
      <MyInfo />
    </div>
  );
}

export default App;
