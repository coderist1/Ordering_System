#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/Ordering_System
REPO_URL="${1:-https://github.com/coderist1/Ordering_System.git}"

echo "[1/10] Installing system packages"
sudo apt update
sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx git

echo "[2/10] Cloning or updating project"
sudo mkdir -p /var/www
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  sudo git pull
fi

cd "$APP_DIR"

echo "[3/10] Creating virtual environment"
if [ ! -d venv ]; then
  python3 -m venv venv
fi

source venv/bin/activate

echo "[4/10] Installing Python dependencies"
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

if [ ! -f .env ]; then
  echo "[5/10] Creating .env from template"
  cp .env.example .env
  echo "Edit $APP_DIR/.env before proceeding to production traffic."
fi

echo "[6/10] Running migrations and static collection"
chmod +x build.sh
bash build.sh

echo "[7/10] Installing Gunicorn systemd service"
sudo cp deploy/gunicorn.service /etc/systemd/system/ordering-system.service
sudo sed -i "s|/var/www/Ordering_System|$APP_DIR|g" /etc/systemd/system/ordering-system.service
sudo systemctl daemon-reload
sudo systemctl enable ordering-system
sudo systemctl restart ordering-system

echo "[8/10] Installing Nginx site config"
sudo cp deploy/nginx.ordering-system.conf /etc/nginx/sites-available/ordering-system
sudo ln -sfn /etc/nginx/sites-available/ordering-system /etc/nginx/sites-enabled/ordering-system
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "[9/10] Enabling firewall"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "[10/10] Deployment complete"
echo "Check status:"
echo "  sudo systemctl status ordering-system"
echo "  sudo systemctl status nginx"
