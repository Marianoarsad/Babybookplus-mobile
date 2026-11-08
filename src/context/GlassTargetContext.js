import { createContext, useContext } from "react";
export const GlassTargetContext = createContext(null);
export const useGlassTarget = () => useContext(GlassTargetContext);
