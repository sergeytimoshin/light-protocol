#!/bin/bash

RAPIDSNARK_PATH=$HOME/rapidsnark/bin
PATH="$PATH:$RAPIDSNARK_PATH"

LOG_FILE="execution_times.log"

#> $LOG_FILE

echo "Benchmarking started..." >> $LOG_FILE

for ((i=1; i<=3; i++))
do
    echo "Running iteration $i"
    work_dir="test-data/merkle22_$i"
    start_time=$(date +%s.%N)
    prover "$work_dir/circuit.zkey" "$work_dir/22_$i.wtns" "$work_dir/proof_merkle22_$i.json" "$work_dir/public_inputs_merkle22_$i.json"
    end_time=$(date +%s.%N)
    execution_time=$(echo "$end_time - $start_time" | bc)
    echo "Iteration $i took $execution_time seconds" >> $LOG_FILE
done
