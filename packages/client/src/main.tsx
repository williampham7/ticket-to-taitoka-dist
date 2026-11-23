// edition.ts must load first: it picks the edition (map, skin, theme) before the shared map code reads it.
import './edition';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './theme-hsr.css';
import './theme-rail.css';
import './theme-merlion.css';
import { App } from './App';
import { initMusic } from './lib/music';
import { startParty } from './lib/party';

initMusic();
startParty();

createRoot(document.getElementById('root')!).render(
  <>
    <App />
  </>,
);
