import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  IDL_USER_REGISTRY,
  userRegistryProgramId,
  confirmConfig,
  UserRegistry,
  ADMIN_AUTH_KEYPAIR,
  ADMIN_AUTH_KEY,
  createTestAccounts,
  userTokenAccount,
  Account,
  Provider,
  TestRpc,
  RPC_FEE,
} from "../../src";
import { WasmFactory } from "@lightprotocol/account.rs";
import {
  Keypair as SolanaKeypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import { assert } from "chai";

let ACCOUNT: Account, RPC: TestRpc;

describe("User registry", () => {
  // Configure the client to use the local cluster.
  process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";
  process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";

  const provider = AnchorProvider.local("http://127.0.0.1:8899", confirmConfig);
  anchor.setProvider(provider);

  const userRegistryProgram: Program<UserRegistry> = new Program(
    IDL_USER_REGISTRY,
    userRegistryProgramId,
    provider,
  );

  before("Create user", async () => {
    await createTestAccounts(provider.connection, userTokenAccount);

    const lightWasm = await WasmFactory.getInstance();
    const seed = bs58.encode(new Uint8Array(32).fill(1));
    ACCOUNT = Account.createFromSeed(lightWasm, seed);
    const rpcRecipientSol = SolanaKeypair.generate().publicKey;

    await provider.connection.requestAirdrop(rpcRecipientSol, 2_000_000_000);

    RPC = new TestRpc({
      rpcPubkey: ADMIN_AUTH_KEYPAIR.publicKey,
      rpcRecipientSol,
      rpcFee: RPC_FEE,
      payer: ADMIN_AUTH_KEYPAIR,
      connection: provider.connection,
      lightWasm,
    });

    await Provider.init({
      wallet: ADMIN_AUTH_KEYPAIR,
      rpc: RPC,
      confirmConfig,
    });
  });

  it("Register user", async () => {
    const userEntryPubkey = PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("user-entry"), ADMIN_AUTH_KEY.toBuffer()],
      userRegistryProgramId,
    )[0];
    const tx = await userRegistryProgram.methods
      .initializeUserEntry(ACCOUNT.keypair.publicKey.toArray(), [
        ...ACCOUNT.encryptionKeypair.publicKey,
      ])
      .accounts({
        signer: ADMIN_AUTH_KEYPAIR.publicKey,
        systemProgram: SystemProgram.programId,
        userEntry: userEntryPubkey,
      })
      .signers([ADMIN_AUTH_KEYPAIR])
      .transaction();
    await sendAndConfirmTransaction(
      provider.connection,
      tx,
      [ADMIN_AUTH_KEYPAIR],
      confirmConfig,
    );

    const accountInfo =
      await userRegistryProgram.account.userEntry.fetch(userEntryPubkey);
    assert.deepEqual(
      accountInfo.lightPubkey,
      ACCOUNT.keypair.publicKey.toArray(),
    );
    assert.deepEqual(accountInfo.lightEncryptionPubkey, [
      ...ACCOUNT.encryptionKeypair.publicKey,
    ]);
    assert.deepEqual(
      new Uint8Array(accountInfo.solanaPubkey),
      ADMIN_AUTH_KEY.toBytes(),
    );
  });
});
