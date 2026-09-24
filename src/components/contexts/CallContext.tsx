import { createContext, useEffect, ReactNode } from "react";
import { useWebRTC } from "../../hooks/useWebRTC";

export type CallContextValue = ReturnType<typeof useWebRTC>;

export const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
    const webRTC = useWebRTC();

    useEffect(() => {
        return webRTC.registerListeners();
    }, [webRTC.registerListeners]);

    return (
        <CallContext.Provider value={webRTC}>
            {children}
        </CallContext.Provider>
    );
}