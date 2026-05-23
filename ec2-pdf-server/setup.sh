#!/bin/bash
set -e

echo "=== Quotick PDF Server — Setup ==="

# Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Dependencias de Chromium para Puppeteer
sudo yum install -y \
  alsa-lib atk cups-libs gtk3 ipa-gothic-fonts \
  libXcomposite libXcursor libXdamage libXext \
  libXi libXrandr libXScrnSaver libXtst \
  pango xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
  xorg-x11-fonts-cyrillic xorg-x11-fonts-misc \
  xorg-x11-fonts-Type1 xorg-x11-utils \
  nss libdrm mesa-libgbm

# Copiar archivos del servidor
mkdir -p /home/ec2-user/pdf-server
cp /tmp/server.js   /home/ec2-user/pdf-server/
cp /tmp/template.js /home/ec2-user/pdf-server/
cp /tmp/package.json /home/ec2-user/pdf-server/
chown -R ec2-user:ec2-user /home/ec2-user/pdf-server

# Instalar dependencias npm (incluye Puppeteer con Chromium)
cd /home/ec2-user/pdf-server
sudo -u ec2-user npm install

# Instalar pm2 para mantener el servidor corriendo
sudo npm install -g pm2

# Arrancar el servidor con pm2
sudo -u ec2-user pm2 start server.js --name quotick-pdf
sudo -u ec2-user pm2 save
sudo pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "=== Setup completo. PDF server corriendo en puerto 3001 ==="
