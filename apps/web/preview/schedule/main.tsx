import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from '../../src/App.js';
import { queryClient } from '../../src/lib/queryClient.js';
import { previewRole } from './mockApiClient.js';
import { SessionProvider } from './mockSession.js';
import '../../src/styles/global.css';

const params = new URLSearchParams(window.location.search);
const initialPath = params.get('path') ?? `/schedules?week=${params.get('week') ?? '2025-05-12'}`;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SessionProvider role={previewRole}>
          <App />
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
