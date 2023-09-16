"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpMerkleTree = void 0;
const tslib_1 = require("tslib");
const anchor = tslib_1.__importStar(require("@coral-xyz/anchor"));
const index_1 = require("../idls/index");
const index_2 = require("../index");
const merkleTreeConfig_1 = require("../merkleTree/merkleTreeConfig");
async function setUpMerkleTree(provider, merkleTreeAuthority) {
    let merkleTreeConfig = new merkleTreeConfig_1.MerkleTreeConfig({
        payer: index_2.ADMIN_AUTH_KEYPAIR,
        connection: provider.connection,
    });
    console.log(await merkleTreeConfig.getMerkleTreeAuthorityPda());
    console.log(await provider.connection.getAccountInfo(await merkleTreeConfig.getMerkleTreeAuthorityPda()));
    if ((await provider.connection.getAccountInfo(await merkleTreeConfig.getMerkleTreeAuthorityPda())) == null) {
        await merkleTreeConfig.initMerkleTreeAuthority();
    }
    else {
        console.log("was already executed: initMerkleTreeAuthority");
    }
    if ((await provider.connection.getAccountInfo(merkleTreeConfig_1.MerkleTreeConfig.getEventMerkleTreePda())) == null) {
        await merkleTreeConfig.initializeNewEventMerkleTree();
    }
    else {
        console.log("was already executed: initializeNewEventMerkleTree");
    }
    if ((await provider.connection.getAccountInfo((await merkleTreeConfig.getPoolTypePda(index_2.POOL_TYPE)).poolPda)) == null) {
        await merkleTreeConfig.registerPoolType(index_2.POOL_TYPE);
    }
    else {
        console.log("was already executed: registerPoolType");
    }
    if ((await provider.connection.getAccountInfo((await merkleTreeConfig.getSplPoolPda(index_2.MINT, index_2.POOL_TYPE)).pda)) == null) {
        await merkleTreeConfig.registerSplPool(index_2.POOL_TYPE, index_2.MINT);
    }
    else {
        console.log("was already executed: registerSplPool");
    }
    if ((await provider.connection.getAccountInfo(merkleTreeConfig_1.MerkleTreeConfig.getSolPoolPda(index_2.merkleTreeProgramId, index_2.POOL_TYPE).pda)) == null) {
        await merkleTreeConfig.registerSolPool(index_2.POOL_TYPE);
    }
    else {
        console.log("was already executed: registerSolPool");
    }
    // TODO: do verifier registry in constants
    const verifierArray = [];
    verifierArray.push(new anchor.Program(index_1.IDL_VERIFIER_PROGRAM_ZERO, index_2.verifierProgramZeroProgramId));
    verifierArray.push(new anchor.Program(index_1.IDL_VERIFIER_PROGRAM_ONE, index_2.verifierProgramOneProgramId));
    verifierArray.push(new anchor.Program(index_1.IDL_VERIFIER_PROGRAM_TWO, index_2.verifierProgramTwoProgramId));
    verifierArray.push(new anchor.Program(index_1.IDL_VERIFIER_PROGRAM_STORAGE, index_2.verifierProgramStorageProgramId));
    // registering verifiers and airdrop sol to authority pdas
    for (var verifier of verifierArray) {
        const pda = (await merkleTreeConfig.getRegisteredVerifierPda(verifier.programId)).registeredVerifierPda;
        if ((await provider.connection.getAccountInfo(pda)) == null) {
            await merkleTreeConfig.registerVerifier(verifier.programId);
        }
        else {
            console.log(`verifier ${verifier.programId.toBase58()} is already initialized`);
        }
        const authorityPda = index_2.Transaction.getSignerAuthorityPda(index_2.merkleTreeProgramId, verifier.programId);
        await (0, index_2.airdropSol)({
            connection: provider.connection,
            lamports: 1000000000,
            recipientPublicKey: authorityPda,
        });
        console.log(`Registering Verifier ${verifier.programId.toBase58()}, pda ${pda.toBase58()} and funded authority pda success ${authorityPda.toBase58()}`);
    }
    if (merkleTreeAuthority) {
        await merkleTreeConfig.updateMerkleTreeAuthority(merkleTreeAuthority, true);
    }
}
exports.setUpMerkleTree = setUpMerkleTree;
//# sourceMappingURL=setUpMerkleTree.js.map