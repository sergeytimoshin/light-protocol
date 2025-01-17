import { assert } from "chai";
import { MINT, hashAndTruncateToCircuit } from "../../../zk.js/src/index";
import { getIndices3D } from "../src/index";
import { PublicKey } from "@solana/web3.js";

//TODO: separate 3 dim indices template from light circuits in circuit-lib.circom and add similar test
describe("Utxo Functional", () => {
  it("getIndices", async () => {
    let dimension2 = 2;
    let dimension3 = 3;
    let referenceAssetCircuitArray = [
      hashAndTruncateToCircuit(new PublicKey(0).toBytes()).toString(),
      hashAndTruncateToCircuit(MINT.toBytes()).toString(),
    ];
    let utxo1AssetsCircuit = [
      hashAndTruncateToCircuit(new PublicKey(0).toBytes()),
      hashAndTruncateToCircuit(MINT.toBytes()),
    ];
    let utxo2AssetsCircuit = [
      hashAndTruncateToCircuit(new PublicKey(0).toBytes()),
    ];
    let utxo3AssetsCircuit = [
      hashAndTruncateToCircuit(new PublicKey(1).toBytes()),
    ];

    const indices1 = getIndices3D(
      dimension2,
      dimension3,
      [utxo1AssetsCircuit],
      referenceAssetCircuitArray,
    );
    assert.equal(indices1[0][0][0], "1");
    assert.equal(indices1[0][0][1], "0");
    assert.equal(indices1[0][0][2], "0");
    assert.equal(indices1[0][1][0], "0");
    assert.equal(indices1[0][1][1], "1");
    assert.equal(indices1[0][1][2], "0");

    const indices2 = getIndices3D(
      dimension2,
      dimension3,
      [utxo1AssetsCircuit, utxo1AssetsCircuit],
      referenceAssetCircuitArray,
    );
    assert.equal(indices2[0][0][0], "1");
    assert.equal(indices2[0][0][1], "0");
    assert.equal(indices2[0][0][2], "0");
    assert.equal(indices2[0][1][0], "0");
    assert.equal(indices2[0][1][1], "1");
    assert.equal(indices2[0][1][2], "0");

    const indices3 = getIndices3D(
      dimension2,
      dimension3,
      [utxo2AssetsCircuit],
      referenceAssetCircuitArray,
    );
    assert.equal(indices3[0][0][0], "1");
    assert.equal(indices3[0][0][1], "0");
    assert.equal(indices3[0][0][2], "0");
    assert.equal(indices3[0][1][0], "0");
    assert.equal(indices3[0][1][1], "0");
    assert.equal(indices3[0][1][2], "0");

    // no overlap
    const indices4 = getIndices3D(
      dimension2,
      dimension3,
      [utxo3AssetsCircuit],
      referenceAssetCircuitArray,
    );
    assert.equal(indices4[0][0][0], "0");
    assert.equal(indices4[0][0][1], "0");
    assert.equal(indices4[0][0][2], "0");
    assert.equal(indices4[0][1][0], "0");
    assert.equal(indices4[0][1][1], "0");
    assert.equal(indices4[0][1][2], "0");

    const indices5 = getIndices3D(
      dimension2,
      dimension3,
      [utxo3AssetsCircuit, utxo1AssetsCircuit],
      referenceAssetCircuitArray,
    );
    assert.equal(indices5[0][0][0], "0");
    assert.equal(indices5[0][0][1], "0");
    assert.equal(indices5[0][0][2], "0");
    assert.equal(indices5[0][1][0], "0");
    assert.equal(indices5[0][1][1], "0");
    assert.equal(indices5[0][1][2], "0");

    assert.equal(indices5[1][0][0], "1");
    assert.equal(indices5[1][0][1], "0");
    assert.equal(indices5[1][0][2], "0");
    assert.equal(indices5[1][1][0], "0");
    assert.equal(indices5[1][1][1], "1");
    assert.equal(indices5[1][1][2], "0");
  });
});
