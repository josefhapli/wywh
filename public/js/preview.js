import { getDraft, renderDraftPreview, wireMobileActive } from "./app-state.js";

wireMobileActive();
renderDraftPreview(document, getDraft());
