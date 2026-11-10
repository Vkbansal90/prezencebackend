// Preload for machines whose local DNS proxy refuses SRV lookups (Atlas needs them):
//   node --import ./scripts/publicDns.js app.js
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
