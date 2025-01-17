//@ts-check
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  Utxo,
  createTransaction,
  Provider as LightProvider,
  confirmConfig,
  Action,
  TestRpc,
  User,
  ProgramUtxoBalance,
  airdropSol,
  PspTransactionInput,
  getSystemProof,
  MerkleTreeConfig,
  lightPsp4in4outAppStorageId,
  IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
  MERKLE_TREE_SET,
  createProofInputs,
  SolanaTransactionInputs,
  sendAndConfirmCompressedTransaction,
  getVerifierProgramId,
  compressProgramUtxo,
  createProgramOutUtxo,
  createOutUtxo,
  createDataHashWithDefaultHashingSchema,
} from "@lightprotocol/zk.js";
import { WasmFactory } from "@lightprotocol/account.rs";
import { SystemProgram, PublicKey, Keypair } from "@solana/web3.js";

import { BN } from "@coral-xyz/anchor";
import { IDL } from "../target/types/{{rust-name}}";
const path = require("path");

const verifierProgramId = new PublicKey("{{program-id}}");
let WASM;

const RPC_URL = "http://127.0.0.1:8899";

describe("Test {{project-name}}", () => {
  process.env.ANCHOR_PROVIDER_URL = RPC_URL;
  process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local(RPC_URL, confirmConfig);
  anchor.setProvider(provider);

  before(async () => {
    WASM = await WasmFactory.getInstance();
  });

  it("Create and Spend Program Utxo ", async () => {
    const wallet = Keypair.generate();
    await airdropSol({
      connection: provider.connection,
      lamports: 1e10,
      recipientPublicKey: wallet.publicKey,
    });

    let rpc = new TestRpc({
      rpcPubkey: wallet.publicKey,
      rpcRecipientSol: wallet.publicKey,
      rpcFee: new BN(100000),
      payer: wallet,
      connection: provider.connection,
      lightWasm: WASM,
    });

    // The light provider is a connection and wallet abstraction.
    // The wallet is used to derive the seed for your compressed keypair with a signature.
    var lightProvider = await LightProvider.init({
      wallet,
      url: RPC_URL,
      rpc,
      confirmConfig,
    });
    lightProvider.addVerifierProgramPublickeyToLookUpTable(
      getVerifierProgramId(IDL)
    );

    const user: User = await User.init({ provider: lightProvider });
    const utxoData = { x: new BN(1), y: new BN(2) };
    const outputUtxoSol = createProgramOutUtxo({
      lightWasm: WASM,
      assets: [SystemProgram.programId],
      amounts: [new BN(1_000_000)],
      data: utxoData,
      ownerIdl: IDL,
      owner: verifierProgramId,
      type: "utxo",
      dataHash: createDataHashWithDefaultHashingSchema(utxoData, WASM),
    });

    const testInputsCompress = {
      utxo: outputUtxoSol,
      action: Action.COMPRESS,
    };

    let storeTransaction = await compressProgramUtxo({
      account: user.account,
      appUtxo: testInputsCompress.utxo,
      provider: user.provider,
    });
    console.log("store program utxo transaction hash ", storeTransaction);

    const programUtxoBalance: Map<string, ProgramUtxoBalance> =
      await user.syncStorage(IDL);
    const compressedUtxoCommitmentHash = testInputsCompress.utxo.hash;
    const inputUtxo = programUtxoBalance
      .get(verifierProgramId.toBase58())!
      .tokenBalances.get(testInputsCompress.utxo.assets[1].toBase58())!
      .utxos.get(compressedUtxoCommitmentHash.toString())!;
    assert.equal(
      inputUtxo.hash.toString(),
      compressedUtxoCommitmentHash.toString()
    );
    if (!("data" in inputUtxo)) throw new Error("no data in inputUtxo");
    if ("data" in inputUtxo) {
      assert.equal(inputUtxo.data.x.toString(), "1");
      assert.equal(inputUtxo.data.y.toString(), "2");
    }

    const circuitPath = path.join(
      `build-circuit/${"{{project-name}}"}/${"{{circom-name-camel-case}}"}`
    );

    const pspTransactionInput: PspTransactionInput = {
      proofInputs: {
        publicZ: inputUtxo.data.x.add(inputUtxo.data.y),
      },
      path: circuitPath,
      verifierIdl: IDL,
      circuitName: "{{circom-name-camel-case}}",
      checkedInUtxos: [{ type: "inputUtxo", utxo: inputUtxo }],
    };
    const changeAmountSol = inputUtxo.amounts[0].sub(rpc.getRpcFee());

    const changeUtxo = createOutUtxo({
      lightWasm: WASM,
      owner: user.account.keypair.publicKey,
      amounts: [changeAmountSol],
      assets: [SystemProgram.programId],
    });
    const inputUtxos = [inputUtxo];
    const outputUtxos = [changeUtxo];
    const compressedTransaction = await createTransaction({
      inputUtxos,
      outputUtxos,
      merkleTreeSetPubkey: MERKLE_TREE_SET,
      rpcPublicKey: rpc.accounts.rpcPubkey,
      lightWasm: WASM,
      rpcFee: rpc.getRpcFee(),
      pspId: verifierProgramId,
      systemPspId: lightPsp4in4outAppStorageId,
      account: user.account,
    });

    const { root, index: rootIndex } =
      (await rpc.getMerkleRoot(MERKLE_TREE_SET))!;

    const proofInputs = createProofInputs({
      lightWasm: WASM,
      transaction: compressedTransaction,
      pspTransaction: pspTransactionInput,
      account: user.account,
      root,
    });

    const systemProof = await getSystemProof({
      account: user.account,
      systemProofInputs: proofInputs,
      verifierIdl: IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
      inputUtxos,
    });

    const pspProof = await user.account.getProofInternal({
      firstPath: pspTransactionInput.path,
      verifierIdl: pspTransactionInput.verifierIdl,
      proofInput: proofInputs,
      inputUtxos,
    });
    const solanaTransactionInputs: SolanaTransactionInputs = {
      action: Action.TRANSFER,
      merkleTreeSet: MERKLE_TREE_SET,
      systemProof,
      pspProof,
      publicTransactionVariables: compressedTransaction.public,
      pspTransactionInput,
      rpcRecipientSol: rpc.accounts.rpcRecipientSol,
      systemPspIdl: IDL_LIGHT_PSP4IN4OUT_APP_STORAGE,
      rootIndex,
    };

    const { txHash } = await sendAndConfirmCompressedTransaction({
      solanaTransactionInputs,
      provider: user.provider,
    });

    console.log("transaction hash ", txHash);
    const utxoSpent = await user.getUtxo(inputUtxo.hash.toString(), true, IDL);
    assert.equal(utxoSpent!.status, "spent");
  });
});
