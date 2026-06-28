# Use the official lightweight Node.js 18 image.
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite frontend and bundle the Express server
RUN npm run build

# Expose the port the Express server listens on
EXPOSE 8000

# Set Node to production mode
ENV NODE_ENV=production

# Start the Node Express backend
CMD ["npm", "start"]
