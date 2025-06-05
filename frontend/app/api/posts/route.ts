
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  try {
    const backendUrl = `http://go-backend:5001/api/posts/?${searchParams.toString()}`;
    console.log('Forwarding to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      headers: {
        'Origin': 'http://frontend:3000',
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js-API-Route/1.0',
      },
    });
    
    if (!response.ok) {
      console.error('Backend error:', response.status, await response.text());
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Got data from backend:', Array.isArray(data) ? data.length : 'unknown', 'posts');
    
    return Response.json(data);
  } catch (error) {
    console.error('Error in API route:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { error: 'Failed to fetch posts', details: errorMessage }, 
      { status: 500 }
    );
  }
}