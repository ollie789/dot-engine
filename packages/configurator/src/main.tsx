import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/hud.css';
import { App } from './App';
import { QivrDemo } from './QivrDemo';

// ?qivr shows the Qivr brand demo
const isQivr = new URLSearchParams(window.location.search).has('qivr');

createRoot(document.getElementById('root')!).render(
  isQivr ? <QivrDemo /> : <App />
);
