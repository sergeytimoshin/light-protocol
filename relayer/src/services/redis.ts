import { CONCURRENT_RELAY_WORKERS, DB_VERSION } from "../config";
import { sleep } from "light-sdk";
import "dotenv/config.js";

import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  mergeAndSortTransactions,
  searchBackward,
  searchForward,
} from "./indexer";
import { getLightProvider } from "utils/provider";
import { IndexedTransaction } from "light-sdk";
import { toUintArray } from "utils/toUintArray";
import { relayInstructions } from "./relayService";

var REDIS_connection: any;

if (process.env.ENVIRONMENT === "DEV") {
  REDIS_connection = new IORedis(
    Number(process.env.DB_PORT),
    process.env.HOSTNAME!,
    {
      username: "default",
      password: process.env.PASSWORD,
      tls: {},
      maxRetriesPerRequest: null,
    },
  );
} else if (process.env.ENVIRONMENT === "LOCAL") {
  console.log("LOCAL");
  REDIS_connection = new IORedis({ maxRetriesPerRequest: null });
}

export const getDbConnection = async () => {
  if (!REDIS_connection) {
    throw new Error("REDIS env not configured correctly!");
  }
  return REDIS_connection;
};
export const relayJobQueue = new Queue("unshielding", {
  connection: REDIS_connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export async function addRelayJobToQueue(instructions: any[], nonce: string) {
  let job = await relayJobQueue.add(nonce, {
    instructions: instructions,
  });
  return job;
}
// Specify Redis connection using object
export const recentTxQueue = new Queue("recentTx", {
  connection: REDIS_connection,
}); // append only store
console.log("Queues activated");

export const relayWorker = new Worker(
  "relaying",
  async (job) => {
    console.log("Relay start - id:", job.id);
    try {
      const versionedTxResponse = await relayInstructions(
        job.data.instructions,
      );
      console.log("Relay success");
    } catch (e) {
      console.log("Relay failed");
      console.log(e);
      throw e;
    }

    return true;
  },
  { connection: REDIS_connection, concurrency: CONCURRENT_RELAY_WORKERS },
);
relayWorker.on("completed", async (job: Job) => {
  let duration = Date.now() - job.timestamp;
  let message = `unshield: ${job.id} success! duration: ${duration / 1000}s`;
  console.log(message);
});

relayWorker.on("failed", async (job: any, err: any) => {
  if (job.attemptsMade < 2) {
    console.log(`unshield #${job.id} failed - retry: ${job.attemptsMade}`);
    return;
  }
  let duration = Date.now() - job.timestamp;
  let message = `${job.id} failed (${err.message}) after ${duration / 1000}s`;
  console.log(message);
  console.log("UNSHIELD JOB FAILED AFTER RETRIES/UNRECOVERABLE", job.id);
});

export const getTransactions = async (version = 3) => {
  const job = (await recentTxQueue.getWaiting())[version];
  if (job) {
    return { transactions: job.data.transactions, job };
  } else {
    let newJob = await recentTxQueue.add("recentTxJob", {
      transactions: [],
      lastFetched: 0,
    });
    console.log("Initialized RecentTx job");
    return { transactions: [], job: newJob };
  }
};

export async function indexDB(initialSync: boolean, cooldown: number = 2000) {
  await sleep(cooldown);
  const connection = (await getLightProvider()).connection!;

  const { job } = await getTransactions(DB_VERSION);
  if (job) {
    console.log(`txs in db v${DB_VERSION}: ${job.data.transactions.length}`);
  }

  let olderTransactions: IndexedTransaction[] = [];
  if (initialSync) {
    olderTransactions = await searchBackward(job, connection);
    console.log("@redis olderTransactions: ", olderTransactions.length);
    if (olderTransactions.length === 0) {
      initialSync = false;
    }
  }

  let newerTransactions = await searchForward(job, connection);

  let dedupedTransactions: IndexedTransaction[] = mergeAndSortTransactions(
    job.data.transactions,
    [olderTransactions, newerTransactions],
  );
  console.log(
    `new total: ${dedupedTransactions.length} transactions old: ${job.data.transactions.length} newer: ${newerTransactions.length}`,
  );
  await job.update({
    transactions: dedupedTransactions,
    lastFetched: Date.now(),
  });
}

const cooldown = 1000;
var initialSync = true;
/**
 * Perpetually looks for newer transactions, finds, dedupes, adds to index db
 */
(async () => {
  // Initialize DB if empty
  await getTransactions();

  while (1) {
    await indexDB(initialSync, cooldown);
  }
})();
