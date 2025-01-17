import { BN } from "@coral-xyz/anchor";
import { mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { WasmFactory } from "@lightprotocol/account.rs";
import { RPC_FEE, TOKEN_PUBKEY_SYMBOL, confirmConfig } from "../constants";
import { confirmTransaction } from "../transaction";
import { ConfirmOptions, User } from "../wallet";
import { TestRpc } from "./test-rpc";
import { ADMIN_AUTH_KEYPAIR, MINT } from "./constants-system-verifier";
import { Provider } from "../provider";

export async function airdropCompressedSol({
  provider,
  amount,
  seed,
  recipientPublicKey,
}: {
  provider: Provider;
  amount: number;
  seed?: string;
  recipientPublicKey?: string;
}) {
  const connection = provider?.provider?.connection;
  if (!connection) throw new Error("connection undefined");
  if (!amount) throw new Error("Sol Airdrop amount undefined");
  if (!seed && !recipientPublicKey)
    throw new Error(
      "Sol Airdrop seed and recipientPublicKey undefined define a seed to airdrop compressed sol aes encrypted, define a recipientPublicKey to airdrop compressed sol to the recipient nacl box encrypted",
    );
  const rpc = new TestRpc({
    rpcPubkey: ADMIN_AUTH_KEYPAIR.publicKey,
    rpcRecipientSol: Keypair.generate().publicKey,
    rpcFee: RPC_FEE,
    payer: ADMIN_AUTH_KEYPAIR,
    connection,
    lightWasm: provider ? provider.lightWasm : await WasmFactory.getInstance(),
  });

  const userKeypair = Keypair.generate();
  await airdropSol({
    connection,
    recipientPublicKey: userKeypair.publicKey,
    lamports: amount * 1e9,
  });

  const user: User = await User.init({ provider, seed });
  return await user.compress({
    publicAmountSol: amount,
    token: "SOL",
    recipient: recipientPublicKey,
  });
}

export async function airdropSol({
  connection,
  lamports,
  recipientPublicKey,
}: {
  connection: Connection;
  lamports: number;
  recipientPublicKey: PublicKey;
}) {
  const txHash = await connection.requestAirdrop(recipientPublicKey, lamports);
  await confirmTransaction(connection, txHash);
  return txHash;
}

/**
 * airdrops compressed spl tokens from ADMIN_AUTH_KEYPAIR to the user specified by seed if aes encrypted desired, or by recipient pubkey if nacl box encrypted (will be in utxoInbox then)
 * @param param0
 * @returns
 */
export async function airdropCompressedMINTSpl({
  provider,
  amount,
  seed,
  recipientPublicKey,
}: {
  provider?: Provider;
  amount: number;
  seed?: string;
  recipientPublicKey?: string;
}) {
  if (!amount) throw new Error("Sol Airdrop amount undefined");
  if (!seed && !recipientPublicKey)
    throw new Error(
      "Sol Airdrop seed and recipientPublicKey undefined define a seed to airdrop compressed sol aes encrypted, define a recipientPublicKey to airdrop compressed sol to the recipient nacl box encrypted",
    );
  const connection = provider?.provider?.connection;
  if (!connection) throw new Error("connection undefined");
  const rpc = new TestRpc({
    rpcPubkey: ADMIN_AUTH_KEYPAIR.publicKey,
    rpcRecipientSol: Keypair.generate().publicKey,
    rpcFee: RPC_FEE,
    payer: ADMIN_AUTH_KEYPAIR,
    connection,
    lightWasm: provider ? provider.lightWasm : await WasmFactory.getInstance(),
  });
  if (!provider) {
    provider = await Provider.init({
      wallet: ADMIN_AUTH_KEYPAIR,
      rpc: rpc,
      confirmConfig,
    });
  }

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.provider!.connection,
    ADMIN_AUTH_KEYPAIR,
    MINT,
    ADMIN_AUTH_KEYPAIR.publicKey,
  );
  if (new BN(tokenAccount.amount.toString()).toNumber() < amount) {
    await airdropSplToAssociatedTokenAccount(
      provider.provider!.connection,
      amount,
      ADMIN_AUTH_KEYPAIR.publicKey,
    );
  }

  const user: User = await User.init({ provider, seed });
  return await user.compress({
    publicAmountSpl: amount,
    token: TOKEN_PUBKEY_SYMBOL.get(MINT.toBase58())!,
    recipient: recipientPublicKey,
    skipDecimalConversions: true,
    confirmOptions: ConfirmOptions.spendable,
  });
}

export async function airdropSplToAssociatedTokenAccount(
  connection: Connection,
  lamports: number,
  recipient: PublicKey,
) {
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    ADMIN_AUTH_KEYPAIR,
    MINT,
    recipient,
  );
  return await mintTo(
    connection,
    ADMIN_AUTH_KEYPAIR,
    MINT,
    tokenAccount.address,
    ADMIN_AUTH_KEYPAIR.publicKey,
    lamports,
    [],
  );
}
