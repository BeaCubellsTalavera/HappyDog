FROM eclipse-temurin:21-jre-noble AS java
FROM node:20-slim
COPY --from=java /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"
RUN npm i -g firebase-tools
WORKDIR /app
