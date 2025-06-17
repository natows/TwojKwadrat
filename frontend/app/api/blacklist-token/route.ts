import { createClient } from 'redis';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Invalid Authorization header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer "
    
    console.log('🔍 Blacklisting token directly in Redis...');
    
    // ✅ Connect to Redis
    const redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`
    });
    
    await redisClient.connect();
    
    try {
      // ✅ Parse token to get expiration (without signature verification)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const expiration = payload.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (expiration && expiration > currentTime) {
        const ttl = expiration - currentTime;
        
        // ✅ Blacklist token in Redis with TTL
        await redisClient.setEx(`bl:${token}`, ttl, '1');
        
        console.log(`✅ Token blacklisted in Redis for ${ttl} seconds`);
        
        await redisClient.disconnect();
        
        return Response.json({
          message: 'Token blacklisted successfully',
          blacklisted_until: new Date(expiration * 1000).toISOString(),
          ttl_seconds: ttl
        });
        
      } else {
        await redisClient.disconnect();
        return Response.json({ error: 'Token already expired' }, { status: 400 });
      }
      
    } catch (parseError) {
      await redisClient.disconnect();
      console.error('❌ Token parsing error:', parseError);
      return Response.json({ error: 'Invalid token format' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Redis blacklist error:', error);
    return Response.json({ 
      error: 'Failed to blacklist token', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}