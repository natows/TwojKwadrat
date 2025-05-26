from fastapi import APIRouter, Depends, HTTPException
import mysql.connector
from keycloak import KeycloakOpenID
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
import os

KEYCLOAK_SERVER_URL = os.getenv("KEYCLOAK_URL", "http://keycloak:8080/")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "TwojKwadrat")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "TwojKwadrat-app")
KEYCLOAK_OPENID = KeycloakOpenID(
    server_url=KEYCLOAK_SERVER_URL,
    client_id=KEYCLOAK_CLIENT_ID,
    realm_name=KEYCLOAK_REALM
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{KEYCLOAK_SERVER_URL}realms/{KEYCLOAK_REALM}/protocol/openid-connect/token"
)

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        public_key = KEYCLOAK_OPENID.public_key()
        print(f"Raw public key: {public_key}")
        public_key = f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----"
        print(f"Formatted public key: {public_key}")

        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=KEYCLOAK_CLIENT_ID
        )
        print(f"Decoded token: {decoded_token}")  # Debug decoded token
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {str(e)}")  # Debug error
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")
    
def require_admin_user(token: dict = Depends(verify_token)):
    # if "admin" not in token["realm_access"]["roles"]:
    #     raise HTTPException(status_code=403, detail="Admin role required")
    # return token
    roles = token.get("realm_access", {}).get("roles", [])
    print(f"User roles: {roles}")  # Debug roles
    if "admin" not in roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return token

router =  APIRouter()

from mysql.connector import pooling

config = {
    'user': 'keycloak',
    'password': 'keycloak',
    'host': 'mysql',
    'database': 'keycloak',
    'pool_name': 'keycloak_pool',
    'pool_size': 5
}

def get_db_connection():
    try:
        cnx_pool = pooling.MySQLConnectionPool(**config)
        return cnx_pool.get_connection()
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.get('/')
async def get_users(user=Depends(require_admin_user)):
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


@router.get('/{user_id}')
async def get_user(user_id: str, user=Depends(verify_token)):
    try:
        mydb = get_db_connection()
        mycursor = mydb.cursor()
        
        mycursor.execute("SELECT * FROM USER_ENTITY WHERE ID = %s", (user_id,))
        result = mycursor.fetchone()

        print(f"Query result: {result}")

        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = {
            "id": result[0],
            "username": result[9],
            "email": result[1],
            "first_name": result[6],
            "last_name": result[7]
        }

        print(f"Returning user data: {user_data}") 

        

        mycursor.close()
        mydb.close()

        return user_data
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")