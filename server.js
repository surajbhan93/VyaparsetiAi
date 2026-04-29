import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import connectDB from './src/config/db.js';
import reviewRoutes from './src/routes/reviewRoutes.js';
import businessRoutes from './src/routes/businessRoute.js';
import errorHandler from './src/middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/reviews', reviewRoutes);

app.use('/api/business', businessRoutes);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
