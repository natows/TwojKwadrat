
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return Response.json({ error: 'Authorization header required' }, { status: 401 });
    }
    
    console.log('Creating post via API route');
    
    const response = await fetch('http://go-backend:5001/api/posts/create', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Origin': 'http://frontend:3000',
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js-API-Route/1.0',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (response.status === 400) {
        return Response.json({ error: 'Invalid data', details: errorText }, { status: 400 });
      }
      
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Post created successfully:', data);
    
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { error: 'Failed to create post', details: errorMessage }, 
      { status: 500 }
    );
  }
}