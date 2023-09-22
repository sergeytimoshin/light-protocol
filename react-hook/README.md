# React Hook for zk.js

This library provides a React Hook for using zk.js in a React application.

## Installation

`yarn add @lightprotocol/react-hook``

## Usage

`
import { useZk } from '@lightprotocol/react-hook';

function MyComponent() {

    options = {
        connection: new Connection(RPC_URL),
        wallet: useWallet()
    }

    // hook takes care of managing all user related state
    const {user, account, initUser } = useZk();

    // Use in your component

}
