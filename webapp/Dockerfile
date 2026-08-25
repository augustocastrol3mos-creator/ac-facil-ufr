FROM nikolaik/python-nodejs:python3.12-nodejs20

WORKDIR /app

# Install DejaVu fonts for PDF generation with full UTF-8/accent support
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependency
RUN pip install reportlab --break-system-packages

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy project files
COPY . .

# Create data directory for encrypted config files
RUN mkdir -p data

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
