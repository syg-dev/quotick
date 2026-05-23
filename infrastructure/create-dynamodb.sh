#!/usr/bin/env bash
# Crea las tablas DynamoDB del proyecto
set -euo pipefail

REGION="us-east-1"
TABLES=("quotick-clientes" "quotick-servicios" "quotick-cotizaciones")

echo "=== Tablas DynamoDB Quotick ==="

for T in "${TABLES[@]}"; do
  if aws dynamodb describe-table --table-name "$T" --region "$REGION" >/dev/null 2>&1; then
    echo "[=] Tabla ya existe: $T"
  else
    aws dynamodb create-table \
      --table-name "$T" \
      --attribute-definitions AttributeName=id,AttributeType=S \
      --key-schema AttributeName=id,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --tags Key=Name,Value="$T" Key=Project,Value=quotick \
      --region "$REGION" >/dev/null
    echo "[+] Tabla creada: $T"
  fi
done

echo "Esperando a que las tablas esten ACTIVE..."
for T in "${TABLES[@]}"; do
  aws dynamodb wait table-exists --table-name "$T" --region "$REGION"
done

echo ""
echo "=== Resumen de tablas quotick-* ==="
for T in "${TABLES[@]}"; do
  aws dynamodb describe-table --table-name "$T" --region "$REGION" \
    --query 'Table.{Tabla:TableName,Estado:TableStatus,Facturacion:BillingModeSummary.BillingMode,PK:KeySchema[0].AttributeName}' \
    --output text
done
