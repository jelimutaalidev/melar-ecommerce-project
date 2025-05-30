// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeLocalStorageWithDummies } from './data/dummyDataInitializer';

initializeLocalStorageWithDummies(); // Pastikan ini dipanggil

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);