FROM node:20-slim
RUN apt-get update && apt-get install -y default-jre-headless && rm -rf /var/lib/apt/lists/*
RUN npm i -g firebase-tools
WORKDIR /app
