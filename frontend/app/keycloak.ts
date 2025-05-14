import Keycloak from 'keycloak-js';


const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'TwójKwadrat', 
  clientId: 'TwójKwadrat-app', 
});

export default keycloak;