#!/bin/bash

echo "Starting cleanup"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
CYAN='\033[0;36m'

namespace_exists() {
    kubectl get namespace twojkwadrat &> /dev/null
    return $?
}

echo -e "${YELLOW}Current status:${NC}"
if namespace_exists; then
    kubectl get pods -n twojkwadrat
    echo ""
    kubectl get pvc -n twojkwadrat
    echo ""
else
    echo -e "${RED}Namespace 'twojkwadrat' doesn't exist${NC}"
    exit 0
fi

echo -e "${YELLOW}Stopping all deployments...${NC}"

echo -e "${CYAN}Scaling down deployments...${NC}"
kubectl scale deployment --all --replicas=0 -n twojkwadrat

echo -e "${CYAN}Waiting for pods to terminate...${NC}"
kubectl wait --for=delete pod --all -n twojkwadrat --timeout=120s

echo -e "${GREEN}All pods stopped${NC}"

echo -e "${CYAN}Removing LoadBalancer services...${NC}"
kubectl delete service frontend-loadbalancer -n twojkwadrat --ignore-not-found=true
kubectl delete service keycloak-loadbalancer -n twojkwadrat --ignore-not-found=true
kubectl delete service go-backend-loadbalancer -n twojkwadrat --ignore-not-found=true
kubectl delete service py-backend-loadbalancer -n twojkwadrat --ignore-not-found=true

echo -e "${GREEN}LoadBalancer services removed${NC}"

if kubectl get hpa -n twojkwadrat &> /dev/null; then
    echo -e "${CYAN}Removing HPA...${NC}"
    kubectl delete hpa --all -n twojkwadrat --ignore-not-found=true
    echo -e "${GREEN}HPA removed${NC}"
fi

echo -e "${YELLOW}Preserving volumes and data:${NC}"
kubectl get pvc -n twojkwadrat

echo ""
echo -e "${GREEN}Cleanup completed successfully${NC}"
