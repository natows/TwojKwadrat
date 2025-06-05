// frontend/app/api/get/[id]/route.ts
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await context.params;
    console.log('Fetching post ID:', id);
    
    const response = await fetch(`http://go-backend:5001/api/get/${id}`, {
      headers: {
        'Origin': 'http://frontend:3000',
        'Content-Type': 'application/json',
        'User-Agent': 'Next.js-API-Route/1.0',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return Response.json({ error: 'Post not found' }, { status: 404 });
      }
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Found post:', data.title);
    
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching post:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return Response.json(
      { error: 'Failed to fetch post', details: errorMessage }, 
      { status: 500 }
    );
  }
}