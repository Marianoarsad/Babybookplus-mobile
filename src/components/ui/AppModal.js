import React, { forwardRef, useContext, useLayoutEffect, useRef } from "react";
import { Modal } from "react-native";
import { BlockedContent, ModalLayerContext, useDatabaseLoading } from "../../context/DatabaseLoadingContext";
import { BlurTargetView } from "expo-blur";
import { GlassTargetContext } from "../../context/GlassTargetContext";
import DatabaseLoadingOverlay from "./DatabaseLoadingOverlay";

// Keep each native/web modal's own surface; do not present a competing modal.
export default forwardRef(function AppModal({ children, visible = true, onRequestClose, ...props }, ref) {
    const capture = useRef(null);
    const id = useRef(Symbol("modal")).current;
    const parent = useContext(ModalLayerContext);
    const { busy, topModal, register, focusTarget } = useDatabaseLoading();
    useLayoutEffect(() => visible ? register(id, parent) : undefined, [visible, id, parent, register]);
    return <Modal hardwareAccelerated={props.transparent === true} {...props} ref={ref} visible={visible} onRequestClose={(...args) => { if (!busy) onRequestClose?.(...args); }}>
        <ModalLayerContext.Provider value={id}>
            <GlassTargetContext.Provider value={capture}><BlurTargetView ref={capture} style={{ flex: 1 }}>
                <BlockedContent busy={busy}>{children}</BlockedContent>
                {busy && topModal === id ? <DatabaseLoadingOverlay previousFocus={focusTarget} /> : null}
            </BlurTargetView></GlassTargetContext.Provider>
        </ModalLayerContext.Provider>
    </Modal>;
});
