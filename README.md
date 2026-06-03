# Quotick

Aplicación web para cotizar proyectos de software por horas, desplegada en AWS.

Permite registrar clientes, definir un tarifario de roles, cargar herramientas y factores de riesgo, y generar cotizaciones con precios calculados automáticamente en COP. Desde cada cotización se puede descargar un PDF listo para enviar al cliente.

**App:** https://dymawbi4thhpo.cloudfront.net

**Video:** https://drive.google.com/file/d/1qc5inppfJqrP7G0bVZScMdJkzJQUwoXZ/view?usp=sharing

---

## Stack

- **Frontend:** React estático en S3 + CloudFront
- **Backend:** AWS Lambda (Node.js 22) + API Gateway
- **Base de datos:** DynamoDB On-demand
- **PDF:** Servidor en EC2 t3.micro con Puppeteer
- **IaC:** Serverless Framework + scripts AWS CLI

---

## Estructura

```
├── frontend/        # React
├── backend/         # Funciones Lambda + serverless.yml
├── infrastructure/  # Scripts para VPC, EC2, IAM y DynamoDB
├── ec2-pdf-server/  # Servidor de generación de PDF
└── docs/            # Informe técnico y capturas
```

---

## Despliegue

```bash
# Infraestructura
cd infrastructure
bash create-vpc.sh
bash create-ec2.sh
bash create-iam.sh
bash create-dynamodb.sh

# Backend
cd backend && npm install && serverless deploy

# Frontend
cd frontend && npm install && npm run build
aws s3 sync dist/ s3://quotick-frontend-prod --delete
```

Región: `us-east-1` — todos los recursos usan el prefijo `quotick-*`.
