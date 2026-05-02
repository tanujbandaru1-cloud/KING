import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { PIDController, LKA_EKF } from './src/lib/control-system';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'Aegis LKA Online', timestamp: new Date().toISOString() });
  });

  // Vite setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server for Real-Time LKA Streaming
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to LKA stream');
    
    const pid = new PIDController(0.8, 0.1, 0.05);
    const ekf = new LKA_EKF();
    let lastTime = Date.now();

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        const currentTime = Date.now();
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // --- Perception Pipeline Simulation ---
        // In a real YOLOP implementation, we'd process the frame here.
        // For this demo, we handle the frame data and return metrics + control.
        
        const lateralOffset = data.lateralOffset || 0;
        const windEffect = (data.params?.windSpeed || 0) * 0.001; // Simulate crosswind
        const noisyOffset = lateralOffset + windEffect + (Math.random() - 0.5) * (data.params?.noiseLevel || 0) * 0.1;

        // --- Fusion (EKF) ---
        // Fuse "Camera" (noisyOffset) + "Simulated IMU"
        const state = ekf.update([0, 0, 10, 0, 0], [0, 0, 10, 0, noisyOffset], dt);
        const filteredOffset = state[4];

        // --- Control (PID) ---
        const steeringAngle = pid.update(filteredOffset, dt);

        // --- Output ---
        const metrics = {
          timestamp: currentTime,
          lateralOffset: filteredOffset,
          steeringAngle: -steeringAngle * 45, // Map PID output to degrees
          velocity: 10,
          heading: 0,
          laneCenter: 0.5,
          vehicleCenter: 0.5 + filteredOffset,
          confidence: Math.max(0, 1 - (data.params?.noiseLevel || 0) - (1 - (data.params?.visibility || 1))),
          isSafe: Math.abs(filteredOffset) < 0.5
        };

        ws.send(JSON.stringify({
          type: 'LKA_UPDATE',
          metrics
        }));

      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });
}

startServer();
