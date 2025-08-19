FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies with npm cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --cache /root/.npm || npm install --cache /root/.npm

# Copy source code after dependencies are installed
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_TITLE="WAF Security"
ARG VITE_APP_DESCRIPTION="WAF Security Operations Center"
ARG VITE_GOOGLE_CLIENT_ID=""

# Set environment variables from build arguments
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
ENV VITE_APP_DESCRIPTION=${VITE_APP_DESCRIPTION}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html

# Use serve to serve the built application
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000", "--single"]