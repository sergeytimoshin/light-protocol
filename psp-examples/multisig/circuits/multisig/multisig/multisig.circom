/**
* This file is auto-generated by the Light cli.
* DO NOT EDIT MANUALLY.
* THE FILE WILL BE OVERWRITTEN EVERY TIME THE LIGHT CLI BUILD IS RUN.
*/
pragma circom 2.1.4;

// include "../../node_modules/circomlib/circuits/poseidon.circom";
// include "../../node_modules/@lightprotocol/zk.js/circuit-lib/merkleProof.circom";
// include "../../node_modules/@lightprotocol/zk.js/circuit-lib/keypair.circom";
// include "../../node_modules/circomlib/circuits/gates.circom";
// include "../../node_modules/circomlib/circuits/comparators.circom";
// include "../../node_modules/circomlib/circuits/eddsaposeidon.circom";

include "poseidon.circom";
include "merkleProof.circom";
include "keypair.circom";
include "gates.circom";
include "comparators.circom";
include "eddsaposeidon.circom";


template multisig( nAppUtxos, levels, nIns, nOuts, feeAsset, indexFeeAsset, indexPublicAsset, nAssets, nInAssets, nOutAssets) {


    assert( nIns * nAssets < 49);
    assert( nInAssets <= nAssets);
    assert( nOutAssets <= nAssets);

    signal input isAppInUtxo[nAppUtxos][nIns];
    signal input txIntegrityHash;
    signal input  inAmount[nIns][nInAssets];
    signal input  inPublicKey[nIns];
    signal input  inBlinding[nIns];
    signal input  inAppDataHash[nIns];
    signal  input inPoolType[nIns];
    signal  input inVerifierPubkey[nIns];
    signal  input inIndices[nIns][nInAssets][nAssets];

    // data for transaction outputsAccount
    signal  input publicUtxoHash[nOuts];
    signal  input outAmount[nOuts][nOutAssets];
    signal  input outPubkey[nOuts];
    signal  input outBlinding[nOuts];
    signal  input outAppDataHash[nOuts];
    signal  input outIndices[nOuts][nOutAssets][nAssets];
    signal  input outPoolType[nOuts];
    signal  input outVerifierPubkey[nOuts];

    signal  input assetPubkeys[nAssets];
    signal input transactionVersion;

    component inGetAsset[nIns][nInAssets][nAssets];

    component inCommitmentHasher[nIns];
    component inAmountsHasher[nIns];
    component inAssetsHasher[nIns];

    component sumIn[nIns][nInAssets][nAssets];
    component inAmountCheck[nIns][nInAssets];


    // enforce pooltypes of 0
    // add public input to distinguish between pool types
    inPoolType[0] === 0;
    inPoolType[0] === outPoolType[0];

    var sumIns[nAssets];
    for (var i = 0; i < nAssets; i++) {
    sumIns[i] = 0;
    }

    var assetsIns[nIns][nInAssets];
    for (var i = 0; i < nIns; i++) {
        for (var j = 0; j < nInAssets; j++) {
        assetsIns[i][j] = 0;
        }
    }

    // verify correctness of transaction s
    for (var tx = 0; tx < nIns; tx++) {

        // determine the asset type
        // and checks that the asset is included in assetPubkeys[nInAssets]
        // skips first asset since that is the feeAsset
        // iterates over remaining assets and adds the assetPubkey if index is 1
        // all other indices are zero
        inAssetsHasher[tx] = Poseidon(nInAssets);
        for (var a = 0; a < nInAssets; a++) {

            for (var i = 0; i < nAssets; i++) {
                inGetAsset[tx][a][i] = AND();
                inGetAsset[tx][a][i].a <== assetPubkeys[i];
                inGetAsset[tx][a][i].b <== inIndices[tx][a][i];
                assetsIns[tx][a] += inGetAsset[tx][a][i].out;
            }
            inAssetsHasher[tx].inputs[a] <== assetsIns[tx][a];
        }

        inAmountsHasher[tx] = Poseidon(nInAssets);
        var sumInAmount = 0;
        for (var a = 0; a < nInAssets; a++) {
            inAmountCheck[tx][a] = Num2Bits(64);
            inAmountCheck[tx][a].in <== inAmount[tx][a];
            inAmountsHasher[tx].inputs[a] <== inAmount[tx][a];
            sumInAmount += inAmount[tx][a];
        }

        inCommitmentHasher[tx] = Poseidon(8);
        inCommitmentHasher[tx].inputs[0] <== transactionVersion; // transaction version
        inCommitmentHasher[tx].inputs[1] <== inAmountsHasher[tx].out;
        inCommitmentHasher[tx].inputs[2] <== inPublicKey[tx];
        inCommitmentHasher[tx].inputs[3] <== inBlinding[tx];
        inCommitmentHasher[tx].inputs[4] <== inAssetsHasher[tx].out;
        inCommitmentHasher[tx].inputs[5] <== inAppDataHash[tx];
        inCommitmentHasher[tx].inputs[6] <== inPoolType[tx];
        inCommitmentHasher[tx].inputs[7] <== inVerifierPubkey[tx];




        // for (var i = 0; i < nInAssets; i++) {
        //     for (var j = 0; j < nAssets; j++) {
        //         sumIn[tx][i][j] = AND();
        //         sumIn[tx][i][j].a <== inAmount[tx][i];
        //         sumIn[tx][i][j].b <== inIndices[tx][i][j];
        //         sumIns[j] += sumIn[tx][i][j].out;
        //     }
        // }
    }

    component outGetAsset[nOuts][nOutAssets][nAssets];
    component outCommitmentHasher[nOuts];
    component outAmountCheck[nOuts][nOutAssets];
    component sumOut[nOuts][nOutAssets][nAssets];
    component outAmountsHasher[nOuts];
    component outAssetsHasher[nOuts];

    var sumOuts[nAssets];
    for (var i = 0; i < nAssets; i++) {
    sumOuts[i] = 0;
    }

    var assetsOuts[nOuts][nOutAssets];
    for (var i = 0; i < nOuts; i++) {
        for (var j = 0; j < nOutAssets; j++) {
        assetsOuts[i][j] = 0;
        }
    }

    // verify correctness of transaction outputs
    for (var tx = 0; tx < nOuts; tx++) {

        // for every asset for every tx only one index is 1 others are 0
        // select the asset corresponding to the index
        // and add it to the assetHasher
        outAssetsHasher[tx] = Poseidon(nOutAssets);

        for (var a = 0; a < nOutAssets; a++) {
            var asset = 0;
            for (var i = 0; i < nAssets; i++) {
                outGetAsset[tx][a][i] = AND();
                outGetAsset[tx][a][i].a <== assetPubkeys[i];
                outGetAsset[tx][a][i].b <== outIndices[tx][a][i];
                asset += outGetAsset[tx][a][i].out;
            }
            assetsOuts[tx][a] = asset;
            outAssetsHasher[tx].inputs[a] <== asset;
        }

        for (var i = 0; i < nOutAssets; i++) {
            // Check that amount fits into 64 bits to prevent overflow
            outAmountCheck[tx][i] = Num2Bits(64);
            outAmountCheck[tx][i].in <== outAmount[tx][i];
        }

        outAmountsHasher[tx] = Poseidon(nOutAssets);
        for (var i = 0; i < nOutAssets; i++) {
            outAmountsHasher[tx].inputs[i] <== outAmount[tx][i];
        }

        outCommitmentHasher[tx] = Poseidon(8);
        outCommitmentHasher[tx].inputs[0] <== transactionVersion; // transaction version
        outCommitmentHasher[tx].inputs[1] <== outAmountsHasher[tx].out;
        outCommitmentHasher[tx].inputs[2] <== outPubkey[tx];
        outCommitmentHasher[tx].inputs[3] <== outBlinding[tx];
        outCommitmentHasher[tx].inputs[4] <== outAssetsHasher[tx].out;
        outCommitmentHasher[tx].inputs[5] <== outAppDataHash[tx];
        outCommitmentHasher[tx].inputs[6] <== outPoolType[tx];
        outCommitmentHasher[tx].inputs[7] <== outVerifierPubkey[tx];
        outCommitmentHasher[tx].out === publicUtxoHash[tx];

        // ensure that all pool types are the same
        outPoolType[0] === outPoolType[tx];
    }

    // public inputs
    signal input publicAppVerifier;
    signal  input transactionHash;

    // generating input hash
    // hash commitment 
    component inputHasher = Poseidon(nIns);
    for (var i = 0; i < nIns; i++) {
        inputHasher.inputs[i] <== inCommitmentHasher[i].out;
    }

    component outputHasher = Poseidon(nOuts);
    for (var i = 0; i < nOuts; i++) {
        outputHasher.inputs[i] <== outCommitmentHasher[i].out;
    }

    component transactionHasher = Poseidon(3);

    transactionHasher.inputs[0] <== inputHasher.out;
    transactionHasher.inputs[1] <== outputHasher.out;
    transactionHasher.inputs[2] <== txIntegrityHash;


    transactionHash === transactionHasher.out;

signal input threshold;
signal input nrSigners;
component instructionHasher[nAppUtxos];
component checkInstructionHash[nAppUtxos][nIns];

var nrMaxSigners = 7;
var baseVariables = 2;

signal input signerPubkeysX[nrMaxSigners];
signal input signerPubkeysY[nrMaxSigners];

for (var appUtxoIndex = 0; appUtxoIndex < nAppUtxos; appUtxoIndex++) {
    instructionHasher[appUtxoIndex] = Poseidon(16);
    instructionHasher[appUtxoIndex].inputs[0] <== threshold;
    instructionHasher[appUtxoIndex].inputs[1] <== nrSigners;
    log("instructionHasher[0] = ", instructionHasher[appUtxoIndex].inputs[0]);
    log("instructionHasher[0] = ", instructionHasher[appUtxoIndex].inputs[1]);
    
     for (var i = baseVariables; i < nrMaxSigners + baseVariables; i++) {
       instructionHasher[appUtxoIndex].inputs[i] <== signerPubkeysX[i - baseVariables];
       log("instructionHasher[", appUtxoIndex, "][", i, "] = ", instructionHasher[appUtxoIndex].inputs[i]);
     }

     // if need more max signers hash x and y
    for (var i = baseVariables + nrMaxSigners; i < nrMaxSigners * 2 + baseVariables; i++) {
       instructionHasher[appUtxoIndex].inputs[i] <== signerPubkeysY[i - baseVariables - nrMaxSigners];
       log("instructionHasher[", appUtxoIndex, "][", i, "] = ", instructionHasher[appUtxoIndex].inputs[i]);
    }

    for (var inUtxoIndex = 0; inUtxoIndex < nIns; inUtxoIndex++) {
        log("appUtxoIndex = ", appUtxoIndex);
        log("inAppDataHash[", inUtxoIndex, "] = ", inAppDataHash[inUtxoIndex]);
        log("instructionHasher[", appUtxoIndex, "].out = ", instructionHasher[appUtxoIndex].out);
        log("isAppInUtxo[", appUtxoIndex, "][", inUtxoIndex, "] = ", isAppInUtxo[appUtxoIndex][inUtxoIndex]);

        checkInstructionHash[appUtxoIndex][inUtxoIndex] = ForceEqualIfEnabled();
        checkInstructionHash[appUtxoIndex][inUtxoIndex].in[0] <== inAppDataHash[inUtxoIndex];
        checkInstructionHash[appUtxoIndex][inUtxoIndex].in[1] <== instructionHasher[appUtxoIndex].out;
        checkInstructionHash[appUtxoIndex][inUtxoIndex].enabled <== isAppInUtxo[appUtxoIndex][inUtxoIndex];
   }
}
signal input enabled[nrMaxSigners];
signal input signatures[nrMaxSigners];
signal input r8x[nrMaxSigners];
signal input r8y[nrMaxSigners];

component checkIndices = CheckIndices(nrMaxSigners);
checkIndices.threshold <== threshold;
for (var i = 0; i < nrMaxSigners; i++) {
checkIndices.indices[i] <== enabled[i];
}

component sigVerifier[nrMaxSigners];
for(var i = 0; i < nrMaxSigners; i++) {
   sigVerifier[i] = EdDSAPoseidonVerifier();
   sigVerifier[i].enabled <== enabled[i] * signerPubkeysX[i];
   sigVerifier[i].Ax <== signerPubkeysX[i];
   sigVerifier[i].Ay <== signerPubkeysY[i];
   sigVerifier[i].S <== signatures[i];
   sigVerifier[i].R8x <== r8x[i];
   sigVerifier[i].R8y <== r8y[i];
   sigVerifier[i].M <== transactionHasher.out;
}
}

template CheckIndices(n) {
signal input indices[n];
signal input threshold;
var varSumIndices = 0;
for (var j = 0; j < n; j++) {
varSumIndices += indices[j];
indices[j] * (1 - indices[j]) === 0;
}
component checkThreshold = GreaterEqThan(8);
checkThreshold.in[0] <== varSumIndices;
checkThreshold.in[1] <== threshold;
checkThreshold.out === 1;
}

/*
* Environment Constants:
*   levels = 18
*   nIns = 4 (number of in utxos)
*   nOuts = 4 (number of out utxos)
*   feeAsset = TruncatedSha256(0)
*   indexFeeAsset = 0
*   indexPublicAsset = 1
*   nAssets = 3
*   nInAssets = 2
*   nOutAssets = 2
* Environment variables:
*   txIntegrityHash;
*   transactionVersion;
*   publicAppVerifier;
*   transactionHash;
*   instructionHasher.out;
*   isAppInUtxo[nAppUtxos][nIns];
*
*  InUtxos:
*   inAmount[nIns][nInAssets];
*   inPublicKey[nIns];
*   inBlinding[nIns];
*   inAppDataHash[nIns];
*   inPoolType[nIns];
*   inVerifierPubkey[nIns];
*   inIndices[nIns][nInAssets][nAssets];
* OutUtxos:
*   publicUtxoHash[nOuts];
*   outAmount[nOuts][nOutAssets];
*   outPubkey[nOuts];
*   outBlinding[nOuts];
*   outAppDataHash[nOuts];
*   outIndices[nOuts][nOutAssets][nAssets];
*   outPoolType[nOuts];
*   outVerifierPubkey[nOuts];
*/