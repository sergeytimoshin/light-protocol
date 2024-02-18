#!/bin/bash

RAPIDSNARK_PATH=$HOME/rapidsnark/bin
PATH="$PATH:$RAPIDSNARK_PATH"

LOG_FILE="execution_times.log"

#> $LOG_FILE

echo "Benchmarking started..." >> $LOG_FILE
# Iterate from 1 to 10
for ((i=1; i<=10; i++))
do
    echo "Running iteration $i"
    start_time=$(date +%s.%N)
    prover circuit.zkey witness.wtns merkle22_$i.json public_inputs_merkle22_$i.json
    end_time=$(date +%s.%N)
    execution_time=$(echo "$end_time - $start_time" | bc)
    echo "Iteration $i took $execution_time seconds" >> $LOG_FILE
done
