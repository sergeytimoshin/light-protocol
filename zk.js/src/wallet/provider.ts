import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  ConfirmOptions,
  Connection,
  Keypair,
  Keypair as SolanaKeypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { initLookUpTable } from "../utils";
import {
  ADMIN_AUTH_KEYPAIR,
  BN_0,
  IDL_LIGHT_MERKLE_TREE_PROGRAM,
  MerkleTreeConfig,
  merkleTreeProgramId,
  MINIMUM_LAMPORTS,
  MINT,
  ParsedIndexedTransaction,
  ProviderError,
  ProviderErrorCode,
  Relayer,
  RELAYER_FEE,
  RELAYER_RECIPIENT_KEYPAIR,
  RelayerSendTransactionsResponse,
  sendVersionedTransactions,
  SendVersionedTransactionsResult,
  SolMerkleTree,
  SolMerkleTreeErrorCode,
  TOKEN_ACCOUNT_FEE,
  TRANSACTION_MERKLE_TREE_SWITCH_TRESHOLD,
  TransactionErrorCode,
  useWallet,
} from "../index";
import { WasmHasher, Hasher } from "@lightprotocol/account.rs";
const axios = require("axios");

/**
 * use: signMessage, signTransaction, sendAndConfirmTransaction, publicKey from the useWallet() hook in solana/wallet-adapter and {connection} from useConnection()
 */
export type Wallet = {
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transaction: any[]) => Promise<any[]>;
  sendAndConfirmTransaction: (transaction: any) => Promise<any>;
  publicKey: PublicKey;
  isNodeWallet?: boolean;
};

/**
 * Provides: wallets, connection, latest SolMerkleTree, LookupTable, confirmConfig, poseidon
 */
// TODO: add relayer here; default deriv, if passed in can choose custom relayer.
export class Provider {
  connection?: Connection;
  wallet: Wallet;
  confirmConfig: ConfirmOptions;
  hasher: Hasher;
  solMerkleTree?: SolMerkleTree;
  provider: AnchorProvider;
  url?: string;
  minimumLamports: BN;
  relayer: Relayer;
  lookUpTables: {
    assetLookupTable: string[];
    verifierProgramLookupTable: string[];
    versionedTransactionLookupTable: PublicKey;
  };

  /**
   * Initialize with Wallet or SolanaKeypair. Feepayer is the provided wallet
   * Optionally provide confirmConfig, Default = 'confirmed'.
   */
  constructor({
    wallet,
    confirmConfig,
    connection,
    url,
    minimumLamports = MINIMUM_LAMPORTS,
    relayer,
    verifierProgramLookupTable,
    assetLookupTable,
    versionedTransactionLookupTable,
    anchorProvider,
    hasher,
  }: {
    wallet: Wallet;
    confirmConfig?: ConfirmOptions;
    connection?: Connection;
    url: string;
    minimumLamports?: BN;
    relayer?: Relayer;
    verifierProgramLookupTable?: PublicKey[];
    assetLookupTable?: PublicKey[];
    versionedTransactionLookupTable: PublicKey;
    anchorProvider: AnchorProvider;
    hasher: Hasher;
  }) {
    if (!wallet)
      throw new ProviderError(
        ProviderErrorCode.WALLET_UNDEFINED,
        "constructor",
        "No wallet provided.",
      );
    this.provider = anchorProvider;
    this.wallet = wallet;
    this.confirmConfig = confirmConfig || { commitment: "confirmed" };
    this.minimumLamports = minimumLamports;
    this.url = url;
    this.connection = connection;
    if (relayer) {
      this.relayer = relayer;
    } else {
      this.relayer = new Relayer(
        this.wallet.publicKey,
        RELAYER_RECIPIENT_KEYPAIR.publicKey,
        RELAYER_FEE,
        TOKEN_ACCOUNT_FEE,
      );
    }
    const tmpAssetLookupTable = assetLookupTable
      ? [...assetLookupTable.map((entry) => entry.toBase58())]
      : [];

    const tmpVerifierProgramLookupTable = verifierProgramLookupTable
      ? [...verifierProgramLookupTable.map((entry) => entry.toBase58())]
      : [];
    this.lookUpTables = {
      assetLookupTable: [
        SystemProgram.programId.toBase58(),
        MINT.toBase58(),
        ...tmpAssetLookupTable,
      ],
      verifierProgramLookupTable: [
        SystemProgram.programId.toBase58(),
        "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
        ...tmpVerifierProgramLookupTable,
      ],
      versionedTransactionLookupTable,
    };
    this.hasher = hasher;
    this.solMerkleTree = new SolMerkleTree({
      pubkey: MerkleTreeConfig.getTransactionMerkleTreePda(),
      hasher: this.hasher,
    });
  }

  static async loadMock(): Promise<Provider> {
    const hasher = await WasmHasher.getInstance();
    // @ts-ignore: @ananas-block ignoring errors to not pass anchorProvider
    const mockProvider = new Provider({
      wallet: useWallet(ADMIN_AUTH_KEYPAIR),
      url: "mock",
      versionedTransactionLookupTable: PublicKey.default,
      hasher,
    });

    mockProvider.solMerkleTree = new SolMerkleTree({
      hasher: mockProvider.hasher,
      pubkey: MerkleTreeConfig.getTransactionMerkleTreePda(),
    });

    return mockProvider;
  }

  static async fetchLookupTable(
    wallet: Wallet,
    provider: AnchorProvider,
    relayerUrl?: string,
  ): Promise<PublicKey | undefined> {
    if (wallet.isNodeWallet) {
      return await initLookUpTable(wallet, provider);
    } else if (relayerUrl) {
      const response = await axios.get(relayerUrl + "/lookuptable");
      return new PublicKey(response.data.data);
    }
  }

  private async fetchMerkleTree(
    merkleTreePubkey: PublicKey,
    indexedTransactions?: ParsedIndexedTransaction[],
  ) {
    try {
      const merkletreeIsInited = await this.provider!.connection.getAccountInfo(
        merkleTreePubkey,
        "confirmed",
      );
      if (!merkletreeIsInited) {
        // FIXME: throw of exception caught locally
        throw new ProviderError(
          ProviderErrorCode.MERKLE_TREE_NOT_INITIALIZED,
          "fetchMerkleTree",
          `Merkle tree is not initialized if on local host run test utils setUpMerkleTree before initin the provider, on other networks check your merkle tree pubkey ${merkleTreePubkey}`,
        );
      }
      if (!indexedTransactions) {
        indexedTransactions = await this.relayer.getIndexedTransactions(
          this.provider!.connection,
        );
      }

      const mt = await SolMerkleTree.build({
        pubkey: merkleTreePubkey,
        hasher: this.hasher,
        indexedTransactions,
        provider: this.provider,
      });

      this.solMerkleTree = mt;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async latestMerkleTree(indexedTransactions?: ParsedIndexedTransaction[]) {
    await this.fetchMerkleTree(
      MerkleTreeConfig.getTransactionMerkleTreePda(),
      indexedTransactions,
    );
  }

  // TODO: add index to merkle tree and check correctness at setup
  // TODO: repeat check for example at tx init to acertain that the merkle tree is not outdated
  /**
   * @description fetches the merkle tree pda from the chain and checks in which index the root of the local merkle tree is.
   */
  async getRootIndex() {
    if (!this.solMerkleTree)
      throw new ProviderError(
        ProviderErrorCode.SOL_MERKLE_TREE_UNDEFINED,
        "getRootIndex",
        "",
      );
    if (!this.solMerkleTree.merkleTree)
      throw new ProviderError(
        SolMerkleTreeErrorCode.MERKLE_TREE_UNDEFINED,
        "getRootIndex",
        "The Merkle tree is not defined in the 'provider.solMerkleTree' object.",
      );
    let rootIndex: BN | undefined;
    const remainingAccounts: any = {};
    if (this.provider && this.solMerkleTree.merkleTree) {
      const merkleTreeProgram = new Program(
        IDL_LIGHT_MERKLE_TREE_PROGRAM,
        merkleTreeProgramId,
        this.provider,
      );
      const root = new BN(this.solMerkleTree.merkleTree.root()).toArray(
        "be",
        32,
      );
      const merkle_tree_account_data =
        await merkleTreeProgram.account.transactionMerkleTree.fetch(
          this.solMerkleTree.pubkey,
          "confirmed",
        );
      // @ts-ignore: unknown type error
      const index = merkle_tree_account_data.merkleTree.roots.findIndex(
        (rootFetched) => {
          return (
            Array.from(root).toString() === Array.from(rootFetched).toString()
          );
        },
      );
      if (index === -1) {
        throw new ProviderError(
          TransactionErrorCode.ROOT_NOT_FOUND,
          "getRootIndex",
          `Root index not found for root${root}`,
        );
      }
      rootIndex = new BN(index);

      if (
        merkle_tree_account_data.merkleTree.nextIndex.gte(
          TRANSACTION_MERKLE_TREE_SWITCH_TRESHOLD,
        )
      ) {
        const merkleTreeConfig = new MerkleTreeConfig({
          anchorProvider: this.provider,
        });
        const nextTransactionMerkleTreeIndex =
          await merkleTreeConfig.getTransactionMerkleTreeIndex();
        const nextTransactionMerkleTreePubkey =
          MerkleTreeConfig.getTransactionMerkleTreePda(
            nextTransactionMerkleTreeIndex,
          );

        const nextEventMerkleTreeIndex =
          await merkleTreeConfig.getEventMerkleTreeIndex();
        const nextEventMerkleTreePubkey =
          MerkleTreeConfig.getEventMerkleTreePda(nextEventMerkleTreeIndex);

        remainingAccounts.nextTransactionMerkleTree = {
          isSigner: false,
          isWritable: true,
          pubkey: nextTransactionMerkleTreePubkey,
        };
        remainingAccounts.nextEventMerkleTree = {
          isSigner: false,
          isWritable: true,
          pubkey: nextEventMerkleTreePubkey,
        };
      }
    } else {
      console.log(
        "Provider is not defined. Unable to fetch rootIndex. Setting root index to 0 as a default value.",
      );
      rootIndex = BN_0;
    }
    return { rootIndex, remainingAccounts };
  }

  async sendAndConfirmTransaction(
    instructions: TransactionInstruction[],
  ): Promise<
    RelayerSendTransactionsResponse | SendVersionedTransactionsResult
  > {
    const response = await sendVersionedTransactions(
      instructions,
      this.provider.connection,
      this.lookUpTables.versionedTransactionLookupTable,
      this.wallet,
    );
    if (response.error) throw response.error;
    return response;
  }

  async sendAndConfirmShieldedTransaction(
    instructions: TransactionInstruction[],
  ): Promise<
    RelayerSendTransactionsResponse | SendVersionedTransactionsResult
  > {
    const response = await this.relayer.sendTransactions(instructions, this);
    if (response.error) throw response.error;
    return response;
  }

  /**
   * Only use this if you use the WalletAdapter, e.g. in the browser. If you use a local keypair, use getNodeProvider().
   * @param walletContext get from useWallet() hook
   * @param confirmConfig optional, default = 'confirmed'
   * @param connection get from useConnection() hook
   * @param url full-node rpc endpoint to instantiate a Connection
   */
  static async init({
    wallet,
    connection,
    confirmConfig,
    url = "http://127.0.0.1:8899",
    relayer,
    assetLookupTable,
    verifierProgramLookupTable,
    versionedTransactionLookupTable,
  }: {
    wallet: Wallet | SolanaKeypair | Keypair;
    connection?: Connection;
    confirmConfig: ConfirmOptions;
    url?: string;
    relayer?: Relayer;
    assetLookupTable?: PublicKey[];
    verifierProgramLookupTable?: PublicKey[];
    versionedTransactionLookupTable?: PublicKey;
  }): Promise<Provider> {
    if (!wallet) {
      throw new ProviderError(ProviderErrorCode.KEYPAIR_UNDEFINED, "browser");
    }
    if (!connection) {
      connection = new Connection(url, "confirmed");
    }
    if (!("secretKey" in wallet) && !connection)
      throw new ProviderError(
        ProviderErrorCode.CONNECTION_UNDEFINED,
        "constructor",
        "No connection provided with browser wallet.",
      );
    if ("secretKey" in wallet) {
      wallet = useWallet(wallet as SolanaKeypair, url);
    } else {
      wallet = wallet as Wallet;
    }

    const anchorProvider = new AnchorProvider(
      connection,
      wallet,
      confirmConfig,
    );
    if (!versionedTransactionLookupTable) {
      // initializing lookup table or fetching one from relayer in case of browser wallet
      versionedTransactionLookupTable = await Provider.fetchLookupTable(
        wallet,
        anchorProvider,
        relayer?.url,
      );
    } else {
      // checking that lookup table is initialized
      try {
        const lookupTableAccount = await connection.getAccountInfo(
          versionedTransactionLookupTable,
          "confirmed",
        );
        if (!lookupTableAccount) {
          throw new ProviderError(
            ProviderErrorCode.LOOK_UP_TABLE_NOT_INITIALIZED,
            "init",
          );
        }
        // this will throw if the account is not a valid lookup table
        AddressLookupTableAccount.deserialize(lookupTableAccount.data);
      } catch (error) {
        throw new ProviderError(
          ProviderErrorCode.LOOK_UP_TABLE_NOT_INITIALIZED,
          "init",
          `${error}`,
        );
      }
    }
    if (!versionedTransactionLookupTable)
      throw new ProviderError(
        ProviderErrorCode.LOOK_UP_TABLE_NOT_INITIALIZED,
        "init",
        "Initializing lookup table in node.js or fetching it from relayer in browser failed",
      );

    const hasher = await WasmHasher.getInstance();
    return new Provider({
      wallet,
      confirmConfig,
      connection,
      url,
      relayer,
      assetLookupTable,
      verifierProgramLookupTable,
      versionedTransactionLookupTable,
      anchorProvider,
      hasher,
    });
  }

  addVerifierProgramPublickeyToLookUpTable(address: PublicKey) {
    this.lookUpTables.verifierProgramLookupTable.push(address.toBase58());
  }

  addAssetPublickeyToLookUpTable(address: PublicKey) {
    this.lookUpTables.assetLookupTable.push(address.toBase58());
  }
}
