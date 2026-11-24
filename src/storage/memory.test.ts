import { createMemoryStorage } from "./memory.js";
import { storageContract } from "./storage.contract.js";

storageContract("in-memory", async () => {
  const storage = createMemoryStorage();
  return { storage, reopen: () => storage };
});
