export const BEFORE_DOCUMENT_SWITCH_EVENT =
  "zynalo:before-document-switch";
export const SAVE_ACTIVE_DOCUMENT_EVENT = "zynalo:save-active-document";
export const HISTORY_UNDO_EVENT = "zynalo:history-undo";
export const HISTORY_REDO_EVENT = "zynalo:history-redo";

export const emitBeforeDocumentSwitch = () => {
  window.dispatchEvent(new Event(BEFORE_DOCUMENT_SWITCH_EVENT));
};
