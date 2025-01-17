import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  TransactionConfirmationStrategy,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  AnchorProvider,
  BN,
  BorshAccountsCoder,
  Program,
} from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

import { LightWasm } from "@lightprotocol/account.rs";

import { Rpc } from "../rpc";
import { fetchRecentTransactions } from "../transaction";
import {
  ParsedIndexedTransaction,
  PrioritizationFee,
  RpcIndexedTransaction,
  RpcIndexedTransactionResponse,
  SignaturesWithBlockhashInfo,
} from "../types";
import { Provider } from "../provider";
import { IDL_LIGHT_MERKLE_TREE_PROGRAM, LightMerkleTreeProgram } from "../idls";
import { MerkleTreeConfig, SolMerkleTree } from "../merkle-tree";
import {
  BN_0,
  UTXO_PREFIX_LENGTH,
  confirmConfig,
  merkleTreeProgramId,
  MERKLE_TREE_SET,
} from "../constants";
import { RpcError, TransactionErrorCode } from "../errors";
import { serializeOnchainMerkleTree } from "../merkle-tree";

export class TestRpc extends Rpc {
  // @ts-ignore
  indexedTransactions: RpcIndexedTransaction[] = [];
  rpcKeypair: Keypair;
  connection: Connection;
  merkleTrees: SolMerkleTree[] = [];
  lightWasm: LightWasm;
  merkleTreeProgram: Program<LightMerkleTreeProgram>;
  constructor({
    rpcPubkey,
    rpcRecipientSol,
    merkleTreeSet = MERKLE_TREE_SET,
    rpcFee = BN_0,
    highRpcFee,
    payer,
    connection,
    lightWasm,
  }: {
    rpcPubkey: PublicKey;
    rpcRecipientSol?: PublicKey;
    merkleTreeSet?: PublicKey;
    rpcFee: BN;
    highRpcFee?: BN;
    payer: Keypair;
    connection: Connection;
    lightWasm: LightWasm;
  }) {
    super({ rpcPubkey, rpcRecipientSol, merkleTreeSet, rpcFee, highRpcFee });
    if (payer.publicKey.toBase58() != rpcPubkey.toBase58())
      throw new Error(
        `Payer public key ${payer.publicKey.toBase58()} does not match rpc public key ${rpcPubkey.toBase58()}`,
      );
    this.rpcKeypair = payer;
    this.connection = connection;
    const solMerkleTree = new SolMerkleTree({
      lightWasm,
      pubkey: this.accounts.merkleTreeSet,
    });
    this.merkleTrees.push(solMerkleTree);
    this.lightWasm = lightWasm;
    this.merkleTreeProgram = new Program(
      IDL_LIGHT_MERKLE_TREE_PROGRAM,
      merkleTreeProgramId,
      new AnchorProvider(connection, {} as any, {}),
    );
  }

  /**
   * Wraps Same as provider.sendAndConfirmTransaction but using Light RPC node
   * Convenience function for sending and confirming instructions via Light RPC node.
   * Routes instructions to Light RPC node and confirms the last transaction signature.
   */
  async sendAndConfirmSolanaInstructions(
    ixs: TransactionInstruction[],
    connection: Connection,
    confirmOptions?: ConfirmOptions,
    /// TODO: Once we pick up gasless transactions: add prioritization fee onto rpcFee if used. Add test.
    prioritizationFee?: PrioritizationFee,
    /*
     * TODO: we can remove the _provider param if we provide a method to get a static txlookuptable without using provider!
     */
    provider?: Provider,
  ): Promise<TransactionSignature[]> {
    const {
      signatures,
      blockhashInfo: { lastValidBlockHeight, blockhash },
    } = await this.sendSolanaInstructions(ixs, prioritizationFee, provider!);

    const lastTxIndex = signatures.length - 1;

    const strategy: TransactionConfirmationStrategy = {
      signature: signatures[lastTxIndex],
      lastValidBlockHeight,
      blockhash,
    };
    await connection.confirmTransaction(strategy, confirmOptions?.commitment);

    return signatures;
  }

  /**
   * Mocks sending a transaction to the relayer, executes by itself
   * Contrary to the actual relayer response, this mock has already
   * confirmed the transaction by the time it returns
   */
  async sendSolanaInstructions(
    ixs: TransactionInstruction[],
    prioritizationFee?: bigint,
    provider?: Provider,
  ): Promise<SignaturesWithBlockhashInfo> {
    /** We mock the internal relayer server logic and must init a provider with the relayerKeypair */
    provider = await Provider.init({
      wallet: this.rpcKeypair,
      rpc: this,
      confirmConfig,
      versionedTransactionLookupTable:
        provider!.lookUpTables.versionedTransactionLookupTable,
    });

    /** Mock return type of relayer server */
    const blockhashInfo = await provider!.connection!.getLatestBlockhash();

    const signatures = await provider!.sendAndConfirmSolanaInstructions(
      ixs,
      undefined,
      prioritizationFee,
      blockhashInfo,
    );
    return { signatures, blockhashInfo };
  }

  /**
   * Indexes light transactions by:
   * - getting all signatures the merkle tree was involved in
   * - trying to extract and parse event cpi for every signature's transaction
   * - if there are indexed transactions already in the rpc object only transactions after the last indexed event are indexed
   * @param connection
   * @returns
   */
  // @ts-ignore
  async getIndexedTransactions(
    connection: Connection,
  ): Promise<RpcIndexedTransaction[]> {
    const merkleTreeAccountInfo = await connection.getAccountInfo(
      this.accounts.merkleTreeSet,
      "confirmed",
    );
    if (!merkleTreeAccountInfo)
      throw new Error("Failed to fetch merkle tree account");
    const coder = new BorshAccountsCoder(IDL_LIGHT_MERKLE_TREE_PROGRAM);
    const merkleTreeAccount = coder.decode(
      "merkleTreeSet",
      merkleTreeAccountInfo.data,
    );
    const stateMerkleTree = serializeOnchainMerkleTree(
      merkleTreeAccount.stateMerkleTree,
    );

    // limits the number of signatures which are queried
    // if the number is too low it is not going to index all transactions
    // hence the dependency on the merkle tree account index times 260 transactions
    // which is approximately the number of transactions sent to send one compressed transaction and update the merkle tree
    const limit = 1000 + 260 * stateMerkleTree.nextIndex.toNumber();
    if (this.indexedTransactions.length === 0) {
      const { transactions: newTransactions } = await fetchRecentTransactions({
        connection,
        batchOptions: {
          limit,
        },
      });
      this.indexedTransactions = newTransactions;
      return this.indexedTransactions;
    } else {
      if (this.indexedTransactions.length === 0) return [];

      const mostRecentTransaction = this.indexedTransactions.reduce((a, b) =>
        a.transaction.blockTime > b.transaction.blockTime ? a : b,
      );

      const { transactions: newTransactions } = await fetchRecentTransactions({
        connection,
        batchOptions: {
          limit,
          until: mostRecentTransaction.transaction.signature,
        },
      });
      this.indexedTransactions = [
        ...this.indexedTransactions,
        ...newTransactions,
      ];
      return this.indexedTransactions;
    }
  }

  async syncMerkleTree(
    merkleTreePubkey: PublicKey,
    indexedTransactions: ParsedIndexedTransaction[],
  ): Promise<SolMerkleTree> {
    const solMerkleTreeIndex = this.merkleTrees.findIndex((tree) =>
      tree.pubkey.equals(merkleTreePubkey),
    );
    const rebuiltMt = await SolMerkleTree.build({
      lightWasm: this.lightWasm,
      pubkey: merkleTreePubkey,
      indexedTransactions,
    });
    this.merkleTrees[solMerkleTreeIndex] = rebuiltMt;
    return rebuiltMt;
  }

  async getEventById(
    merkleTreePdaPublicKey: PublicKey,
    id: string,
    _variableNameID: number,
  ): Promise<RpcIndexedTransactionResponse | undefined> {
    const indexedTransactions = await this.getIndexedTransactions(
      this.connection,
    );
    const indexedTransaction = indexedTransactions.find((trx) =>
      trx.IDs.includes(id),
    )?.transaction;
    if (!indexedTransaction) return undefined;
    const merkleTree = await this.syncMerkleTree(
      merkleTreePdaPublicKey,
      indexedTransactions.map((trx) => trx.transaction),
    );
    return createRpcIndexedTransactionResponse(indexedTransaction, merkleTree);
  }

  async getEventsByIdBatch(
    ids: string[],
    variableNameID: number,
  ): Promise<RpcIndexedTransactionResponse[] | undefined> {
    const indexedTransactions = await this.getIndexedTransactions(
      this.connection,
    );
    const indexedTransactionsById = indexedTransactions.filter((trx) =>
      trx.IDs.some((id) => ids.includes(id)),
    );
    const merkleTree = await this.syncMerkleTree(
      this.accounts.merkleTreeSet,
      indexedTransactions.map((trx) => trx.transaction),
    );
    return indexedTransactionsById.map((trx) =>
      createRpcIndexedTransactionResponse(trx.transaction, merkleTree),
    );
  }

  async getMerkleProofByIndexBatch(
    indexes: number[],
  ): Promise<
    { merkleProofs: string[][]; root: string; index: number } | undefined
  > {
    const indexedTransactions = await this.getIndexedTransactions(
      this.connection,
    );
    const merkleTree = await this.syncMerkleTree(
      this.accounts.merkleTreeSet,
      indexedTransactions.map((trx) => trx.transaction),
    );
    if (!merkleTree) return undefined;
    const index = await getRootIndex(
      this.merkleTreeProgram,
      merkleTree.pubkey,
      merkleTree.merkleTree.root(),
    );

    return {
      merkleProofs: indexes.map(
        (index) => merkleTree.merkleTree.path(index).pathElements,
      ),
      root: merkleTree.merkleTree.root(),
      index: index.toNumber(),
    };
  }

  async getMerkleRoot(): Promise<{ root: string; index: number } | undefined> {
    const indexedTransactions = await this.getIndexedTransactions(
      this.connection,
    );
    const merkleTree = await this.syncMerkleTree(
      this.accounts.merkleTreeSet,
      indexedTransactions.map((trx) => trx.transaction),
    );
    const index = await getRootIndex(
      this.merkleTreeProgram,
      merkleTree.pubkey,
      merkleTree.merkleTree.root(),
    );
    return { root: merkleTree.merkleTree.root(), index: index.toNumber() };
  }
}

export async function getRootIndex(
  merkleTreeProgram: Program<LightMerkleTreeProgram>,
  merkleTreePublicKey: PublicKey,
  root: string,
) {
  const rootBytes = new BN(root).toArray("be", 32);
  const merkleTreeSetData = await merkleTreeProgram.account.merkleTreeSet.fetch(
    merkleTreePublicKey,
    "confirmed",
  );
  const stateMerkleTree = serializeOnchainMerkleTree(
    merkleTreeSetData.stateMerkleTree,
  );
  let rootIndex: BN | undefined;
  // @ts-ignore: unknown type error
  stateMerkleTree.roots.map((x: any, index: any) => {
    if (x.toString() === rootBytes.toString()) {
      rootIndex = new BN(index.toString());
    }
  });

  if (rootIndex === undefined) {
    throw new RpcError(
      TransactionErrorCode.ROOT_NOT_FOUND,
      "getRootIndex",
      `Root index not found for root${root}`,
    );
  }
  return rootIndex;
}

export const createRpcIndexedTransactionResponse = (
  indexedTransaction: ParsedIndexedTransaction,
  merkleTree: SolMerkleTree,
): RpcIndexedTransactionResponse => {
  const leavesIndexes = indexedTransaction.leaves.map((leaf) =>
    merkleTree.merkleTree.indexOf(new BN(leaf).toString()),
  );
  const merkleProofs = leavesIndexes.map(
    (index) => merkleTree.merkleTree.path(index).pathElements,
  );
  const rpcIndexedTransactionResponse: RpcIndexedTransactionResponse = {
    transaction: indexedTransaction,
    leavesIndexes,
    merkleProofs,
  };
  return rpcIndexedTransactionResponse;
};

export const getIdsFromEncryptedUtxos = (
  encryptedUtxos: Buffer,
  numberOfLeaves: number,
): string[] => {
  const utxoLength = 124; //encryptedUtxos.length / numberOfLeaves;
  // divide encrypted utxos by multiples of 2
  // and extract the first two bytes of each
  const ids: string[] = [];
  for (let i = 0; i < encryptedUtxos.length; i += utxoLength) {
    ids.push(bs58.encode(encryptedUtxos.slice(i, i + UTXO_PREFIX_LENGTH)));
  }
  return ids;
};
