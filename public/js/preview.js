import { getDraft, renderDraftPreview, wireMobileActive } from "./app-state.js?v=20260730-stacked-preview";

wireMobileActive();
renderDraftPreview(document, getDraft());
