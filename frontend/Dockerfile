# ===== 1) Use Node.js official image =====
FROM node:20-slim

WORKDIR /app

# Copy the package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY frontend/ .

# Build the frontend (make sure to update this if you use something like Vite, React, etc.)
RUN npm run build

# Expose the frontend port (adjust if necessary)
EXPOSE 5000

# Start the frontend app
CMD ["npm", "run", "start"]