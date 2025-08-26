# MLM Project

## Environment Setup

### Frontend (.env)
```
VITE_API_URL=https://api.margine-space.com
```

### Backend (.env)
```
PORT=3000
DATABASE_URL="postgresql://mlmuser:your_password@localhost:5432/mlmdb"
JWT_SECRET=your_jwt_secret
NODE_ENV=production
FRONTEND_URL=https://margine-space.com
```

## Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 17
- PM2 (for production)

### Server Deployment
1. Clone the repository
2. Set up environment variables
3. Install dependencies:
```bash
npm install
cd backend && npm install
```
4. Start the backend:
```bash
cd backend
pm2 start index.js
```

### Netlify Deployment
The project is automatically deployed to Netlify when changes are pushed to the main branch.

Required Netlify environment variables:
- VITE_API_URL=https://api.margine-space.com

### Database Setup
1. Create PostgreSQL database:
```sql
CREATE DATABASE mlmdb;
CREATE USER mlmuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mlmdb TO mlmuser;
```

2. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

## Automatic Deployment

The project uses GitHub Actions for automatic deployment:
- Frontend is automatically deployed to Netlify
- Backend is automatically deployed to the production server

Required GitHub Secrets:
- SERVER_HOST
- SERVER_USERNAME
- SSH_PRIVATE_KEY
# Trigger deployment
