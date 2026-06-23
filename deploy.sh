#!/bin/bash

set -e

echo "Starting deployment process..."

echo "Pulling latest changes from Git..."
git pull origin main

echo "Building Client..."
cd client
npm install
npm run build
cd ..

echo "Building Server..."
cd server
npm install
npm run build
cd ..

echo "Restarting PM2 process..."
pm2 restart qa-dashboard

echo "Update complete! System is up and running."