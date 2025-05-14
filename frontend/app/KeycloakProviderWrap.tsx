'use client';

import { ReactNode } from 'react';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak from './keycloak';

export default function KeycloakProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: 'check-sso',
        checkLoginIframe: false,
      }}
    >
      {children}
    </ReactKeycloakProvider>
  );
}
