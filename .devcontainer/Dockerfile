FROM node:22-bookworm-slim

# Tools needed for AWS CLI install
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    less \
    groff \
    git \
    && rm -rf /var/lib/apt/lists/*

# AWS CLI v2 — detect arch so the same Dockerfile works on ARM64 and AMD64
RUN ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "arm64" ]; then \
         curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o awscliv2.zip; \
       else \
         curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip; \
       fi \
    && unzip -q awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws/

# Serverless Framework v4
RUN npm install -g serverless

WORKDIR /workspace
