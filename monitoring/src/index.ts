/**
 * Monitoring module for
 * - relayer health (funding, uptime)
 * can add more checks later
 *
 */
import { Relayer, sleep } from "@lightprotocol/zk.js";
import { Connection } from "@solana/web3.js";
const interval = 60 * 1000;

/// TODO: move to a registry
const relayerUrls = [
  [
    "https://v3-devnet-relayer-7x44q.ondigitalocean.app",
    "https://api.devnet.solana.com",
  ],
];

(async () => {
  while (1) {
    for (const url of relayerUrls) {
      const relayer = await Relayer.initFromUrl(url[0]);
      const connection = new Connection(url[1]);
      const relayerSigner = relayer.accounts.relayerPubkey;
      const balance = await connection.getBalance(relayerSigner);
      console.log(`relayer lamports: ${balance} (${url[0]}, ${relayerSigner})`);
      /// TODO: push to prometheus, alert if balance is low
    }
    await sleep(interval);
  }
})();
