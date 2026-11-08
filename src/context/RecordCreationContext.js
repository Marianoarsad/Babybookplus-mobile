import { createContext, useContext, useEffect, useRef } from "react";

// Ephemeral Add-record origin; never persisted with a child's records.
const RecordCreationContext = createContext(null);
export default RecordCreationContext;

export function useRecordCreationBack({ visible, record, creationKey, onClose, onBack }) {
    const creation = useContext(RecordCreationContext);
    const fromAdd = !record && creationKey && creation?.origin.tab === creationKey;
    const previousVisible = useRef(false);
    useEffect(() => {
        if (previousVisible.current && !visible && fromAdd) creation.finish();
        previousVisible.current = visible;
    }, [visible, fromAdd, creation]);
    return onBack || (fromAdd ? () => { onClose(); creation.back(); } : null);
}
