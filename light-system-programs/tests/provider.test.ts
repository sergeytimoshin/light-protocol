import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair as SolanaKeypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import _ from "lodash";
import { assert } from "chai";
import {
  Account,
  Action,
  KEYPAIR_PRIVKEY,
  Provider as LightProvider,
  Relayer,
  Transaction,
  TransactionParameters,
  userTokenAccount,
  IDL_VERIFIER_PROGRAM_ZERO,
  airdropSol,
} from "@lightprotocol/zk.js";

let circomlibjs = require("circomlibjs");

// TODO: add and use  namespaces in SDK
import {
  Utxo,
  setUpMerkleTree,
  initLookUpTableFromFile,
  merkleTreeProgramId,
  ADMIN_AUTH_KEYPAIR,
  MINT,
  Provider,
  createTestAccounts,
  confirmConfig,
  DEFAULT_ZERO,
  TRANSACTION_MERKLE_TREE_KEY,
  TestRelayer,
  LOOK_UP_TABLE,
} from "@lightprotocol/zk.js";

import { BN } from "@coral-xyz/anchor";

var POSEIDON, KEYPAIR;
var RELAYER;

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

  const userKeypair = ADMIN_AUTH_KEYPAIR;

  before("init test setup Merkle tree lookup table etc ", async () => {
    let initLog = console.log;
    // console.log = () => {};
    await createTestAccounts(provider.connection);

    POSEIDON = await circomlibjs.buildPoseidonOpt();
    KEYPAIR = new Account({
      poseidon: POSEIDON,
      seed: KEYPAIR_PRIVKEY.toString(),
    });

    const relayerRecipientSol = SolanaKeypair.generate().publicKey;

    await provider.connection.requestAirdrop(
      relayerRecipientSol,
      2_000_000_000,
    );

    RELAYER = await new TestRelayer(
      userKeypair.publicKey,
      LOOK_UP_TABLE,
      relayerRecipientSol,
      new BN(100000),
      new BN(10_100_000),
      userKeypair,
    );
  });

  it("Provider", async () => {
    let connection = new Connection("http://127.0.0.1:8899", "confirmed");
    await connection.confirmTransaction(
      await connection.requestAirdrop(
        ADMIN_AUTH_KEYPAIR.publicKey,
        10_000_000_0000,
      ),
      "confirmed",
    );
    const mockKeypair = SolanaKeypair.generate();
    await airdropSol({
      provider,
      amount: 1e9,
      recipientPublicKey: mockKeypair.publicKey,
    });
    const lightProviderMock = await LightProvider.init({
      wallet: mockKeypair,
      relayer: RELAYER,
    });
    assert.equal(lightProviderMock.wallet.isNodeWallet, true);
    assert.equal(
      lightProviderMock.wallet?.publicKey.toBase58(),
      mockKeypair.publicKey.toBase58(),
    );
    assert.equal(lightProviderMock.url, "http://127.0.0.1:8899");
    assert(lightProviderMock.poseidon);
    assert(lightProviderMock.lookUpTable);
    assert.equal(
      lightProviderMock.solMerkleTree?.pubkey.toBase58(),
      TRANSACTION_MERKLE_TREE_KEY.toBase58(),
    );
    assert.equal(lightProviderMock.solMerkleTree?.merkleTree.levels, 18);
    assert.equal(
      lightProviderMock.solMerkleTree?.merkleTree.zeroElement,
      DEFAULT_ZERO,
    );
    assert.equal(
      lightProviderMock.solMerkleTree?.merkleTree._layers[0].length,
      0,
    );
  });

  it("Fetch latestMerkleTree", async () => {
    const lightProvider = await Provider.init({
      wallet: userKeypair,
      relayer: RELAYER,
    }); // userKeypair

    let depositFeeAmount = 10000;
    let depositAmount = 0;

    let deposit_utxo1 = new Utxo({
      poseidon: POSEIDON,
      assets: [SystemProgram.programId, MINT],
      amounts: [new anchor.BN(depositFeeAmount), new anchor.BN(depositAmount)],
      account: KEYPAIR,
      assetLookupTable: lightProvider.lookUpTables.assetLookupTable,
      verifierProgramLookupTable:
        lightProvider.lookUpTables.verifierProgramLookupTable,
    });
    let deposit_utxo2 = new Utxo({
      poseidon: POSEIDON,
      assetLookupTable: lightProvider.lookUpTables.assetLookupTable,
      verifierProgramLookupTable:
        lightProvider.lookUpTables.verifierProgramLookupTable,
    });

    let txParams = new TransactionParameters({
      outputUtxos: [deposit_utxo1, deposit_utxo2],
      transactionMerkleTreePubkey: TRANSACTION_MERKLE_TREE_KEY,
      senderSpl: userTokenAccount,
      senderSol: ADMIN_AUTH_KEYPAIR.publicKey,
      poseidon: POSEIDON,
      lookUpTable: LOOK_UP_TABLE,
      action: Action.SHIELD,
      transactionNonce: 0,
      verifierIdl: IDL_VERIFIER_PROGRAM_ZERO,
    });
    let tx = new Transaction({
      provider: lightProvider,
      params: txParams,
    });
    await tx.compileAndProve();

    try {
      let res = await tx.sendAndConfirmTransaction();
      console.log(res);
    } catch (e) {
      console.log(e);
    }
    // TODO: add random amount and amount checks
    try {
      console.log("updating merkle tree...");
      let initLog = console.log;
      console.log = () => {};
      await lightProvider.relayer.updateMerkleTree(
        lightProvider,
        // provider.provider,
      );
      console.log = initLog;
      console.log("✔️updated merkle tree!");
    } catch (e) {
      console.log(e);
      throw new Error("Failed to update merkle tree!");
    }
    assert.equal(
      lightProvider.solMerkleTree!.merkleTree.indexOf(
        deposit_utxo1.getCommitment(POSEIDON),
      ),
      -1,
    );
    assert.equal(
      lightProvider.solMerkleTree!.merkleTree.indexOf(
        deposit_utxo2.getCommitment(POSEIDON),
      ),
      -1,
    );

    await lightProvider.latestMerkleTree();
    assert.equal(
      lightProvider.solMerkleTree!.merkleTree.indexOf(
        deposit_utxo1.getCommitment(POSEIDON),
      ),
      0,
    );
    assert.equal(
      lightProvider.solMerkleTree!.merkleTree.indexOf(
        deposit_utxo2.getCommitment(POSEIDON),
      ),
      1,
    );
  });
});
