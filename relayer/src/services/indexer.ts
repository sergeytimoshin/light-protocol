import { IndexedTransaction, indexRecentTransactions } from "light-sdk";
import { DB_VERSION } from "config";
import { recentTxQueue } from "./redis";
import { Connection } from "@solana/web3.js";
import { Job } from "bullmq";

export async function getIndexedTransactions(req: any, res: any) {
  try {
    let version = DB_VERSION;
    console.time("getWaiting");
    const job = (await recentTxQueue.getWaiting())[version]; // 3: added comm
    console.timeEnd("getWaiting");
    if (!job || !job.data.transactions) {
      return res.status(200).json({ transactions: [] });
    }
    console.log(
      `/history: returning ${job.data.transactions.length} transactions`,
    );
    console.time("sort");
    const transactions = job.data.transactions.sort(
      (a: IndexedTransaction, b: IndexedTransaction) =>
        b.blockTime - b.blockTime,
    );
    console.timeEnd("sort");
    const lastFetched = job.data.lastFetched;

    return res.status(200).json({
      lastFetched,
      length: transactions.length,
      first: transactions[transactions.length - 1].blockTime,
      data: transactions, // stringifiedIndexTransactions
    });
  } catch (e) {
    return res.status(500).json({ status: "error", message: e.message });
  }
}

export async function searchForward(job: Job, connection: Connection) {
  if (job.data.transactions.length === 0) return [];
  console.time("@searchfwd reduce");
  let mostRecentTransaction = job.data.transactions.reduce(
    (a: IndexedTransaction, b: IndexedTransaction) =>
      a.blockTime > b.blockTime ? a : b,
  );
  console.timeEnd("@searchfwd reduce");
  let batchOptions = {
    limit: 5, // this could be just 2-3?
    after: mostRecentTransaction.signature,
  };

  let newerTransactions = await indexRecentTransactions({
    connection,
    batchOptions,
    dedupe: false,
  });

  return newerTransactions;
}

export async function searchBackward(job: Job, connection: Connection) {
  let oldestTransaction = job.data.transactions.reduce(
    (a: IndexedTransaction, b: IndexedTransaction) =>
      a.blockTime < b.blockTime ? a : b,
  );
  const batchOptions = {
    limit: 200,
    before:
      job.data.transactions.length === 0
        ? undefined
        : oldestTransaction.signature,
  };

  let olderTransactions: IndexedTransaction[] = await indexRecentTransactions({
    connection,
    batchOptions,
    dedupe: false,
  });
  return olderTransactions;
}

export function mergeAndSortTransactions(
  dbTransactions: IndexedTransaction[],
  newTransactions: IndexedTransaction[][],
) {
  let mergedTransactions: IndexedTransaction[] = dbTransactions.concat(
    ...newTransactions,
  );
  let dedupedTransactions = mergedTransactions.reduce(
    (acc: IndexedTransaction[], cur: IndexedTransaction) => {
      if (cur && !acc.find((item) => item.signature === cur.signature)) {
        acc.push(cur);
      }
      return acc;
    },
    [],
  );
  dedupedTransactions.sort(
    (a: IndexedTransaction, b: IndexedTransaction) => b.blockTime - a.blockTime,
  );
  return dedupedTransactions;
}
