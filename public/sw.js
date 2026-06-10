const CACHE_NAME = 'rxone-model-cache-v1';

// We intercept fetches for large ML model assets and cache them
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Check if it's a model file (TensorFlow or Xenova/HuggingFace)
  const isModelFile = 
    url.includes('storage.googleapis.com/tfjs-models') || 
    url.includes('huggingface.co') ||
    url.includes('hf-mirror.com') ||
    url.endsWith('.onnx') ||
    url.endsWith('.bin') ||
    url.endsWith('.json') && (url.includes('model') || url.includes('config') || url.includes('metadata'));

  if (isModelFile && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});
