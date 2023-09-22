import { useState, useEffect } from "react";
import { User } from "@lightprotocol/zk.js";

// TODO: consider by use in examples (payment, psps): additional handling in hook or exposing just the user
export const useUser = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize the User and set the user state
    // const user = new User();
    setUser(user);
  }, []);

  return user;
};
