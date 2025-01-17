import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  Keypair as SolanaKeypair,
  SystemProgram,
} from "@solana/web3.js";
import { Idl } from "@coral-xyz/anchor";
const token = require("@solana/spl-token");

// TODO: add and use namespaces in SDK
import {
  Utxo,
  LOOK_UP_TABLE,
  ADMIN_AUTH_KEYPAIR,
  AUTHORITY,
  MINT,
  Provider,
  AUTHORITY_ONE,
  createTestAccounts,
  userTokenAccount,
  FEE_ASSET,
  confirmConfig,
  User,
  TestRpc,
  TestTransaction,
  IDL_LIGHT_PSP2IN2OUT,
  IDL_LIGHT_PSP10IN2OUT,
  IDL_LIGHT_PSP2IN2OUT_STORAGE,
  Account,
  airdropSol,
  MerkleTreeConfig,
  RPC_FEE,
  BN_0,
  airdropSplToAssociatedTokenAccount,
  getSystemProof,
  createSystemProofInputs,
  createSolanaInstructions,
  getSolanaRemainingAccounts,
  CompressTransactionInput,
  createCompressTransaction,
  prepareAccounts,
  getVerifierProgramId,
  createDecompressTransaction,
  DecompressTransactionInput,
  syncInputUtxosMerkleProofs,
  createOutUtxo,
  OutUtxo,
  MERKLE_TREE_SET,
} from "../../src";
import { WasmFactory, LightWasm } from "@lightprotocol/account.rs";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

let WASM: LightWasm;
let RPC: TestRpc;
let ACCOUNT: Account;

// TODO: remove deprecated function calls
describe("verifier_program", () => {
  // Configure the client to use the local cluster.
  process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";
  process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";

  const provider = anchor.AnchorProvider.local(
    "http://127.0.0.1:8899",
    confirmConfig,
  );
  anchor.setProvider(provider);

  before("init test setup Merkle tree lookup table etc", async () => {
    await createTestAccounts(provider.connection, userTokenAccount);

    WASM = await WasmFactory.getInstance();
    const seed = bs58.encode(new Uint8Array(32).fill(1));
    ACCOUNT = Account.createFromSeed(WASM, seed);

    const rpcRecipientSol = SolanaKeypair.generate().publicKey;

    await provider.connection.requestAirdrop(rpcRecipientSol, 2e9);

    RPC = new TestRpc({
      rpcPubkey: ADMIN_AUTH_KEYPAIR.publicKey,
      rpcRecipientSol,
      rpcFee: RPC_FEE,
      payer: ADMIN_AUTH_KEYPAIR,
      connection: provider.connection,
      lightWasm: WASM,
    });
  });

  it("Provider", async () => {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        ADMIN_AUTH_KEYPAIR.publicKey,
        10_000_000_0000,
      ),
      "confirmed",
    );
    const mockKeypair = SolanaKeypair.generate();
    await airdropSol({
      connection: provider.connection,
      lamports: 1e9,
      recipientPublicKey: mockKeypair.publicKey,
    });
    const lightProviderMock = await Provider.init({
      wallet: mockKeypair,
      rpc: RPC,
      confirmConfig,
    });
    assert.equal(lightProviderMock.wallet.isNodeWallet, true);
    assert.equal(
      lightProviderMock.wallet?.publicKey.toBase58(),
      mockKeypair.publicKey.toBase58(),
    );
    assert.equal(lightProviderMock.url, "http://127.0.0.1:8899");
    assert(lightProviderMock.lightWasm);
  });

  it("Compress (verifier one)", async () => {
    await performCompress({
      delegate: AUTHORITY_ONE,
      spl: true,
      shuffleEnabled: false,
      verifierIdl: IDL_LIGHT_PSP10IN2OUT,
    });
  });

  it("Compress (verifier storage)", async () => {
    await performCompress({
      delegate: AUTHORITY,
      spl: false,
      message: Buffer.alloc(900).fill(1),
      shuffleEnabled: false,
      verifierIdl: IDL_LIGHT_PSP2IN2OUT_STORAGE,
    });
  });

  it("Compress (verifier zero)", async () => {
    await performCompress({
      delegate: AUTHORITY,
      spl: true,
      shuffleEnabled: true,
      verifierIdl: IDL_LIGHT_PSP2IN2OUT,
    });
  });

  it("Decompress (verifier zero)", async () => {
    await performDecompress({
      outputUtxos: [],
      tokenProgram: MINT,
      spl: true,
      shuffleEnabled: false,
      verifierIdl: IDL_LIGHT_PSP2IN2OUT,
    });
  });

  it("Decompress (verifier storage)", async () => {
    await performDecompress({
      outputUtxos: [],
      tokenProgram: SystemProgram.programId,
      message: Buffer.alloc(900).fill(1),
      shuffleEnabled: false,
      spl: false,
      verifierIdl: IDL_LIGHT_PSP2IN2OUT_STORAGE,
    });
  });

  it("Decompress (verifier one)", async () => {
    const lightProvider = await Provider.init({
      wallet: ADMIN_AUTH_KEYPAIR,
      rpc: RPC,
      confirmConfig,
    });
    const user: User = await User.init({
      provider: lightProvider,
      account: ACCOUNT,
    });
    const inputUtxos: Utxo[] = [
      user.balance.tokenBalances.get(MINT.toBase58())!.utxos.values().next()
        .value,
    ];

    const utxo = createOutUtxo({
      lightWasm: WASM,
      owner: new anchor.BN(inputUtxos[0].owner),
      assets: inputUtxos[0].assets,
      amounts: [BN_0, inputUtxos[0].amounts[1]],
    });

    await performDecompress({
      outputUtxos: [utxo],
      tokenProgram: MINT,
      shuffleEnabled: true,
      verifierIdl: IDL_LIGHT_PSP10IN2OUT,
    });
  });

  const performCompress = async ({
    delegate,
    spl = false,
    message,
    shuffleEnabled = true,
    verifierIdl,
  }: {
    delegate: anchor.web3.PublicKey;
    spl: boolean;
    message?: Buffer;
    shuffleEnabled: boolean;
    verifierIdl: Idl;
  }) => {
    if (LOOK_UP_TABLE === undefined) {
      throw "undefined LOOK_UP_TABLE";
    }

    const compressAmount = spl
      ? 10_000 + Math.floor(Math.random() * 1_000_000_000)
      : 0;
    const compressFeeAmount =
      10_000 + Math.floor(Math.random() * 1_000_000_000);

    await airdropSplToAssociatedTokenAccount(
      provider.connection,
      10e9,
      ADMIN_AUTH_KEYPAIR.publicKey,
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      ADMIN_AUTH_KEYPAIR,
      MINT,
      ADMIN_AUTH_KEYPAIR.publicKey,
    );
    await token.approve(
      provider.connection,
      ADMIN_AUTH_KEYPAIR,
      tokenAccount.address,
      delegate, // delegate
      ADMIN_AUTH_KEYPAIR.publicKey, // owner
      compressAmount * 2,
      [ADMIN_AUTH_KEYPAIR],
    );
    const senderSpl = spl ? tokenAccount.address : undefined;
    const lightProvider = await Provider.init({
      wallet: ADMIN_AUTH_KEYPAIR,
      rpc: RPC,
      confirmConfig,
    });

    const compressUtxo = spl
      ? createOutUtxo({
          lightWasm: WASM,
          assets: [FEE_ASSET, MINT],
          amounts: [
            new anchor.BN(compressFeeAmount),
            new anchor.BN(compressAmount),
          ],
          owner: ACCOUNT.keypair.publicKey,
        })
      : createOutUtxo({
          lightWasm: WASM,
          amounts: [new anchor.BN(compressFeeAmount)],
          owner: ACCOUNT.keypair.publicKey,
          assets: [FEE_ASSET],
        });

    const compressTransactionInput: CompressTransactionInput = {
      lightWasm: WASM,
      mint: compressAmount > 0 ? MINT : undefined,
      message,
      merkleTreeSetPubkey: MERKLE_TREE_SET,
      senderSpl,
      signer: ADMIN_AUTH_KEYPAIR.publicKey,
      systemPspId: getVerifierProgramId(verifierIdl),
      account: ACCOUNT,
      outputUtxos: [compressUtxo],
    };

    const compressTransaction = await createCompressTransaction(
      compressTransactionInput,
    );
    const { root, index: rootIndex } =
      (await RPC.getMerkleRoot(MERKLE_TREE_SET))!;

    const systemProofInputs = createSystemProofInputs({
      root,
      transaction: compressTransaction,
      lightWasm: WASM,
      account: ACCOUNT,
    });
    const systemProof = await getSystemProof({
      account: ACCOUNT,
      inputUtxos: compressTransaction.private.inputUtxos,
      verifierIdl,
      systemProofInputs,
    });
    const remainingSolanaAccounts = getSolanaRemainingAccounts(
      systemProof.parsedPublicInputsObject as any,
    );
    const accounts = prepareAccounts({
      transactionAccounts: compressTransaction.public.accounts,
      eventMerkleTreePubkey: MERKLE_TREE_SET,
    });
    // createSolanaInstructionsWithAccounts
    const instructions = await createSolanaInstructions({
      action: compressTransaction.action,
      rootIndex,
      systemProof,
      remainingSolanaAccounts,
      accounts,
      publicTransactionVariables: compressTransaction.public,
      systemPspIdl: verifierIdl,
    });

    const transactionTester = new TestTransaction({
      transaction: compressTransaction,
      accounts,
      provider: lightProvider,
    });
    await transactionTester.getTestValues();
    await lightProvider.sendAndConfirmSolanaInstructions(instructions);

    // TODO: check why encryptedUtxo check doesn't work
    await transactionTester.checkBalances(
      { publicInputs: systemProof.parsedPublicInputsObject },
      remainingSolanaAccounts,
      systemProofInputs,
    );
  };

  const performDecompress = async ({
    outputUtxos,
    tokenProgram,
    message,
    spl,
    shuffleEnabled = true,
    verifierIdl,
  }: {
    outputUtxos: Array<OutUtxo>;
    tokenProgram: anchor.web3.PublicKey;
    message?: Buffer;
    spl?: boolean;
    shuffleEnabled: boolean;
    verifierIdl: Idl;
  }) => {
    const lightProvider = await Provider.init({
      wallet: ADMIN_AUTH_KEYPAIR,
      rpc: RPC,
      confirmConfig,
    });
    const user = await User.init({
      provider: lightProvider,
      account: ACCOUNT,
    });

    const origin = Keypair.generate();
    await airdropSol({
      connection: lightProvider.provider.connection,
      lamports: 1000 * 1e9,
      recipientPublicKey: origin.publicKey,
    });
    const ata = await getAssociatedTokenAddress(MINT, origin.publicKey);

    const decompressUtxo = user.balance.tokenBalances
      .get(tokenProgram.toBase58())!
      .utxos.values()
      .next().value;
    const {
      syncedUtxos,
      root,
      index: rootIndex,
    } = await syncInputUtxosMerkleProofs({
      inputUtxos: [decompressUtxo],
      merkleTreePublicKey: MERKLE_TREE_SET,
      rpc: RPC,
    });
    // Running into memory issues with verifier one (10in2out) decompressing spl
    const decompressTransactionInput: DecompressTransactionInput = {
      lightWasm: WASM,
      mint: spl ? MINT : undefined,
      message,
      merkleTreeSetPubkey: MERKLE_TREE_SET,
      recipientSpl: spl ? ata : undefined,
      recipientSol: origin.publicKey,
      rpcPublicKey: lightProvider.rpc.accounts.rpcPubkey,
      systemPspId: getVerifierProgramId(verifierIdl),
      account: ACCOUNT,
      inputUtxos: syncedUtxos,
      outputUtxos,
      rpcFee: user.provider.rpc.getRpcFee(true),
      ataCreationFee: spl ? spl : false,
    };

    const decompressTransaction = await createDecompressTransaction(
      decompressTransactionInput,
    );

    const systemProofInputs = createSystemProofInputs({
      transaction: decompressTransaction,
      lightWasm: WASM,
      account: ACCOUNT,
      root,
    });
    const systemProof = await getSystemProof({
      account: ACCOUNT,
      inputUtxos: decompressTransaction.private.inputUtxos,
      verifierIdl,
      systemProofInputs,
    });

    const remainingSolanaAccounts = getSolanaRemainingAccounts(
      systemProof.parsedPublicInputsObject as any,
    );
    const accounts = prepareAccounts({
      transactionAccounts: decompressTransaction.public.accounts,
      rpcRecipientSol: lightProvider.rpc.accounts.rpcRecipientSol,
      signer: lightProvider.rpc.accounts.rpcPubkey,
    });
    // createSolanaInstructionsWithAccounts
    const instructions = await createSolanaInstructions({
      action: decompressTransaction.action,
      rootIndex,
      systemProof,
      remainingSolanaAccounts,
      accounts,
      publicTransactionVariables: decompressTransaction.public,
      systemPspIdl: verifierIdl,
    });
    const transactionTester = new TestTransaction({
      transaction: decompressTransaction,
      accounts,
      provider: lightProvider,
    });
    await transactionTester.getTestValues();
    await lightProvider.rpc.sendAndConfirmSolanaInstructions(
      instructions,
      lightProvider.provider.connection,
      undefined,
      undefined,
      lightProvider,
    );

    await transactionTester.checkBalances(
      { publicInputs: systemProof.parsedPublicInputsObject },
      remainingSolanaAccounts,
      systemProofInputs,
    );
  };
});
