from fastapi import FastAPI, APIRouter

router =  APIRouter()


@router.get('/')
async def get_posts():
    return [ #pamietaj zeby zwracal endpoint tablice oki
        {
            'id': 1,
            'title': 'Post 1',
            'content': 'This is the content of post 1'
        },
        {
            'id': 2,
            'title': 'Post 2',
            'content': 'This is the content of post 2'
        }
    ]