"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.Action = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const utxo_1 = require("../utxo");
const index_1 = require("../index");
const index_2 = require("../idls/index");
const prover_js_1 = require("@lightprotocol/prover.js");
const spl_token_1 = require("@solana/spl-token");
var ffjavascript = require("ffjavascript");
const { unstringifyBigInts, leInt2Buff } = ffjavascript.utils;
const path = require("path");
// TODO: make dev provide the classification and check here -> it is easier to check whether transaction parameters are plausible
// add verifier class which is passed in with the constructor
// this class replaces the send transaction, also configures path the provingkey and witness, the inputs for the integrity hash
// input custom verifier with three functions by default prepare, proof, send
// include functions from sdk in shieldedTransaction
// TODO: add log option that enables logs
var Action;
(function (Action) {
    Action["SHIELD"] = "SHIELD";
    Action["TRANSFER"] = "TRANSFER";
    Action["UNSHIELD"] = "UNSHIELD";
})(Action = exports.Action || (exports.Action = {}));
class Transaction {
    /**
     * Initialize transaction
     *
     * @param relayer recipient of the unshielding
     * @param shuffleEnabled
     */
    constructor({ provider, shuffleEnabled = false, params, appParams, }) {
        if (!provider)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.PROVIDER_UNDEFINED, "constructor");
        if (!provider.poseidon)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.POSEIDON_HASHER_UNDEFINED, "constructor", "Poseidon hasher in provider undefined.");
        if (!provider.solMerkleTree)
            throw new index_1.TransactionError(index_1.ProviderErrorCode.SOL_MERKLE_TREE_UNDEFINED, "constructor", "Merkle tree not set in provider");
        if (!provider.wallet)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.WALLET_UNDEFINED, "constructor", "Wallet not set in provider.");
        if (!params) {
            throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_PARAMETERS_UNDEFINED, "constructor");
        }
        if (!params.verifierIdl)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.VERIFIER_IDL_UNDEFINED, "constructor", "");
        if (params.verifierConfig.in.toString() === "4" && !appParams)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.APP_PARAMETERS_UNDEFINED, "constructor", "For application transactions application parameters need to be specified.");
        if (appParams && params.verifierConfig.in.toString() !== "4")
            throw new index_1.TransactionError(index_1.TransactionErrorCode.INVALID_VERIFIER_SELECTED, "constructor", "For application transactions, an application-enabled verifier (like verifier two) is required.");
        this.provider = provider;
        this.shuffleEnabled = shuffleEnabled;
        // TODO: create and check for existence of merkleTreeAssetPubkey depending on utxo asset
        this.params = params;
        this.appParams = appParams;
        //TODO: change to check whether browser/node wallet are the same as signing address
        if (params.action === Action.SHIELD) {
            let wallet = this.provider.wallet;
            if (wallet?.publicKey.toBase58() !==
                params.relayer.accounts.relayerPubkey.toBase58() &&
                wallet?.publicKey.toBase58() !==
                    params.accounts.signingAddress?.toBase58()) {
                throw new index_1.TransactionError(index_1.TransactionErrorCode.WALLET_RELAYER_INCONSISTENT, "constructor", "The wallet used in your Node.js or Browser environment does not match the wallet used for the senderFee when setting up the relayer during the deposit process. They need to be the same.");
            }
        }
        this.transactionInputs = {};
        this.remainingAccounts = {};
    }
    // TODO: evaluate whether we need this function
    // /** Returns serialized instructions */
    // async proveAndCreateInstructionsJson(): Promise<string[]> {
    //   await this.compileAndProve();
    //   return await this.getInstructionsJson();
    // }
    // TODO: evaluate whether we need this function
    // async proveAndCreateInstructions(): Promise<TransactionInstruction[]> {
    //   await this.compileAndProve();
    //   if (this.appParams) {
    //     return await this.appParams.verifier.getInstructions(this);
    //   } else if (this.params) {
    //     return await this.params.verifier.getInstructions(this);
    //   } else {
    //     throw new TransactionError(
    //       TransactionErrorCode.NO_PARAMETERS_PROVIDED,
    //       "proveAndCreateInstructions",
    //       "",
    //     );
    //   }
    // }
    async compileAndProve() {
        await this.compile();
        if (!this.params)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_PARAMETERS_UNDEFINED, "compileAndProve");
        await this.getProof();
        if (this.appParams)
            await this.getAppProof();
        await this.getRootIndex();
        this.getPdaAddresses();
    }
    /**
     * @description Prepares proof inputs.
     */
    async compile() {
        this.firstPath = path.resolve(__dirname, "../../build-circuits/");
        this.shuffleUtxos(this.params.inputUtxos);
        this.shuffleUtxos(this.params.outputUtxos);
        if (!this.provider.solMerkleTree)
            throw new index_1.TransactionError(index_1.ProviderErrorCode.SOL_MERKLE_TREE_UNDEFINED, "getProofInput");
        await this.params.getTxIntegrityHash(this.provider.poseidon);
        if (!this.params.txIntegrityHash)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_INTEGRITY_HASH_UNDEFINED, "compile");
        const { inputMerklePathIndices, inputMerklePathElements } = Transaction.getMerkleProofs(this.provider, this.params.inputUtxos);
        this.proofInput = {
            root: this.provider.solMerkleTree.merkleTree.root(),
            inputNullifier: this.params.inputUtxos.map((x) => x.getNullifier(this.provider.poseidon)),
            publicAmountSpl: this.params.publicAmountSpl.toString(),
            publicAmountSol: this.params.publicAmountSol.toString(),
            publicMintPubkey: this.getMint(),
            inPrivateKey: this.params.inputUtxos?.map((x) => x.account.privkey),
            inPathIndices: inputMerklePathIndices,
            inPathElements: inputMerklePathElements,
            internalTxIntegrityHash: this.params.txIntegrityHash.toString(),
            transactionVersion: "0",
            txIntegrityHash: this.params.txIntegrityHash.toString(),
            outputCommitment: this.params.outputUtxos.map((x) => x.getCommitment(this.provider.poseidon)),
            inAmount: this.params.inputUtxos?.map((x) => x.amounts),
            inBlinding: this.params.inputUtxos?.map((x) => x.blinding),
            assetPubkeys: this.params.assetPubkeysCircuit,
            outAmount: this.params.outputUtxos?.map((x) => x.amounts),
            outBlinding: this.params.outputUtxos?.map((x) => x.blinding),
            outPubkey: this.params.outputUtxos?.map((x) => x.account.pubkey),
            inIndices: this.getIndices(this.params.inputUtxos),
            outIndices: this.getIndices(this.params.outputUtxos),
            inAppDataHash: this.params.inputUtxos?.map((x) => x.appDataHash),
            outAppDataHash: this.params.outputUtxos?.map((x) => x.appDataHash),
            inPoolType: this.params.inputUtxos?.map((x) => x.poolType),
            outPoolType: this.params.outputUtxos?.map((x) => x.poolType),
            inVerifierPubkey: this.params.inputUtxos?.map((x) => x.verifierAddressCircuit),
            outVerifierPubkey: this.params.outputUtxos?.map((x) => x.verifierAddressCircuit),
        };
        if (this.appParams) {
            this.proofInput.transactionHash = Transaction.getTransactionHash(this.params, this.provider.poseidon);
            this.proofInput.publicAppVerifier = (0, index_1.hashAndTruncateToCircuit)(index_1.TransactionParameters.getVerifierProgramId(this.appParams.verifierIdl).toBuffer());
            this.proofInput = {
                ...this.appParams.inputs,
                ...this.proofInput,
                inPublicKey: this.params?.inputUtxos?.map((utxo) => utxo.account.pubkey),
            };
        }
    }
    getMint() {
        if (this.params.publicAmountSpl.eq(index_1.BN_0)) {
            return index_1.BN_0;
        }
        else if (this.params.assetPubkeysCircuit) {
            return this.params.assetPubkeysCircuit[1];
        }
        else {
            throw new index_1.TransactionError(index_1.TransactionErrorCode.GET_MINT_FAILED, "getMint", "Failed to retrieve mint. The transaction parameters should contain 'assetPubkeysCircuit' after initialization, but it's missing.");
        }
    }
    async getProof() {
        const res = await this.getProofInternal(this.params, this.firstPath);
        this.transactionInputs.proofBytes = res.parsedProof;
        this.transactionInputs.publicInputs = res.parsedPublicInputsObject;
    }
    async getAppProof() {
        if (!this.appParams)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.APP_PARAMETERS_UNDEFINED, "getAppProof");
        if (!this.appParams.path)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.FIRST_PATH_APP_UNDEFINED, "getAppProof", "The app path is not defined. Please ensure it is specified in 'appParams'.");
        const res = await this.getProofInternal(this.appParams, this.appParams.path);
        this.transactionInputs.proofBytesApp = {
            proofAApp: res.parsedProof.proofA,
            proofBApp: res.parsedProof.proofB,
            proofCApp: res.parsedProof.proofC,
        };
        this.transactionInputs.publicInputsApp = res.parsedPublicInputsObject;
    }
    async getProofInternal(params, firstPath) {
        if (!this.proofInput)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.PROOF_INPUT_UNDEFINED, "getProofInternal");
        if (!this.params)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.NO_PARAMETERS_PROVIDED, "getProofInternal");
        if (!this.params.verifierIdl)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.NO_PARAMETERS_PROVIDED, "getProofInternal", "verifierIdl is missing in TransactionParameters");
        let prover = new prover_js_1.Prover(params.verifierIdl, firstPath, params.circuitName);
        await prover.addProofInputs(this.proofInput);
        const prefix = `\x1b[37m[${new Date(Date.now()).toISOString()}]\x1b[0m`;
        console.time(`${prefix} Proving ${params.verifierIdl.name} circuit`);
        let parsedProof, parsedPublicInputs;
        try {
            const result = await prover.fullProveAndParse();
            parsedProof = result.parsedProof;
            parsedPublicInputs = result.parsedPublicInputs;
        }
        catch (error) {
            throw new index_1.TransactionError(index_1.TransactionErrorCode.PROOF_GENERATION_FAILED, "getProofInternal", error);
        }
        console.timeEnd(`${prefix} Proving ${params.verifierIdl.name} circuit`);
        const res = await prover.verify();
        if (res !== true) {
            throw new index_1.TransactionError(index_1.TransactionErrorCode.INVALID_PROOF, "getProofInternal");
        }
        const parsedPublicInputsObject = prover.parsePublicInputsFromArray(parsedPublicInputs);
        return { parsedProof, parsedPublicInputsObject };
    }
    static getTransactionHash(params, poseidon) {
        if (!params.txIntegrityHash)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_INTEGRITY_HASH_UNDEFINED, "getTransactionHash");
        const inputHasher = poseidon.F.toString(poseidon(params?.inputUtxos?.map((utxo) => utxo.getCommitment(poseidon))));
        const outputHasher = poseidon.F.toString(poseidon(params?.outputUtxos?.map((utxo) => utxo.getCommitment(poseidon))));
        const transactionHash = poseidon.F.toString(poseidon([inputHasher, outputHasher, params.txIntegrityHash.toString()]));
        return transactionHash;
    }
    // TODO: add index to merkle tree and check correctness at setup
    // TODO: repeat check for example at tx init to acertain that the merkle tree is not outdated
    /**
     * @description fetches the merkle tree pda from the chain and checks in which index the root of the local merkle tree is.
     */
    async getRootIndex() {
        if (!this.provider.solMerkleTree)
            throw new index_1.TransactionError(index_1.ProviderErrorCode.SOL_MERKLE_TREE_UNDEFINED, "getRootIndex", "");
        if (!this.provider.solMerkleTree.merkleTree)
            throw new index_1.TransactionError(index_1.SolMerkleTreeErrorCode.MERKLE_TREE_UNDEFINED, "getRootIndex", "The Merkle tree is not defined in the 'provider.solMerkleTree' object.");
        if (this.provider.provider && this.provider.solMerkleTree.merkleTree) {
            this.merkleTreeProgram = new anchor_1.Program(index_2.IDL_MERKLE_TREE_PROGRAM, index_1.merkleTreeProgramId, this.provider.provider);
            let root = Uint8Array.from(leInt2Buff(unstringifyBigInts(this.provider.solMerkleTree.merkleTree.root()), 32));
            let merkle_tree_account_data = await this.merkleTreeProgram.account.transactionMerkleTree.fetch(this.provider.solMerkleTree.pubkey, "confirmed");
            // @ts-ignore: unknown type error
            merkle_tree_account_data.roots.map((x, index) => {
                if (x.toString() === root.toString()) {
                    this.transactionInputs.rootIndex = new anchor_1.BN(index.toString());
                }
            });
            if (this.transactionInputs.rootIndex === undefined) {
                throw new index_1.TransactionError(index_1.TransactionErrorCode.ROOT_NOT_FOUND, "getRootIndex", `Root index not found for root${root}`);
            }
            if (merkle_tree_account_data.nextIndex.gte(index_1.TRANSACTION_MERKLE_TREE_SWITCH_TRESHOLD)) {
                let merkleTreeConfig = new index_1.MerkleTreeConfig({
                    connection: this.provider.provider.connection,
                });
                let nextTrancactionMerkleTreeIndex = await merkleTreeConfig.getTransactionMerkleTreeIndex();
                const nextTransactionMerkleTreePubkey = index_1.MerkleTreeConfig.getTransactionMerkleTreePda(nextTrancactionMerkleTreeIndex);
                this.remainingAccounts.nextTransactionMerkleTree = {
                    isSigner: false,
                    isWritable: true,
                    pubkey: nextTransactionMerkleTreePubkey,
                };
            }
        }
        else {
            console.log("Provider is not defined. Unable to fetch rootIndex. Setting root index to 0 as a default value.");
            this.transactionInputs.rootIndex = index_1.BN_0;
        }
    }
    /**
     * @description Computes the indices in which the asset for the utxo is in the asset pubkeys array.
     * @note Using the indices the zero knowledege proof circuit enforces that only utxos containing the
     * @note assets in the asset pubkeys array are contained in the transaction.
     * @param utxos
     * @returns
     */
    // TODO: make this work for edge case of two 2 different assets plus fee asset in the same transaction
    // TODO: fix edge case of an assetpubkey being 0
    // TODO: !== !! and check non-null
    getIndices(utxos) {
        if (!this.params.assetPubkeysCircuit)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.ASSET_PUBKEYS_UNDEFINED, "getIndices", "");
        let inIndices = [];
        utxos.map((utxo) => {
            let tmpInIndices = [];
            for (var a = 0; a < utxo.assets.length; a++) {
                let tmpInIndices1 = [];
                for (var i = 0; i < utxo_1.N_ASSET_PUBKEYS; i++) {
                    try {
                        if (utxo.assetsCircuit[a].toString() ===
                            this.params.assetPubkeysCircuit[i].toString() &&
                            !tmpInIndices1.includes("1") &&
                            this.params.assetPubkeysCircuit[i].toString() != "0") {
                            tmpInIndices1.push("1");
                        }
                        else {
                            tmpInIndices1.push("0");
                        }
                    }
                    catch (error) {
                        tmpInIndices1.push("0");
                    }
                }
                tmpInIndices.push(tmpInIndices1);
            }
            inIndices.push(tmpInIndices);
        });
        return inIndices;
    }
    /**
     * @description Gets the merkle proofs for every input utxo with amounts > 0.
     * @description For input utxos with amounts == 0 it returns merkle paths with all elements = 0.
     */
    static getMerkleProofs(provider, inputUtxos) {
        if (!provider.solMerkleTree)
            throw new index_1.TransactionError(index_1.SolMerkleTreeErrorCode.MERKLE_TREE_UNDEFINED, "getMerkleProofs", "");
        if (!provider.solMerkleTree.merkleTree)
            throw new index_1.TransactionError(index_1.SolMerkleTreeErrorCode.MERKLE_TREE_UNDEFINED, "getMerkleProofs", "");
        var inputMerklePathIndices = new Array();
        var inputMerklePathElements = new Array();
        // getting merkle proofs
        for (const inputUtxo of inputUtxos) {
            if (inputUtxo.amounts[0].gt(index_1.BN_0) || inputUtxo.amounts[1].gt(index_1.BN_0)) {
                inputUtxo.index = provider.solMerkleTree.merkleTree.indexOf(inputUtxo.getCommitment(provider.poseidon));
                if (inputUtxo.index || inputUtxo.index == 0) {
                    if (inputUtxo.index < 0) {
                        throw new index_1.TransactionError(index_1.TransactionErrorCode.INPUT_UTXO_NOT_INSERTED_IN_MERKLE_TREE, "getMerkleProofs", `Input commitment ${inputUtxo.getCommitment(provider.poseidon)} was not found. Was the local merkle tree synced since the utxo was inserted?`);
                    }
                    inputMerklePathIndices.push(inputUtxo.index.toString());
                    inputMerklePathElements.push(provider.solMerkleTree.merkleTree.path(inputUtxo.index)
                        .pathElements);
                }
            }
            else {
                inputMerklePathIndices.push("0");
                inputMerklePathElements.push(new Array(provider.solMerkleTree.merkleTree.levels).fill("0"));
            }
        }
        return { inputMerklePathIndices, inputMerklePathElements };
    }
    static getSignerAuthorityPda(merkleTreeProgramId, verifierProgramId) {
        return web3_js_1.PublicKey.findProgramAddressSync([merkleTreeProgramId.toBytes()], verifierProgramId)[0];
    }
    static getRegisteredVerifierPda(merkleTreeProgramId, verifierProgramId) {
        return web3_js_1.PublicKey.findProgramAddressSync([verifierProgramId.toBytes()], merkleTreeProgramId)[0];
    }
    // TODO: evaluate whether we need this function
    // async getInstructionsJson(): Promise<string[]> {
    //   if (!this.params)
    //     throw new TransactionError(
    //       TransactionErrorCode.TX_PARAMETERS_UNDEFINED,
    //       "getInstructionsJson",
    //       "",
    //     );
    //   if (!this.appParams) {
    //     const instructions = await this.params.verifier.getInstructions(this);
    //     let serialized = instructions.map((ix) => JSON.stringify(ix));
    //     return serialized;
    //   } else {
    //     const instructions = await this.appParams.verifier.getInstructions(this);
    //     let serialized = instructions.map((ix: any) => JSON.stringify(ix));
    //     return serialized;
    //   }
    // }
    async sendAndConfirmTransaction() {
        var instructions = await this.getInstructions(this.appParams ? this.appParams : this.params);
        let response = undefined;
        if (this.params.action !== Action.SHIELD) {
            // TODO: replace this with (this.provider.wallet.pubkey != new relayer... this.relayer
            // then we know that an actual relayer was passed in and that it's supposed to be sent to one.
            // we cant do that tho as we'd want to add the default relayer to the provider itself.
            // so just pass in a flag here "shield, unshield, transfer" -> so devs don't have to know that it goes to a relayer.
            // send tx to relayer
            response = await this.params.relayer.sendTransactions(instructions, this.provider);
        }
        else {
            if (!this.provider.provider)
                throw new index_1.TransactionError(index_1.ProviderErrorCode.ANCHOR_PROVIDER_UNDEFINED, "sendTransaction", "Provider.provider undefined");
            if (!this.params)
                throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_PARAMETERS_UNDEFINED, "sendTransaction", "");
            if (!this.params.relayer)
                throw new index_1.TransactionError(index_1.TransactionErrorCode.RELAYER_UNDEFINED, "sendTransaction", "");
            if (this.transactionInputs.rootIndex === undefined) {
                throw new index_1.TransactionError(index_1.TransactionErrorCode.ROOT_INDEX_NOT_FETCHED, "sendTransaction", "");
            }
            if (!this.remainingAccounts?.leavesPdaPubkeys) {
                throw new index_1.TransactionError(index_1.TransactionErrorCode.REMAINING_ACCOUNTS_NOT_CREATED, "sendTransaction", "Run await getPdaAddresses() before invoking sendTransaction");
            }
            response = await (0, index_1.sendVersionedTransactions)(instructions, this.provider.provider.connection, this.provider.lookUpTables.versionedTransactionLookupTable, this.provider.wallet);
        }
        if (response.error)
            throw response.error;
        return response;
    }
    /**
     * Asynchronously generates an array of transaction instructions based on the provided transaction parameters.
     *
     * 1. Validates that the required properties of transactionInputs and verifier are defined.
     * 2. Retrieves ordered instruction names from the verifier program by:
     *    a. Filtering instructions based on a suffix pattern (e.g., "First", "Second", "Third", etc.).
     *    b. Sorting instructions according to the order of suffixes.
     * 3. Constructs an input object containing the necessary data for encoding.
     * 4. Iterates through the instruction names, encoding the inputs and generating transaction instructions.
     * 5. Returns an array of generated transaction instructions.
     *
     * @param {TransactionParameters} params - Object containing the required transaction parameters.
     * @returns {Promise<TransactionInstruction[]>} - Promise resolving to an array of generated transaction instructions.
     */
    async getInstructions(params) {
        const verifierProgram = index_1.TransactionParameters.getVerifierProgram(params.verifierIdl, this.provider.provider);
        if (!this.transactionInputs.publicInputs)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.PUBLIC_INPUTS_UNDEFINED, "getInstructions");
        if (!verifierProgram)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.VERIFIER_PROGRAM_UNDEFINED, "getInstructions");
        const getOrderedInstructionNames = (verifierIdl) => {
            const orderedInstructionNames = verifierIdl.instructions
                .filter((instruction) => /First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth/.test(instruction.name))
                .sort((a, b) => {
                const suffixes = [
                    "First",
                    "Second",
                    "Third",
                    "Fourth",
                    "Fifth",
                    "Sixth",
                    "Seventh",
                    "Eighth",
                    "Ninth",
                ];
                const aIndex = suffixes.findIndex((suffix) => a.name.endsWith(suffix));
                const bIndex = suffixes.findIndex((suffix) => b.name.endsWith(suffix));
                if (aIndex === 7 || bIndex === 7) {
                    throw new Error("Found an instruction with the 'Eighth' suffix.");
                }
                return aIndex - bIndex;
            })
                .map((instruction) => instruction.name);
            return orderedInstructionNames;
        };
        if (this.params.verifierConfig.out == 2) {
            this.params.encryptedUtxos = this.params.encryptedUtxos.slice(0, 240);
        }
        let inputObject = {
            message: this.params.message,
            ...this.transactionInputs.proofBytes,
            ...this.transactionInputs.publicInputs,
            rootIndex: this.transactionInputs.rootIndex,
            relayerFee: this.params.relayer.getRelayerFee(this.params.ataCreationFee),
            encryptedUtxos: Buffer.from(this.params.encryptedUtxos),
        };
        if (this.appParams) {
            inputObject = {
                ...inputObject,
                ...this.appParams.inputs,
                ...this.transactionInputs.proofBytesApp,
                ...this.transactionInputs.publicInputsApp,
            };
        }
        var instructions = [];
        // TODO: make mint dynamic
        /**
         * Problem:
         * - for spl withdrawals we need an initialized associated token we can withdraw to
         * - this transaction needs to be signed by the owner of the associated token account? has it?
         */
        if (this.params.ataCreationFee) {
            if (!this.params.accounts.recipientSpl)
                throw new index_1.TransactionError(index_1.TransactionErrorCode.SPL_RECIPIENT_UNDEFINED, "getInstructions", "Probably sth in the associated token address generation went wrong");
            if (!this.params.accounts.recipientSol)
                throw new index_1.TransactionError(index_1.TransactionErrorCode.SPL_RECIPIENT_UNDEFINED, "getInstructions", "Probably sth in the associated token address generation went wrong");
            let ix = (0, spl_token_1.createAssociatedTokenAccountInstruction)(this.params.relayer.accounts.relayerPubkey, this.params.accounts.recipientSpl, this.params.accounts.recipientSol, index_1.MINT);
            instructions.push(ix);
        }
        const instructionNames = getOrderedInstructionNames(params.verifierIdl);
        for (let i = 0; i < instructionNames.length; i++) {
            const instruction = instructionNames[i];
            const coder = new anchor_1.BorshAccountsCoder(params.verifierIdl);
            const accountName = "instructionData" + (0, index_1.firstLetterToUpper)(instruction);
            let inputs = (0, index_1.createAccountObject)(inputObject, params.verifierIdl.accounts, accountName);
            let inputsVec = (await coder.encode(accountName, inputs)).subarray(8);
            // TODO: check whether app account names overlap with system account names and throw an error if so
            let appAccounts = {};
            if (this.appParams?.accounts) {
                appAccounts = this.appParams.accounts;
            }
            const methodName = (0, index_1.firstLetterToLower)(instruction);
            const method = verifierProgram.methods[methodName](inputsVec).accounts({
                ...this.params.accounts,
                ...this.params.relayer.accounts,
                ...appAccounts,
                relayerRecipientSol: this.params.action === Action.SHIELD
                    ? index_1.AUTHORITY
                    : this.params.relayer.accounts.relayerRecipientSol,
            });
            // Check if it's the last iteration
            if (i === instructionNames.length - 1) {
                let remainingAccounts = [
                    ...this.remainingAccounts.nullifierPdaPubkeys,
                    ...this.remainingAccounts.leavesPdaPubkeys,
                ];
                if (this.remainingAccounts.nextTransactionMerkleTree !== undefined) {
                    remainingAccounts.push(this.remainingAccounts.nextTransactionMerkleTree);
                }
                method.remainingAccounts(remainingAccounts);
            }
            const ix = await method.instruction();
            instructions?.push(ix);
        }
        return instructions;
    }
    // TODO: deal with this: set own payer just for that? where is this used?
    // This is used by applications not the relayer
    async closeVerifierState() {
        if (!this.provider.wallet)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.WALLET_UNDEFINED, "closeVerifierState", "Cannot use closeVerifierState without wallet");
        if (!this.params)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.TX_PARAMETERS_UNDEFINED, "closeVerifierState", "");
        if (!this.params.verifierIdl)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.VERIFIER_PROGRAM_UNDEFINED, "closeVerifierState", "");
        if (this.appParams) {
            const transaction = new web3_js_1.Transaction().add(await this.appParams?.verifier.verifierProgram.methods
                .closeVerifierState()
                .accounts({
                ...this.params.accounts,
            })
                .instruction());
            return await this.provider.wallet.sendAndConfirmTransaction(transaction);
        }
        else {
            const transaction = new web3_js_1.Transaction().add(await index_1.TransactionParameters.getVerifierProgram(this.params?.verifierIdl, this.provider.provider)
                .methods.closeVerifierState()
                .accounts({
                ...this.params.accounts,
            })
                .instruction());
            return await this.provider.wallet.sendAndConfirmTransaction(transaction);
        }
    }
    getPdaAddresses() {
        if (!this.transactionInputs.publicInputs)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.PUBLIC_INPUTS_UNDEFINED, "getPdaAddresses", "");
        if (!this.params.verifierIdl)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.VERIFIER_IDL_UNDEFINED, "getPdaAddresses", "");
        if (!this.params.relayer)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.RELAYER_UNDEFINED, "getPdaAddresses", "");
        if (!this.remainingAccounts)
            throw new index_1.TransactionError(index_1.TransactionErrorCode.REMAINING_ACCOUNTS_NOT_CREATED, "getPdaAddresses", "Remaining accounts undefined");
        let nullifiers = this.transactionInputs.publicInputs.inputNullifier;
        let signer = this.params.relayer.accounts.relayerPubkey;
        this.remainingAccounts.nullifierPdaPubkeys = [];
        for (var i in nullifiers) {
            this.remainingAccounts.nullifierPdaPubkeys.push({
                isSigner: false,
                isWritable: true,
                pubkey: Transaction.getNullifierPdaPublicKey(nullifiers[i], index_1.merkleTreeProgramId),
            });
        }
        this.remainingAccounts.leavesPdaPubkeys = [];
        for (var j = 0; j < this.transactionInputs.publicInputs.outputCommitment.length; j += 2) {
            this.remainingAccounts.leavesPdaPubkeys.push({
                isSigner: false,
                isWritable: true,
                pubkey: web3_js_1.PublicKey.findProgramAddressSync([
                    Buffer.from(Array.from(this.transactionInputs.publicInputs.outputCommitment[j]).reverse()),
                    anchor_1.utils.bytes.utf8.encode("leaves"),
                ], index_1.merkleTreeProgramId)[0],
            });
        }
        if (this.appParams) {
            this.params.accounts.verifierState = web3_js_1.PublicKey.findProgramAddressSync([signer.toBytes(), anchor_1.utils.bytes.utf8.encode("VERIFIER_STATE")], index_1.TransactionParameters.getVerifierProgramId(this.appParams.verifierIdl))[0];
        }
        else {
            this.params.accounts.verifierState = web3_js_1.PublicKey.findProgramAddressSync([signer.toBytes(), anchor_1.utils.bytes.utf8.encode("VERIFIER_STATE")], this.params.verifierProgramId)[0];
        }
    }
    static getNullifierPdaPublicKey(nullifier, merkleTreeProgramId) {
        return web3_js_1.PublicKey.findProgramAddressSync([Uint8Array.from([...nullifier]), anchor_1.utils.bytes.utf8.encode("nf")], merkleTreeProgramId)[0];
    }
    // TODO: use higher entropy rnds
    shuffleUtxos(utxos) {
        if (!this.shuffleEnabled) {
            return;
        }
        let currentIndex = utxos.length;
        let randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [utxos[currentIndex], utxos[randomIndex]] = [
                utxos[randomIndex],
                utxos[currentIndex],
            ];
        }
        return utxos;
    }
    static getTokenAuthority() {
        return web3_js_1.PublicKey.findProgramAddressSync([anchor_1.utils.bytes.utf8.encode("spl")], index_1.merkleTreeProgramId)[0];
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=transaction.js.map