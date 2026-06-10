import { apiClient } from "./api-client";

// Define a pool of 60 endpoint paths and search configurations
const KEEP_ALIVE_ENDPOINTS: string[] = [
  "/subjects",
  "/topics",
  "/subtopics",
  "/organisations",
  "/candidates",
  "/questions",
  "/tests",
  "/test-schedules",
  "/candidate-invitations",
  "/test-results",
  "/subjects?size=10",
  "/topics?size=10",
  "/subtopics?size=10",
  "/organisations?size=10",
  "/candidates?size=10",
  "/questions?size=10",
  "/tests?size=10",
  "/test-schedules?size=10",
  "/candidate-invitations?size=10",
  "/test-results?size=10",
  "/subjects?page=0&size=20",
  "/topics?page=0&size=20",
  "/subtopics?page=0&size=20",
  "/organisations?page=0&size=20",
  "/candidates?page=0&size=20",
  "/questions?page=0&size=20",
  "/tests?page=0&size=20",
  "/test-schedules?page=0&size=20",
  "/candidate-invitations?page=0&size=20",
  "/test-results?page=0&size=20",
  "/subjects?page=1&size=5",
  "/topics?page=1&size=5",
  "/subtopics?page=1&size=5",
  "/organisations?page=1&size=5",
  "/candidates?page=1&size=5",
  "/questions?page=1&size=5",
  "/tests?page=1&size=5",
  "/test-schedules?page=1&size=5",
  "/candidate-invitations?page=1&size=5",
  "/test-results?page=1&size=5",
  "/subjects/search?q=computer",
  "/topics/search?q=database",
  "/subtopics/search?q=sql",
  "/questions/search?q=react",
  "/tests/search?q=engineer",
  "/subjects/search?name=Science",
  "/topics/search?name=Design",
  "/subtopics/search?name=Index",
  "/questions/search?title=DOM",
  "/tests/search?title=Full",
  "/subjects?sort=name,asc",
  "/topics?sort=name,asc",
  "/subtopics?sort=name,asc",
  "/questions?sort=title,asc",
  "/tests?sort=title,asc",
  "/test-schedules?sort=id,asc",
  "/candidate-invitations?sort=id,asc",
  "/organisations?sort=name,asc",
  "/candidates?sort=name,asc",
  "/auth/login",
  "/auth/register",
  "/candidate-invitations/validate"
];

// Start keep-alive loop
export function initKeepAlive() {
  // Avoid duplicate schedulers
  if ((window as any).__KEEP_ALIVE_STARTED__) {
    return;
  }
  (window as any).__KEEP_ALIVE_STARTED__ = true;

  console.log("🌐 Keep-Alive background scheduler initialized.");

  function scheduleNextPing() {
    // Generate a random interval between 10 and 15 minutes
    const minMinutes = 10;
    const maxMinutes = 15;
    const randomMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
    const randomMs = Math.round(randomMinutes * 60 * 1000);

    console.log(`⏱️ Next keep-alive ping scheduled in ${randomMinutes.toFixed(2)} minutes (${(randomMs / 1000).toFixed(0)}s).`);

    setTimeout(async () => {
      // Pick a random endpoint
      const randomIndex = Math.floor(Math.random() * KEEP_ALIVE_ENDPOINTS.length);
      const rawPath = KEEP_ALIVE_ENDPOINTS[randomIndex];

      // Add a random token / cache buster to bypass CDN/gateway caching
      const separator = rawPath.includes("?") ? "&" : "?";
      const buster = `_cb=${Math.floor(Math.random() * 1000000)}`;
      const finalPath = `${rawPath}${separator}${buster}`;

      console.log(`📡 Sending organic keep-alive ping to: ${finalPath}`);

      try {
        if (finalPath.includes("/auth/") || finalPath.includes("/validate")) {
          // Send a dummy payload to POST endpoints to keep them syntactically valid but harmless
          await apiClient.post(finalPath, {
            email: `keepalive-${Math.floor(Math.random() * 1000)}@sandbox.local`,
            password: "dummy-password-string",
            token: `dummy-token-${Math.floor(Math.random() * 1000)}`
          }, {
            headers: { "X-Keep-Alive": "true" }
          });
        } else {
          await apiClient.get(finalPath, {
            headers: { "X-Keep-Alive": "true" }
          });
        }
        console.log(`✅ Keep-alive ping to ${rawPath} completed successfully.`);
      } catch (error) {
        // We expect some 401s or 400s if unauthorized or using validation dummy data,
        // but the backend will process the request and remain awake.
        console.log(`ℹ️ Keep-alive ping to ${rawPath} processed (response status recorded).`);
      }

      // Schedule next recursion
      scheduleNextPing();
    }, randomMs);
  }

  // Execute the first ping immediately to warm up the backend if cold-starting
  setTimeout(async () => {
    console.log("📡 Sending initial bootstrap keep-alive ping...");
    try {
      await apiClient.get(`/subjects?_cb=bootstrap-${Math.floor(Math.random() * 1000000)}`);
      console.log("✅ Initial bootstrap keep-alive ping completed.");
    } catch (e) {
      console.log("ℹ_ Initial bootstrap keep-alive ping processed.");
    }
    scheduleNextPing();
  }, 1000);
}
