import { createContext, useContext, useEffect, ReactNode } from "react";
import { useWebRTC } from "../../hooks/useWebRTC";

type CallContextValue = ReturnType<typeof useWebRTC>;

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
    const webRTC = useWebRTC();

    useEffect(() => {
        const cleanup = webRTC.registerListeners();
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <CallContext.Provider value={webRTC}>{children}</CallContext.Provider>;
}

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error("useCall must be used within a CallProvider");
    return ctx;
}