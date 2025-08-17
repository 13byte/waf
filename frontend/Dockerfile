FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (using npm install instead of ci to handle package-lock.json updates)
RUN npm install

# Copy source code
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
