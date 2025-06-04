import Keycloak from 'keycloak-js';


const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'TwojKwadrat', 
  clientId: 'TwojKwadrat-app', 
  
});

export default keycloak;


