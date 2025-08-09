// Background Update Worker
let updateInterval = null;

// Worker ready message
self.postMessage({
  type: 'WORKER_READY',
  data: { timestamp: Date.now() }
});

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'START_UPDATES':
      startUpdates(data.interval || 15 * 60 * 1000); // Default 15 minutes
      break;
      
    case 'STOP_UPDATES':
      stopUpdates();
      break;
      
    case 'UPDATE_NOW':
      triggerUpdate();
      break;
  }
};

function startUpdates(interval) {
  console.log(`Starting background updates every ${interval / 1000}s`);
  
  // Clear existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Set new interval
  updateInterval = setInterval(() => {
    triggerUpdate();
  }, interval);
  
  // Trigger immediate update
  triggerUpdate();
}

function stopUpdates() {
  console.log('Stopping background updates');
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function triggerUpdate() {
  console.log('Triggering background update');
  
  self.postMessage({
    type: 'BACKGROUND_UPDATE',
    data: { 
      timestamp: Date.now(),
      type: 'scheduled'
    }
  });
}

// Handle worker termination
self.addEventListener('beforeunload', () => {
  stopUpdates();
});