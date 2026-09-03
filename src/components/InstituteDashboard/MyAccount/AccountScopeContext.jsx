import React, { createContext, useContext } from "react";
import { useAuth } from "../../../context/AuthContext";

const AccountScopeContext = createContext({
  instituteId: null,
  actor: null,
});

export const AccountScopeProvider = ({ instituteId, actor = null, children }) => (
  <AccountScopeContext.Provider value={{ instituteId, actor }}>
    {children}
  </AccountScopeContext.Provider>
);

export const useAccountScope = () => {
  const ctx = useContext(AccountScopeContext);
  const { user } = useAuth();
  return {
    instituteId: ctx.instituteId || user?.uid || null,
    actor: ctx.actor || null,
  };
};
