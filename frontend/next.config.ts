import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Włącz polling tylko w trybie deweloperskim i po stronie serwera
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // Sprawdzaj zmiany co 1000ms
        aggregateTimeout: 300, // Agreguj zmiany przez 300ms przed ponownym budowaniem
        ignored: ['**/node_modules/**', '**/dist/**', '**/build/**'], // Ignoruj katalogi
      };
    }
    return config;
  },
  // Opcjonalne: Inne ustawienia Next.js
  reactStrictMode: true, // Zalecane dla lepszego debugowania
  // experimental: {
  //   // Jeśli używasz jakichś eksperymentalnych funkcji, dodaj je tutaj
  // },

  async rewrites() {
    return [
      {
        // Dodaj wzorzec bez ukośnika
        source: '/api/:path([^/]+)',
        destination: 'http://backend:5000/:path/', 
      },
      {
        // Obsługuj też wzorzec z ukośnikiem
        source: '/api/:path*',
        destination: 'http://backend:5000/:path*', 
      }
    ];
  }
};

export default nextConfig;

