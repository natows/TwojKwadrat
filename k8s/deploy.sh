#!/bin/bash

echo "Starting TwojKwadrat deployment..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' 
CYAN='\033[0;36m'

wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    echo -e "${YELLOW}Waiting for $deployment to be ready...${NC}"
    kubectl wait --for=condition=available deployment/$deployment -n $namespace --timeout=300s
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}$deployment is ready${NC}"
    else
        echo -e "${RED}$deployment failed to start${NC}"
        return 1
    fi
}

check_pods() {
    echo -e "${YELLOW}Current pod status:${NC}"
    kubectl get pods -n twojkwadrat
}


echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml


echo -e "${YELLOW}Creating secrets and configmaps...${NC}"
kubectl apply -f k8s/secrets/mysql-secret.yaml
kubectl apply -f k8s/secrets/keycloak-secret.yaml
kubectl apply -f k8s/configmaps/app-config.yaml
kubectl apply -f k8s/configmaps/mysql-init-configmap.yaml
kubectl apply -f k8s/configmaps/keycloak-configmap.yaml

echo -e "${YELLOW}Creating persistent volumes...${NC}"
kubectl apply -f k8s/database/mysql-pvc.yaml
kubectl apply -f k8s/rabbitmq/rabbitmq-pvc.yaml
kubectl apply -f k8s/keycloak/keycloak-pvc.yaml


echo -e "${YELLOW}Deploying MySQL...${NC}"
kubectl apply -f k8s/database/mysql-deployment.yaml
wait_for_deployment "mysql" "twojkwadrat" || exit 1


echo -e "${YELLOW}Deploying RabbitMQ...${NC}"
kubectl apply -f k8s/rabbitmq/rabbitmq-deployment.yaml
wait_for_deployment "rabbitmq" "twojkwadrat" || exit 1


echo -e "${YELLOW}Deploying Keycloak...${NC}"
kubectl apply -f k8s/keycloak/keycloak-deployment.yaml
wait_for_deployment "keycloak" "twojkwadrat" || exit 1


echo -e "${YELLOW}Deploying backend services...${NC}"
kubectl apply -f k8s/backends/py-backend-deployment.yaml
kubectl apply -f k8s/backends/go-backend-deployment.yaml
kubectl apply -f k8s/backends/notification-service-deployment.yaml

wait_for_deployment "py-backend" "twojkwadrat" || exit 1
wait_for_deployment "go-backend" "twojkwadrat" || exit 1

echo -e "${YELLOW}Deploying frontend...${NC}"
kubectl apply -f k8s/frontend/frontend-deployment.yaml
wait_for_deployment "frontend" "twojkwadrat" || exit 1

echo -e "${YELLOW}Setting up LoadBalancer services...${NC}"


kubectl apply -f k8s/loadbalancer/loadbalancer-services.yaml

echo -e "${YELLOW}Waiting for LoadBalancer services to get external IPs...${NC}"
sleep 10

echo -e "${YELLOW}Checking LoadBalancer status...${NC}"
kubectl get svc -n twojkwadrat -o wide

echo -e "${YELLOW}Setting up Horizontal Pod Autoscaler...${NC}"


if ! kubectl get deployment metrics-server -n kube-system > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing metrics server...${NC}"
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    
    kubectl patch deployment metrics-server -n kube-system --type='json' -p='[
      {
        "op": "add",
        "path": "/spec/template/spec/containers/0/args/-",
        "value": "--kubelet-insecure-tls"
      }
    ]'
    
    echo -e "${YELLOW}Waiting for metrics server to be ready...${NC}"
    sleep 30
fi

if [ -f "k8s/hpa/hpa.yaml" ]; then
    kubectl apply -f k8s/hpa/hpa.yaml
    echo -e "${GREEN}HPA configured${NC}"
else
    echo -e "${YELLOW}HPA file not found - skipping (optional)${NC}"
fi

echo -e "${YELLOW}Checking hpa status"
kubectl get hpa -n twojkwadrat

echo -e "${GREEN}Deployment completed!${NC}"
check_pods

