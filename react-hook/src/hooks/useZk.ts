import { useState, useEffect } from "react";
import { User } from "@lightprotocol/zk.js";
import { useUser } from "./useUser";

export const useZk = () => {
  const [state, setState] = useState(null);
  const { user } = useUser();

  useEffect(() => {}, []);

  return state;
};
