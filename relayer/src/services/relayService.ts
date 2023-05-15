import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { newNonce, sendVersionedTransaction, sleep } from "light-sdk";
import { getLightProvider } from "../utils/provider";
import { addRelayJobToQueue } from "./redis";

export async function relayInstructions(instructions: any[]) {
  try {
    let response;
    if (!instructions) throw new Error("Job data not set");
    if (instructions.length === 0)
      throw new Error("Job data: No instructions set");
    const provider = await getLightProvider();
    if (!provider.provider) throw new Error("no provider set");

    for (const instruction of instructions) {
      const accounts = instruction.keys.map((key: any) => {
        return {
          pubkey: new PublicKey(key.pubkey),
          isWritable: key.isWritable,
          isSigner: key.isSigner,
        };
      });

      const newInstruction = new TransactionInstruction({
        keys: accounts,
        programId: new PublicKey(instruction.programId),
        data: Buffer.from(instruction.data),
      });
      response = await sendVersionedTransaction(newInstruction, provider);
    }
    return response;
  } catch (error) {
    throw new Error(`Error in relayInstructions: ${error}`);
  }
}

export async function handleRelay(req: any, res: any) {
  if (!req.body.instructions)
    return res
      .status(500)
      .json({ status: "error", message: "missing data: instructions" });
  let instructions = JSON.parse(req.body.instructions);
  if (instructions.length !== 0)
    return res
      .status(500)
      .json({ status: "error", message: "missing data: instructions empty" });
  try {
    let nonce = String(newNonce());
    let relayJob = await addRelayJobToQueue(instructions, nonce);
    console.log("/relayunshield - added relayJob to queue", relayJob.id);
    let state;
    let i = 0;
    let maxSteps = 180;
    let cooldown = 500;
    while (i < maxSteps) {
      await sleep(cooldown);
      state = await relayJob.getState();
      if (state === "completed" || state === "failed" || state === "unknown") {
        i = 90;
        if (state === "failed") {
          console.log("/relayInstructions error (500) - failed", relayJob.id);
          return res
            .status(500)
            .json({ status: "error", message: "relay failed" });
        } else {
          console.log("/relayInstructions  success", relayJob.id);

          return res.status(200).json({ data: true });
        }
      } else {
        i++;
      }
    }
    console.log(
      "/relayunshield - fatal: this should never happen: 20min timeout",
      relayJob.id,
    );
  } catch (e) {
    console.log("/relayunshield error (555): ", e);
    return res.status(500).json({ status: "error", message: e.message });
  }
}
