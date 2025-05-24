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

mydb = mysql.connector.connect(
  host="mysql",
  user="keycloak",
  password="keycloak",
  database="keycloak"
)


mycursor = mydb.cursor()



@router.get('/')
async def get_users(user=Depends(require_admin_user)):
    try:
        mycursor.execute("SELECT * FROM USER_ENTITY")
        results = mycursor.fetchall()

        users = [
            {"id": row[0], "username": row[9], "email": row[1], "first_name": row[6], "last_name": row[7], "realm_id": row[4]} #nie wiem czy realm id nie bedzie potrzebne ale to chyba z tokena lepiej brac
            for row in results
        ]


        return users
    except mysql.connector.Error as err:
        return {"error": str(err)}

