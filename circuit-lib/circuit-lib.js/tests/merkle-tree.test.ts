import {MerkleTreeCircomPoseidon} from "./utils/merkle-tree-circom-poseidon";
import {MerkleTree} from "./utils/merkle-tree";

let circomlibjs = require("circomlibjs");
var ffjavascript = require("ffjavascript");
const {unstringifyBigInts, stringifyBigInts, leInt2Buff, leBuff2int} = ffjavascript.utils;
import {readFileSync, writeFileSync} from "fs";

const snarkjs = require("snarkjs");
import {BN} from "@coral-xyz/anchor";

import {LightWasm, WasmFactory} from "@lightprotocol/account.rs";

describe("Tests", () => {

    let lightWasm: LightWasm;

    function zk(tree_height: number, num_utxos: number): String {
        return `../circuitlib-rs/test-data/merkle${tree_height}_${num_utxos}/circuit.zkey`;
    }

    function wasm(tree_height: number, num_utxos: number): Buffer {
        let path = `../circuitlib-rs/test-data/merkle${tree_height}_${num_utxos}/merkle${tree_height}_${num_utxos}_js/merkle${tree_height}_${num_utxos}.wasm`;
        return readFileSync(path);
    }

    function witnessGenerator(tree_height: number, num_utxos: number): any {
        const path =  `/Users/tsv/Developer/light-protocol/circuit-lib/circuitlib-rs/test-data/merkle${tree_height}_${num_utxos}/merkle${tree_height}_${num_utxos}_js/witness_calculator.js`;
        const wtns = require(path);
        return wtns;
    }


    before(async () => {
        lightWasm = await WasmFactory.getInstance();
    });

    it("merkle proofgen", async () => {
        const hasher = await WasmFactory.getInstance();
        const merkleHeights = [22]; //[22, 30, 40, 128];
        const utxos = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = 0; i < merkleHeights.length; i++) {
            for (let j = 0; j < utxos.length; j++) {
                const completePathZkey = zk(merkleHeights[i], utxos[j]);
                const buffer = wasm(merkleHeights[i], utxos[j]);
                // const leaf = "1"; //hasher.poseidonHashString(["1"]);
                const leaf = hasher.poseidonHashString(["1"]);
                const merkleTree = new MerkleTree(merkleHeights[i], hasher, [leaf]);

                let inputs = {
                    root: new Array(utxos[j]).fill(merkleTree.root()),
                    inPathIndices: new Array(utxos[j]).fill(merkleTree.indexOf(leaf)),
                    inPathElements: new Array(utxos[j]).fill(merkleTree.path(merkleTree.indexOf(leaf)).pathElements),
                    leaf: new Array(utxos[j]).fill(leaf)
                }

                const inputs_json = JSON.stringify(inputs);
                writeFileSync(`../circuitlib-rs/test-data/merkle${merkleHeights[i]}_${utxos[j]}/inputs${merkleHeights[i]}_${utxos[j]}.json`, inputs_json);

                let generator = witnessGenerator(merkleHeights[i], utxos[j]);
                let witnessCalculator = await generator(buffer);

                console.time("witness generation");
                let wtns = await witnessCalculator.calculateWTNSBin(inputs, 0,);
                console.timeEnd("witness generation");


                console.time("proof generation");
                const {proof, publicSignals} = await snarkjs.groth16.prove(
                    completePathZkey,
                    wtns,
                );
                console.timeEnd("proof generation");

                // write publicSignals to json file
                const json = JSON.stringify(publicSignals);
                writeFileSync(`./build/public_inputs_merkle${merkleHeights[i]}_${utxos[j]}.json`, json);

                const vKey = await snarkjs.zKey.exportVerificationKey(
                    completePathZkey,
                );
                const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
                if (res === true) {
                    console.log("Verification OK");
                } else {
                    console.log("Invalid proof");
                    throw new Error("Invalid Proof");
                }
            }
        }
    });


    it.skip("proofgen (circom poseidon)", async () => {
        const completePathZkey = "./build/merkle22/circuit.zkey";
        const buffer = readFileSync("./build/merkle22/merkle22_js/merkle22.wasm");

        const poseidon = await circomlibjs.buildPoseidonOpt();
        const leaf = poseidon(["1"]);
        const merkleTree = new MerkleTreeCircomPoseidon(22, poseidon, [leaf]);
        // console.log("merkleTree.path(merkleTree.indexOf(leaf))", merkleTree.path(merkleTree.indexOf(leaf)));

        const inputs = {
            root: merkleTree.root(),
            inPathIndices: merkleTree.indexOf(leaf),
            inPathElements: merkleTree.path(merkleTree.indexOf(leaf)).pathElements,
            leaf: poseidon.F.toString(leaf)
        }

        console.log("merkle circom poseidon inputs = ", inputs);

        let generator = witnessGenerator(22, 1);
        let witnessCalculator = await generator(buffer);

        console.time("Proof generation");
        let wtns = await witnessCalculator.calculateWTNSBin(
            inputs,
            0,
        );

        const {proof, publicSignals} = await snarkjs.groth16.prove(
            completePathZkey,
            wtns,
        );
        console.timeEnd("Proof generation");
        console.log("publicSignals", publicSignals);
        console.log("proof", proof);

        const vKey = await snarkjs.zKey.exportVerificationKey(
            completePathZkey,
        );
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        if (res === true) {
            console.log("Verification OK");
        } else {
            console.log("Invalid proof");
            throw new Error("Invalid Proof");
        }
    });

})