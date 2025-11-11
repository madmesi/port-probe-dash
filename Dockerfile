# Frontend Dockerfile
FROM node:20-alpine as builder

WORKDIR /app

# Arguments for build-time variables
ARG VITE_API_URL
ARG VITE_SUPABASE_ENABLED=false

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_ENABLED=$VITE_SUPABASE_ENABLED

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
