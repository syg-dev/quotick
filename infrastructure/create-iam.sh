#!/usr/bin/env bash
# Crea el rol IAM para Lambda con acceso a DynamoDB y CloudWatch
set -euo pipefail

REGION="us-east-1"
ACCOUNT_ID="380607194543"
ROLE_NAME="Quotick-LambdaRole"
POLICY_NAME="Quotick-DynamoDBPolicy"
ENV_FILE="/workspace/infrastructure/vpc-resources.env"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

echo "=== IAM: $ROLE_NAME ==="

TRUST_DOC="/tmp/trust-policy.json"
cat > "$TRUST_DOC" <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

DDB_DOC="/tmp/dynamodb-policy.json"
cat > "$DDB_DOC" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "QuotickDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/quotick-*",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/quotick-*/index/*"
      ]
    }
  ]
}
EOF

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "[=] Rol ya existe: $ROLE_NAME"
else
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_DOC" \
    --description "Rol de ejecucion para Lambda" \
    --tags Key=Name,Value=Quotick-LambdaRole >/dev/null
  echo "[+] Rol creado: $ROLE_NAME"
fi

aws iam attach-role-policy --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  echo "[=] Politica ya existe: $POLICY_NAME"
else
  aws iam create-policy --policy-name "$POLICY_NAME" \
    --policy-document "file://$DDB_DOC" \
    --description "Acceso DynamoDB tablas quotick-*" >/dev/null
  echo "[+] Politica creada: $POLICY_NAME"
fi

aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN"

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
grep -v '^LAMBDA_ROLE_ARN=' "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || true
mv "${ENV_FILE}.tmp" "$ENV_FILE"
echo "LAMBDA_ROLE_ARN=$ROLE_ARN" >> "$ENV_FILE"

echo ""
echo "Rol listo: $ROLE_ARN"
