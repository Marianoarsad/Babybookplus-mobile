import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import store from "./recordStore.cjs";
import { api } from "./api";

export function useRecords(child, resource) {
    const snapshot = useCallback(() => store.getRows(child, resource), [child, resource]);
    return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
export function useConfirmedRecords(child, resource) {
    const snapshot = useCallback(() => store.getConfirmed(child, resource), [child, resource]);
    return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
export function useRecordCache(child, resource) {
    const snapshot = useCallback(() => store.getSnapshot(child, resource), [child, resource]);
    return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
export function useSessionEpoch() {
    return useSyncExternalStore(store.subscribe, store.getEpoch, store.getEpoch);
}

// Screen reads never block navigation; only the latest mounted refresh owns its UI state.
export function useScreenRefresh(scope, load) {
    const epoch = useSessionEpoch();
    const key = `${epoch}:${scope}`;
    const currentKey = useRef(key);
    currentKey.current = key;
    const request = useRef(0);
    const mounted = useRef(false);
    const [state, setState] = useState({ key, refreshing: true, failures: [] });
    const isActive = useCallback(() => mounted.current && currentKey.current === key && store.getEpoch() === epoch, [key, epoch]);
    const refresh = useCallback(async (automatic = false) => {
        const id = ++request.current;
        const isCurrent = () => isActive() && request.current === id;
        if (!isCurrent()) return;
        if (automatic !== true) store.invalidateReads(scope);
        setState({ key, refreshing: true, failures: [] });
        let failures;
        try { failures = await load(isCurrent); }
        catch (_) { failures = ["load"]; }
        if (isCurrent()) setState({ key, refreshing: false, failures: failures || [] });
    }, [key, isActive, load, scope]);
    useEffect(() => {
        mounted.current = true;
        refresh(true);
        return () => { mounted.current = false; request.current++; };
    }, [refresh]);
    useEffect(() => {
        let previous = AppState.currentState;
        const subscription = AppState.addEventListener("change", next => {
            if (next === "active" && previous != null && previous !== "active") refresh();
            previous = next;
        });
        return () => subscription.remove();
    }, [refresh]);
    return { refreshing: state.key !== key || state.refreshing, failures: state.key === key ? state.failures : [], refresh, isActive };
}
export function useRecordOperations() {
    return useSyncExternalStore(store.subscribe, store.getOperations, store.getOperations);
}
export function useRecordSave(visible, child, resource, id = null) {
    const attempt = useRef(null);
    useEffect(() => { if (visible) attempt.current = null; }, [visible, child, resource, id]);
    return (body) => api.saveRecord(child, resource, id, body, attempt);
}
