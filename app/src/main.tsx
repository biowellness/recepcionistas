import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@medplum/react/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { MedplumProvider } from '@medplum/react';
import { medplum } from './medplum';
import { theme } from './theme';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <MedplumProvider medplum={medplum}>
        <App />
      </MedplumProvider>
    </MantineProvider>
  </React.StrictMode>,
);
