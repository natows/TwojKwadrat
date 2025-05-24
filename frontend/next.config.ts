import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Hot reload w kontenerze Docker
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
    }
    return config;
  },
  
  // Dodaj konfigurację dla hot reload
  experimental: {
    // Włącz hot reload dla wszystkich plików
    turbo: {
      rules: {
        '*.tsx': ['tsx'],
        '*.ts': ['ts'],
      },
    },
  },
  
  async rewrites() {
    return [
      {
        source: '/api/users',
        destination: 'http://py-backend:5000/api/users/', 
      },
      {
        source: '/api/users/',
        destination: 'http://py-backend:5000/api/users/',
      },
      {
        source: '/api/:path([^/]+)',
        destination: 'http://go-backend:5001/api/:path/', 
      },
      {
        source: '/api/:path*',
        destination: 'http://go-backend:5001/api/:path*', 
      },
    ];
  }
};

export default nextConfig;