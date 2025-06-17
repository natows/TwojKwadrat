from fastapi import APIRouter, Depends, HTTPException, Request
import mysql.connector
from keycloak import KeycloakOpenID
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from slowapi import Limiter
from slowapi.util import get_remote_address




limiter = Limiter(key_func=get_remote_address)

KEYCLOAK_SERVER_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "TwojKwadrat")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "TwojKwadrat-app")
KEYCLOAK_OPENID = KeycloakOpenID(
    server_url=KEYCLOAK_SERVER_URL,
    client_id=KEYCLOAK_CLIENT_ID,
    realm_name=KEYCLOAK_REALM
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{KEYCLOAK_SERVER_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"
)


is_token_blacklisted_func = None




def set_blacklist_function(func):
    global is_token_blacklisted_func
    is_token_blacklisted_func = func
    print("Blacklist function connected to user router")

# 
def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        print(f" Checking token (first 20 chars): {token[:20]}...")
        print(f" Blacklist function available: {is_token_blacklisted_func is not None}")
        
        if is_token_blacklisted_func:
            is_blacklisted = is_token_blacklisted_func(token)
            print(f" Token blacklisted: {is_blacklisted}")
            
            if is_blacklisted:
                print("Token is blacklisted - rejecting request")
                raise HTTPException(status_code=401, detail="Token blacklisted - user logged out")
        else:
            print("No blacklist function available")
        
        print("Token not blacklisted - proceeding with JWT verification")
        
        public_key = KEYCLOAK_OPENID.public_key()
        public_key = f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----"

        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=KEYCLOAK_CLIENT_ID,
            options={"verify_exp": True} 
        )

        return decoded_token
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e: 
        print(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Token verification error: {type(e).__name__}: {e}")  
        raise HTTPException(status_code=401, detail="Authentication failed")



def require_admin_user(token: dict = Depends(verify_token)):
    roles = token.get("realm_access", {}).get("roles", [])
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return token

router =  APIRouter()

from mysql.connector import pooling

DB_CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST', 'mysql'),
    'database': os.getenv('DB_NAME', 'keycloak'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'pool_name': os.getenv('DB_POOL_NAME', 'keycloak_pool'),
    'pool_size': int(os.getenv('DB_POOL_SIZE', '5'))
}

def get_db_connection():
    try:
        cnx_pool = pooling.MySQLConnectionPool(**DB_CONFIG)
        return cnx_pool.get_connection()
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise HTTPException(status_code=500, detail="Database connection failed")


@limiter.limit("10/minute")
@router.get('/')
async def get_users(request: Request, user=Depends(require_admin_user)):
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor()
        
        mycursor.execute("SELECT * FROM USER_ENTITY")
        results = mycursor.fetchall()

        users = [
            {"id": row[0], "username": row[9], "email": row[1], "first_name": row[6], "last_name": row[7], "realm_id": row[4]}
            for row in results
        ]
        mycursor.close()
        mydb.close()

        return users
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")


@limiter.limit("10/minute")
@router.get('/{user_id}')
async def get_user(request: Request, user_id: str, user=Depends(verify_token)):
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor()
        
        mycursor.execute("SELECT * FROM USER_ENTITY WHERE ID = %s", (user_id,))
        result = mycursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = {
            "id": result[0],
            "username": result[9],
            "email": result[1],
            "first_name": result[6],
            "last_name": result[7]
        }

        mycursor.close()
        mydb.close()

        return user_data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")