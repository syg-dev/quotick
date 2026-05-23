#!/usr/bin/env bash
# Script de red: VPC, subred, IGW, route table y security group
set -euo pipefail

REGION="us-east-1"
VPC_CIDR="10.0.0.0/16"
SUBNET_CIDR="10.0.1.0/24"
AZ="us-east-1a"
OUT_FILE="/workspace/infrastructure/vpc-resources.env"

find_by_name() {
  local resource_type="$1" name="$2" id_field="$3"
  aws ec2 describe-"$resource_type" \
    --filters "Name=tag:Name,Values=$name" \
    --query "$id_field" --output text --region "$REGION" 2>/dev/null | grep -v '^None$' || true
}

echo "=== Red Quotick ==="

VPC_ID=$(find_by_name "vpcs" "quotick-vpc" "Vpcs[0].VpcId")
if [ -z "$VPC_ID" ]; then
  VPC_ID=$(aws ec2 create-vpc --cidr-block "$VPC_CIDR" \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=quotick-vpc}]" \
    --query 'Vpc.VpcId' --output text --region "$REGION")
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$REGION"
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$REGION"
  echo "[+] VPC: $VPC_ID"
else
  echo "[=] VPC: $VPC_ID"
fi

SUBNET_ID=$(find_by_name "subnets" "quotick-public-subnet" "Subnets[0].SubnetId")
if [ -z "$SUBNET_ID" ]; then
  SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$SUBNET_CIDR" \
    --availability-zone "$AZ" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=quotick-public-subnet}]" \
    --query 'Subnet.SubnetId' --output text --region "$REGION")
  aws ec2 modify-subnet-attribute --subnet-id "$SUBNET_ID" --map-public-ip-on-launch --region "$REGION"
  echo "[+] Subred: $SUBNET_ID"
else
  echo "[=] Subred: $SUBNET_ID"
fi

IGW_ID=$(find_by_name "internet-gateways" "quotick-igw" "InternetGateways[0].InternetGatewayId")
if [ -z "$IGW_ID" ]; then
  IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=quotick-igw}]" \
    --query 'InternetGateway.InternetGatewayId' --output text --region "$REGION")
  echo "[+] IGW: $IGW_ID"
else
  echo "[=] IGW: $IGW_ID"
fi

ATTACHED=$(aws ec2 describe-internet-gateways --internet-gateway-ids "$IGW_ID" \
  --query 'InternetGateways[0].Attachments[0].VpcId' --output text --region "$REGION" 2>/dev/null || true)
if [ "$ATTACHED" != "$VPC_ID" ]; then
  aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION"
fi

RT_ID=$(find_by_name "route-tables" "quotick-rt-public" "RouteTables[0].RouteTableId")
if [ -z "$RT_ID" ]; then
  RT_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=quotick-rt-public}]" \
    --query 'RouteTable.RouteTableId' --output text --region "$REGION")
  echo "[+] Route Table: $RT_ID"
else
  echo "[=] Route Table: $RT_ID"
fi

aws ec2 create-route --route-table-id "$RT_ID" --destination-cidr-block "0.0.0.0/0" \
  --gateway-id "$IGW_ID" --region "$REGION" >/dev/null 2>&1 || true

ASSOC=$(aws ec2 describe-route-tables --route-table-ids "$RT_ID" \
  --query "RouteTables[0].Associations[?SubnetId=='$SUBNET_ID'].RouteTableAssociationId" \
  --output text --region "$REGION" 2>/dev/null || true)
if [ -z "$ASSOC" ]; then
  aws ec2 associate-route-table --route-table-id "$RT_ID" --subnet-id "$SUBNET_ID" --region "$REGION" >/dev/null
fi

SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=quotick-sg" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null | grep -v '^None$' || true)
if [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group --group-name "quotick-sg" \
    --description "Quotick - acceso web" --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=quotick-sg}]" \
    --query 'GroupId' --output text --region "$REGION")
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
    --ip-permissions \
      'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0}]' \
      'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
      'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]' \
    --region "$REGION" >/dev/null
  echo "[+] Security Group: $SG_ID"
else
  echo "[=] Security Group: $SG_ID"
fi

cat > "$OUT_FILE" <<EOF
AWS_REGION=$REGION
VPC_ID=$VPC_ID
SUBNET_ID=$SUBNET_ID
IGW_ID=$IGW_ID
ROUTE_TABLE_ID=$RT_ID
SECURITY_GROUP_ID=$SG_ID
EOF

echo ""
echo "IDs guardados en vpc-resources.env"
