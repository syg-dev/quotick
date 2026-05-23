#!/usr/bin/env bash
# Lanza la instancia EC2 t3.micro en la subred publica
set -euo pipefail

REGION="us-east-1"
ENV_FILE="/workspace/infrastructure/vpc-resources.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE. Corre primero create-vpc.sh"; exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

echo "=== EC2 quotick-ec2 ==="

AMI_ID=$(aws ssm get-parameters \
  --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query 'Parameters[0].Value' --output text --region "$REGION")

EXISTING=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=quotick-ec2" \
            "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text --region "$REGION" 2>/dev/null \
  | grep -v '^None$' || true)

if [ -n "$EXISTING" ]; then
  INSTANCE_ID="$EXISTING"
  echo "[=] Instancia ya existe: $INSTANCE_ID"
else
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type t3.micro \
    --subnet-id "$SUBNET_ID" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=quotick-ec2}]" \
    --query 'Instances[0].InstanceId' --output text --region "$REGION")
  echo "[+] Instancia lanzada: $INSTANCE_ID"
fi

echo "Esperando que arranque..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

echo "Deteniendo..."
aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --region "$REGION" >/dev/null
aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID" --region "$REGION"
echo "[+] Instancia detenida."

grep -v '^INSTANCE_ID=' "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || true
mv "${ENV_FILE}.tmp" "$ENV_FILE"
echo "INSTANCE_ID=$INSTANCE_ID" >> "$ENV_FILE"

echo ""
aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].{ID:InstanceId,Tipo:InstanceType,Estado:State.Name}' \
  --output table --region "$REGION"
