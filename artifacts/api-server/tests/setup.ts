import { prepareTestEnvironment } from "./test-environment";

// Vitest completes setup before evaluating any integration test module.
prepareTestEnvironment(process.env);