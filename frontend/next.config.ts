import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  
  experimental: {
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
        source: '/api/users/:id',
        destination: 'http://py-backend:5000/api/users/:id',
      },
      {
        source: '/api/users',
        destination: 'http://py-backend:5000/api/users/', 
      },
      {
        source: '/api/users/',
        destination: 'http://py-backend:5000/api/users/',
      },
      

      {
      source: '/api/posts/create',               
      destination: 'http://go-backend:5001/api/posts/create',
    },
    {
      source: '/api/posts/create/',
      destination: 'http://go-backend:5001/api/posts/create',
    },
    {
      source: '/api/get/:id(\\d+)',            
      destination: 'http://go-backend:5001/api/get/:id',
    },
    {
      source: '/api/posts',                     
      destination: 'http://go-backend:5001/api/posts/',
    },
    {
      source: '/api/posts/',
      destination: 'http://go-backend:5001/api/posts/',
    },
     {
      source: '/api/favorites',
      destination: 'http://go-backend:5001/api/favorites',
    },
    {
      source: '/api/favorites/add/:id',
      destination: 'http://go-backend:5001/api/favorites/add/:id',
    },
    {
      source: '/api/favorites/remove/:id',
      destination: 'http://go-backend:5001/api/favorites/remove/:id',
    },
    {
      source: '/api/favorites/check/:id',
      destination: 'http://go-backend:5001/api/favorites/check/:id',
    },
      {
        source: '/api/:path*',
        destination: 'http://go-backend:5001/api/:path*',
      },
    ];
  }
};

export default nextConfig;